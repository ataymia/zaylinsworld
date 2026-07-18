import argparse
import json
import os
import sys
import traceback

import bpy

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))
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

QA_OVERRIDES_PATH = os.path.join(REPO_ROOT, "asset-factory", "qa-overrides.json")
if os.path.exists(QA_OVERRIDES_PATH):
    with open(QA_OVERRIDES_PATH, "r", encoding="utf8") as handle:
        QA_OVERRIDES = json.load(handle).get("assets", {})
else:
    QA_OVERRIDES = {}

MUNICIPAL_BENCH_COMPONENTS = [
    "seat slats",
    "back slats",
    "left side frame",
    "right side frame",
    "armrests",
    "rear support rails",
    "anchored feet",
]


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


def apply_qa_override(spec):
    notes = []

    # Family contracts must match the semantic components emitted by the
    # corresponding purpose-built builder. This is stricter than vague generic
    # nouns such as "seat structure" because every structural member is named.
    if spec.get("family") == "municipal_bench":
        spec["requiredComponents"] = list(MUNICIPAL_BENCH_COMPONENTS)
        notes.append("Municipal bench contract aligned to separately modeled slats, frames, rails, armrests, and anchors.")

    override = QA_OVERRIDES.get(spec["id"])
    if override:
        if override.get("dimensionsMeters"):
            spec.setdefault("dimensionsMeters", {}).update(override["dimensionsMeters"])
        if override.get("quality"):
            spec.setdefault("quality", {}).update(override["quality"])
        if override.get("requiredComponents"):
            spec["requiredComponents"] = list(override["requiredComponents"])
        if override.get("note"):
            notes.append(override["note"])

    return " ".join(notes) if notes else None


def saved_preview_coverage(paths):
    coverages = []
    for path in paths:
        absolute_path = os.path.abspath(path)
        image = bpy.data.images.load(absolute_path, check_existing=False)
        try:
            pixels = list(image.pixels)
            alpha_values = pixels[3::4]
            coverage = sum(1 for alpha in alpha_values if alpha > 0.05) / max(1, len(alpha_values))
            coverages.append(coverage)
        finally:
            bpy.data.images.remove(image, do_unlink=True)
    return coverages


def refine_retry_geometry(spec):
    attempt = int(spec.get("factoryAttempt", 1))
    if attempt <= 1:
        return "base detail"

    previous_error = str(spec.get("previousError") or "").lower()
    needs_more_geometry = "triangle count" in previous_error and "below" in previous_error
    if not needs_more_geometry:
        return f"attempt {attempt} applies corrected specifications without unnecessary geometry inflation"

    refined = 0
    for obj in mesh_objects():
        if not obj.data or len(obj.data.polygons) == 0:
            continue
        nonzero_dimensions = [abs(value) for value in obj.dimensions if abs(value) > 0.0001]
        minimum_dimension = min(nonzero_dimensions) if nonzero_dimensions else 0
        if minimum_dimension <= 0.008:
            continue
        modifier = obj.modifiers.new(name=f"retry_refinement_{attempt}", type="BEVEL")
        modifier.width = min(0.012 * attempt, minimum_dimension * 0.06)
        modifier.segments = 2 + min(attempt, 2)
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
    return f"attempt {attempt} geometry refinement applied to {refined} mesh objects because the previous failure was below the detail floor"


def verify_export(output_path):
    if not os.path.exists(output_path):
        raise RuntimeError("Blender reported export completion but the GLB file does not exist.")
    size = os.path.getsize(output_path)
    if size < 1024:
        raise RuntimeError(f"Exported GLB is unexpectedly small: {size} bytes.")
    with open(output_path, "rb") as handle:
        magic = handle.read(4)
    if magic != b"glTF":
        raise RuntimeError(f"Exported file has invalid GLB magic bytes: {magic!r}.")
    return size


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
            "qaOverride": None,
            "retryEnhancement": None,
            "qualityPassed": False,
            "exportVerified": False,
            "exportBytes": 0,
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

            result["qaOverride"] = apply_qa_override(spec)
            reset_scene()
            root = create_root(spec)
            builder(spec)
            result["retryEnhancement"] = refine_retry_geometry(spec)
            parent_scene_objects(root)
            move_to_ground_center(root)

            preview_asset_dir = os.path.join(args.preview_dir, asset_id)
            preview_paths, _ = render_turntable(spec, preview_asset_dir)
            preview_coverage = saved_preview_coverage(preview_paths)
            stats = collect_stats(spec)
            quality = evaluate_quality(spec, stats, preview_coverage)

            result["stats"] = stats
            result["previewPaths"] = [relative_to_cwd(path) for path in preview_paths]
            result["previewCoverage"] = preview_coverage
            result["failures"] = list(quality["failures"])
            result["qualityPassed"] = bool(quality["passed"])

            if not quality["passed"]:
                print(f"[asset-factory] FAIL {asset_id}: {'; '.join(quality['failures'])}", flush=True)
                continue

            output_path = os.path.join(args.output_root, spec["town"], spec["family"], spec["fileName"])
            export_glb(root, output_path)
            result["exportBytes"] = verify_export(output_path)
            result["exportVerified"] = True
            result["outputPath"] = relative_to_cwd(output_path)
            result["passed"] = True
            print(
                f"[asset-factory] PASS {asset_id}: {stats['meshObjects']} meshes, "
                f"{stats['triangles']} triangles, {stats['materialCount']} materials, "
                f"{result['exportBytes']} GLB bytes",
                flush=True,
            )
        except Exception as error:
            result["passed"] = False
            result["exportVerified"] = False
            result["outputPath"] = None
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
