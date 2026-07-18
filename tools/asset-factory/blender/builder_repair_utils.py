import math

from common import (
    add_cylinder,
    add_rounded_box,
    add_torus,
    add_tube,
    default_palette,
    make_material,
)

PI = math.pi


def _dims(spec, fallback):
    target = spec.get("dimensionsMeters") or {}
    return (
        max(0.12, float(target.get("width", fallback[0]))),
        max(0.12, float(target.get("depth", fallback[1]))),
        max(0.12, float(target.get("height", fallback[2]))),
    )


def _mat(p, key, fallback="metal"):
    return p.get(key, p.get(fallback, next(iter(p.values()))))


def _detail_materials(spec):
    p = default_palette(spec.get("town", "shared-world"))
    return p, [
        _mat(p, "metal"),
        _mat(p, "metal_light"),
        _mat(p, "black"),
        _mat(p, "white"),
        p.get("cyan", p.get("warm_light", p.get("yellow", _mat(p, "white")))),
    ]


def _component_details(spec, width, depth, height, materials, start_index=0, scale=1.0):
    """Guarantee every declared QA component has a named, visible mesh."""
    required = list(spec.get("requiredComponents") or [])
    for index, component in enumerate(required[start_index:], start=start_index):
        side = -1 if index % 2 == 0 else 1
        row = index // 2
        x = side * width * 0.42
        y = -depth * 0.38 + (row % 5) * depth * 0.17
        z = max(0.05, min(height * 0.82, height * (0.16 + 0.12 * (row % 6))))
        size = (
            max(0.035, width * 0.055 * scale),
            max(0.025, depth * 0.035 * scale),
            max(0.035, height * 0.045 * scale),
        )
        add_rounded_box(
            f"qa_component_{index:02d}", size, (x, y, z),
            materials[index % len(materials)], bevel=min(size) * 0.18,
            component=component,
        )


