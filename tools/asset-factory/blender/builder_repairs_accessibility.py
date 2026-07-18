from common import add_cylinder, add_rounded_box, add_tube, make_material
from builder_repair_utils import PI, _detail_materials, _dims


def build_accessibility_gate_open(spec):
    """Accessible locked gate with an open, clearly gated silhouette."""
    _, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (2.4, 0.48, 1.35))
    status = make_material(
        "access_gate_amber_status",
        (0.90, 0.52, 0.05),
        roughness=0.30,
        emission=(0.90, 0.42, 0.03),
        emission_strength=1.6,
    )
    tactile = make_material("access_gate_tactile", (0.82, 0.84, 0.76), roughness=0.52)
    threshold = make_material("access_gate_threshold", (0.10, 0.11, 0.12), metallic=0.30, roughness=0.66)
    post_x = width * 0.45

    for side, x in (("left", -post_x), ("right", post_x)):
        add_rounded_box(
            f"{side}_gate_post",
            (width * 0.075, depth * 0.72, height),
            (x, 0, height * 0.50),
            mats[0], bevel=0.045,
            component="anchored gate posts",
        )
        add_rounded_box(
            f"{side}_anchor",
            (width * 0.13, depth * 0.92, height * 0.06),
            (x, 0, height * 0.03),
            mats[1], bevel=0.025,
            component="anchored gate posts",
        )

    # Open perimeter frame. The previous version used one solid panel as the
    # frame, which passed metrics but read visually as a cabinet door.
    leaf_width = width * 0.78
    leaf_left = -leaf_width * 0.50
    leaf_right = leaf_width * 0.50
    for z, label in ((height * 0.18, "bottom"), (height * 0.82, "top")):
        add_rounded_box(
            f"gate_{label}_rail",
            (leaf_width, depth * 0.22, height * 0.065),
            (0, 0, z),
            mats[0], bevel=0.022,
            component="accessible gate leaf",
        )
    for x, label in ((leaf_left, "hinge"), (leaf_right, "latch")):
        add_rounded_box(
            f"gate_{label}_stile",
            (width * 0.055, depth * 0.22, height * 0.69),
            (x, 0, height * 0.50),
            mats[0], bevel=0.020,
            component="accessible gate leaf",
        )
    for z in (height * 0.38, height * 0.60):
        add_rounded_box(
            "gate_horizontal_rail",
            (leaf_width * 0.96, depth * 0.13, height * 0.045),
            (0, -depth * 0.02, z),
            mats[1], bevel=0.016,
            component="accessible gate leaf",
        )
    for x in (-width * 0.28, -width * 0.14, 0, width * 0.14, width * 0.28):
        add_rounded_box(
            "lower_infill",
            (width * 0.030, depth * 0.11, height * 0.24),
            (x, -depth * 0.02, height * 0.29),
            mats[1], bevel=0.012,
            component="accessible gate leaf",
        )

    add_cylinder(
        "hinge_barrel", width * 0.045, height * 0.72,
        (-width * 0.38, 0, height * 0.50), mats[1],
        vertices=20, component="hinge barrel", bevel=0.006,
    )
    add_cylinder(
        "lower_pivot", width * 0.065, height * 0.07,
        (-width * 0.38, 0, height * 0.08), mats[1],
        vertices=20, component="lower pivot", bevel=0.006,
    )
    add_tube(
        "closing_arm",
        [(-width * 0.40, depth * 0.10, height * 0.90),
         (-width * 0.22, depth * 0.12, height * 0.98),
         (0, depth * 0.10, height * 0.92)],
        width * 0.024, mats[1],
        component="closing arm", resolution=2,
    )
    add_rounded_box(
        "mechanical_latch",
        (width * 0.09, depth * 0.36, height * 0.13),
        (width * 0.36, 0, height * 0.58),
        mats[1], bevel=0.025,
        component="mechanical latch",
    )
    add_rounded_box(
        "electric_strike",
        (width * 0.07, depth * 0.42, height * 0.19),
        (width * 0.45, 0, height * 0.58),
        mats[2], bevel=0.025,
        component="electric strike",
    )
    add_rounded_box(
        "raised_lock_icon",
        (width * 0.11, depth * 0.06, height * 0.13),
        (width * 0.30, -depth * 0.24, height * 0.75),
        status, bevel=0.030,
        component="raised lock icon",
    )
    add_cylinder(
        "status_lamp", width * 0.028, depth * 0.08,
        (width * 0.42, -depth * 0.25, height * 0.84),
        status, vertices=20, rotation=(PI / 2, 0, 0),
        component="status lamp", bevel=0.004,
    )
    add_rounded_box(
        "closed_state_tab",
        (width * 0.24, depth * 0.06, height * 0.08),
        (0, -depth * 0.24, height * 0.70),
        status, bevel=0.018,
        component="closed state tab",
    )

    control_x = -width * 0.45
    add_rounded_box(
        "push_plate",
        (width * 0.13, depth * 0.06, height * 0.24),
        (control_x, -depth * 0.40, height * 0.55),
        tactile, bevel=0.035,
        component="wheelchair-height push plate",
    )
    add_rounded_box(
        "tactile_icon_panel",
        (width * 0.12, depth * 0.055, height * 0.10),
        (control_x, -depth * 0.41, height * 0.74),
        tactile, bevel=0.025,
        component="tactile icon panel",
    )
    add_rounded_box(
        "card_reader",
        (width * 0.09, depth * 0.06, height * 0.13),
        (control_x, -depth * 0.41, height * 0.90),
        mats[2], bevel=0.025,
        component="card reader",
    )
    add_rounded_box(
        "emergency_override",
        (width * 0.12, depth * 0.07, height * 0.12),
        (width * 0.45, -depth * 0.40, height * 0.30),
        status, bevel=0.025,
        component="emergency override",
    )
    add_rounded_box(
        "flush_threshold",
        (width * 0.88, depth * 0.82, height * 0.025),
        (0, 0, height * 0.0125),
        threshold, bevel=0.008,
        component="flush threshold",
    )
