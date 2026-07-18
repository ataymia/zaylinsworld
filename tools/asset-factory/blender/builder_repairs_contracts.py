import math

from common import add_cylinder, add_rounded_box, add_torus, make_material
from builder_repair_utils import PI, _component_details, _detail_materials, _dims


def build_plated_food_fixed(spec):
    """Fill the audited serving height instead of producing a flattened plate."""
    _, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (0.6, 0.6, 0.35))
    ceramic = make_material("food_ceramic", (0.82, 0.78, 0.68), roughness=0.34)
    food_a = make_material("food_primary", (0.55, 0.16, 0.06), roughness=0.62)
    food_b = make_material("food_secondary", (0.18, 0.48, 0.12), roughness=0.72)
    sauce = make_material("food_sauce", (0.86, 0.48, 0.06), roughness=0.28)
    garnish = make_material("food_garnish", (0.28, 0.62, 0.20), roughness=0.66)

    add_cylinder(
        "serving_base", width * 0.46, height * 0.12,
        (0, 0, height * 0.06), ceramic, vertices=28,
        component="recognizable primary structure", bevel=0.012,
    )
    add_cylinder(
        "main_portion", width * 0.34, height * 0.48,
        (0, 0, height * 0.37), food_a, vertices=24,
        component="functional secondary components", bevel=0.035,
    )
    add_torus(
        "portion_rim", width * 0.31, width * 0.035,
        (0, 0, height * 0.62), sauce,
        component="functional secondary components",
        major_segments=28, minor_segments=8,
    )
    for index in range(7):
        angle = math.tau * index / 7
        radius = width * (0.18 if index % 2 else 0.25)
        ingredient_height = height * (0.18 if index % 2 else 0.24)
        z = height * (0.62 if index % 2 else 0.70)
        add_cylinder(
            "ingredient", width * (0.055 if index % 2 else 0.068),
            ingredient_height,
            (math.cos(angle) * radius, math.sin(angle) * depth * 0.25, z),
            food_b if index % 2 else garnish,
            vertices=14, component="appropriate materials", bevel=0.014,
        )
    add_rounded_box(
        "sauce_finish", (width * 0.42, depth * 0.16, height * 0.055),
        (0, -depth * 0.04, height * 0.86), sauce,
        bevel=0.025, component="appropriate materials",
    )
    add_rounded_box(
        "utensil", (width * 0.62, depth * 0.045, height * 0.035),
        (0, depth * 0.42, height * 0.09), mats[1],
        bevel=0.009, component="functional secondary components",
    )
    _component_details(spec, width, depth, height, [ceramic, food_a, food_b, sauce, garnish], scale=0.48)


def build_classroom_desk_fixed(spec):
    """Classroom desk with an explicit structural underframe contract."""
    _, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (0.72, 0.52, 0.76))
    top_z = height * 0.91

    add_rounded_box(
        "work_surface", (width * 0.96, depth * 0.94, height * 0.08),
        (0, 0, top_z), mats[4], bevel=0.035,
        component="work surface",
    )
    for x in (-width * 0.40, width * 0.40):
        for y in (-depth * 0.36, depth * 0.36):
            add_rounded_box(
                "leg", (width * 0.055, depth * 0.065, height * 0.78),
                (x, y, height * 0.43), mats[0], bevel=0.012,
                component="legs",
            )
            add_rounded_box(
                "floor_glide", (width * 0.10, depth * 0.12, height * 0.035),
                (x, y, height * 0.018), mats[2], bevel=0.012,
                component="feet",
            )
    # The prior builder had legs but no named/load-bearing frame.
    add_rounded_box(
        "front_frame_rail", (width * 0.82, depth * 0.055, height * 0.075),
        (0, -depth * 0.36, height * 0.73), mats[0], bevel=0.014,
        component="frame",
    )
    add_rounded_box(
        "rear_frame_rail", (width * 0.82, depth * 0.055, height * 0.075),
        (0, depth * 0.36, height * 0.73), mats[0], bevel=0.014,
        component="frame",
    )
    for x in (-width * 0.40, width * 0.40):
        add_rounded_box(
            "side_frame_rail", (width * 0.055, depth * 0.68, height * 0.07),
            (x, 0, height * 0.73), mats[1], bevel=0.014,
            component="frame",
        )
    add_rounded_box(
        "modesty_panel", (width * 0.82, depth * 0.045, height * 0.30),
        (0, depth * 0.37, height * 0.52), mats[1], bevel=0.025,
        component="storage shelf or modesty panel",
    )
    add_rounded_box(
        "under_shelf", (width * 0.76, depth * 0.56, height * 0.045),
        (0, depth * 0.02, height * 0.55), mats[3], bevel=0.018,
        component="storage shelf or modesty panel",
    )
    for x in (-width * 0.32, width * 0.32):
        add_cylinder(
            "fastener", width * 0.014, depth * 0.12,
            (x, -depth * 0.47, top_z), mats[2], vertices=10,
            rotation=(PI / 2, 0, 0), component="fasteners", bevel=0.002,
        )


def build_charging_pad_fixed_r7(spec):
    """Charging pad with a distinct fifth service/safety material."""
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (2.8, 5.2, 0.35))
    warning = make_material("charging_pad_warning", (0.92, 0.56, 0.05), roughness=0.38)

    add_rounded_box(
        "ground_pad", (width * 0.96, depth * 0.96, height * 0.34),
        (0, 0, height * 0.17), p.get("concrete", mats[0]),
        bevel=min(width, depth) * 0.025, component="ground pad",
    )
    for side in (-1, 1):
        add_rounded_box(
            "protective_edging", (width * 0.07, depth * 0.94, height * 0.38),
            (side * width * 0.47, 0, height * 0.19), mats[0],
            bevel=0.025, component="protective edging",
        )
        add_rounded_box(
            "alignment_marking", (width * 0.055, depth * 0.72, height * 0.035),
            (side * width * 0.31, 0, height * 0.36), mats[4],
            bevel=0.009, component="alignment markings",
        )
    for y in (-depth * 0.27, 0, depth * 0.27):
        add_cylinder(
            "induction_array", width * 0.11, height * 0.08,
            (0, y, height * 0.37), mats[4], vertices=18,
            component="connector or induction array", bevel=0.006,
        )
    add_rounded_box(
        "power_module", (width * 0.20, depth * 0.13, height * 0.58),
        (width * 0.36, depth * 0.35, height * 0.29), mats[1],
        bevel=0.035, component="power module",
    )
    add_rounded_box(
        "status_lights", (width * 0.13, depth * 0.025, height * 0.13),
        (width * 0.36, depth * 0.285, height * 0.36), mats[3],
        bevel=0.018, component="status lights",
    )
    add_rounded_box(
        "warning_panel", (width * 0.18, depth * 0.035, height * 0.10),
        (-width * 0.34, depth * 0.31, height * 0.37), warning,
        bevel=0.018, component="safety and warning markings",
    )
    add_cylinder(
        "emergency_stop", width * 0.035, depth * 0.05,
        (-width * 0.34, depth * 0.34, height * 0.44), warning,
        vertices=20, rotation=(PI / 2, 0, 0),
        component="safety and warning markings", bevel=0.004,
    )
