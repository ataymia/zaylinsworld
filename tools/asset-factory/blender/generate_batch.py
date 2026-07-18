import argparse
import json
import os
import sys
import traceback

import bpy

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import common as common_module
from builders import BUILDERS
from common import (
    apply_modifier,
    collect_stats,
    create_root,
    evaluate_quality,
    export_glb,
    mesh_objects,
    move_to_ground_center,
    parent_scene_objects,
    render_turntable,
    reset_scene,
)


def configure_render_compatible():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.image_settings.color_depth = "8"

    look_property = scene.view_settings.bl_rna.properties.get("look")
    available_looks = {item.identifier for item in look_property.enum_items} if look_property else set()
    for candidate in ("AgX - Medium High Contrast", "Medium High Contrast", "AgX - Base Contrast", "None"):
        if candidate in available_looks:
            scene.view_settings.look = candidate
            break

    world = scene.world or bpy.data.worlds.new("AssetPreviewWorld")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (0.035, 0.045, 0.065, 1.0)
        background.inputs["Strength"].default_value = 0.35


# render_turntable resolves configure_render from the common module at call time.
common_module.configure_render = configure_render_compatible


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    parser = argparse.ArgumentParser(description="Generate one ZTA asset-factory batch in Blender.")
    parser.add_argument("--batch", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--preview-dir", required=True)
    parser.add_argument("--output-root", required=True)
    return parser.parse_args(argv)


def relative_to_cwd(path):
    return os.path.relpath(path, os.getcwd()).replace("\\", "/")


def refine_retry_geometry(spec):
    attempt = int(spec.get("factoryAttempt", 1))
    if attempt <= 1:
        return "base detail"

    refined = 0
    for obj in mesh_objects():
        if not obj.data or len(obj.data.polygons) == 0:
            continue
        minimum_dimension = min(abs(value) for value in obj.dimensions if abs(value) > 0.0001) if any(abs(value) > 0.0001 for value in obj.dimensions) else 0
        if minimum_dimension <= 0.008:
            continue
        modifier = obj.modifiers.new(name=f"retry_refinement_{attempt}", type="BEVEL")
        modifier.width = min(0.018 * attempt, minimum_dimension * 0.08)
        modifier.segments = 2 + attempt
        modifier.limit_method = "ANGLE"
        apply_modifier(obj, modifier.name)
        refined += 1

    if attempt >= 3 and spec.get("family") in {"hover_vehicle", "municipal_bench", "municipal_trash_can"}:
        for obj in mesh_objects():
            if any(token in obj.name for token in ("chassis", "cabin", "hood", "cushion", "backrest", "rain_hood")):
                modifier = obj.modifiers.new(name="retry_surface_subdivision", type="SUBSURF")
                modifier.levels = 1
                modifier.render_levels = 1
                apply_modifier(obj, modifier.name)
                refined += 1

    bpy.context.view_layer.update()
    return f"attempt {attempt} hard-surface refinement applied to {refined} mesh objects"


def main():
    args = parse_args()
    with open(args.batch, "r", encoding="utf8") as handle:
        batch = json.load(handle)

    os.makedirs(os.path.dirname(args.report), exist_ok=True)
    os.makedirs(args.preview_dir, exist_ok=True)
    os.makedirs(args.output_root, exist_ok=True)

    results = []
    for spec in batch.get("assets", []):
        asset_id = spec["id"]
        print(f"[asset-factory] building {asset_id} with {spec.get('builder')}", flush=True)
        result = {
            "id": asset_id,
            "fileName": spec["fileName"],
            "town": spec["town"],
            "family": spec["family"],
            "builder": spec.get("builder"),
            "attempt": spec.get("factoryAttempt", 1),
            "retryEnhancement": None,
            "passed": False,
            "failures": [],
            "exception": None,
            "stats": None,
            "previewPaths": [],
            "previewCoverage": [],
            "outputPath": None,
        }

        try:
            builder_name = spec.get("builder")
            builder = BUILDERS.get(builder_name)
            if not builder:
                result["failures"].append(f"No purpose-built Blender family builder exists for {builder_name or spec['family']}.")
                results.append(result)
                continue

            reset_scene()
            root = create_root(spec)
            builder(spec)
            result["retryEnhancement"] = refine_retry_geometry(spec)
            parent_scene_objects(root)
            move_to_ground_center(root)

            preview_asset_dir = os.path.join(args.preview_dir, asset_id)
            preview_paths, preview_coverage = render_turntable(spec, preview_asset_dir)
            stats = collect_stats(spec)
            quality = evaluate_quality(spec, stats, preview_coverage)

            result["stats"] = stats
            result["previewPaths"] = [relative_to_cwd(path) for path in preview_paths]
            result["previewCoverage"] = preview_coverage
            result["failures"] = quality["failures"]
            result["passed"] = quality["passed"]

            if quality["passed"]:
                output_path = os.path.join(args.output_root, spec["town"], spec["family"], spec["fileName"])
                export_glb(root, output_path)
                result["outputPath"] = relative_to_cwd(output_path)
                print(
                    f"[asset-factory] PASS {asset_id}: {stats['meshObjects']} meshes, "
                    f"{stats['triangles']} triangles, {stats['materialCount']} materials",
                    flush=True,
                )
            else:
                print(f"[asset-factory] FAIL {asset_id}: {'; '.join(quality['failures'])}", flush=True)
        except Exception as error:
            result["exception"] = f"{type(error).__name__}: {error}"
            result["failures"].append(result["exception"])
            result["traceback"] = traceback.format_exc()
            print(f"[asset-factory] ERROR {asset_id}: {result['exception']}", flush=True)
        finally:
            results.append(result) if result not in results else None

    report = {
        "version": 1,
        "batchId": batch.get("batchId"),
        "generatedAt": batch.get("startedAt"),
        "resultCount": len(results),
        "passed": sum(1 for item in results if item["passed"]),
        "failed": sum(1 for item in results if not item["passed"]),
        "results": results,
    }
    with open(args.report, "w", encoding="utf8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")

    print(
        f"[asset-factory] batch complete: {report['passed']} passed, {report['failed']} failed; "
        f"report={args.report}",
        flush=True,
    )


if __name__ == "__main__":
    main()
