import argparse
import json
import os
import sys
import traceback

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from builders import BUILDERS
from common import (
    collect_stats,
    create_root,
    evaluate_quality,
    export_glb,
    move_to_ground_center,
    parent_scene_objects,
    render_turntable,
    reset_scene,
)


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
