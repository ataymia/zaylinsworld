import math

from common import (
    add_cone,
    add_cylinder,
    add_rounded_box,
    add_torus,
    add_tube,
    make_material,
)
from builder_repair_utils import PI, _detail_materials, _dims


def build_bubble_lift(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (4.2, 4.2, 8.0))
    radius = min(width, depth) * 0.39
    glass = make_material(
        "bubble_lift_pressure_glass",
        (0.32, 0.72, 0.78),
        roughness=0.12,
        alpha=0.34,
    )
    pearl = make_material("bubble_lift_pearl_alloy", (0.67, 0.72, 0.70), metallic=0.58, roughness=0.26)
    seal = make_material("bubble_lift_emergency_seal", (0.64, 0.08, 0.10), metallic=0.18, roughness=0.38)
    lumen = make_material(
        "bubble_lift_lumen",
        (0.08, 0.62, 0.72),
        roughness=0.22,
        emission=(0.05, 0.72, 0.82),
        emission_strength=2.2,
    )
    foundation_h = height * 0.055

    add_cylinder(
        "reef_safe_foundation",
        radius * 1.18,
        foundation_h,
        (0, 0, foundation_h / 2),
        p.get("concrete", mats[0]),
        vertices=40,
        component="reef-safe foundation ring",
        bevel=0.055,
    )
    add_torus(
        "foundation_ring",
        radius * 0.96,
        radius * 0.11,
        (0, 0, foundation_h * 0.95),
        pearl,
        component="reef-safe foundation ring",
        major_segments=40,
        minor_segments=10,
    )
    add_cylinder(
        "pressure_glass_shaft",
        radius,
        height * 0.82,
        (0, 0, height * 0.47),
        glass,
        vertices=48,
        component="pressure-glass lift shaft",
        bevel=0.025,
    )

    for index in range(7):
        z = height * (0.12 + index * 0.115)
        add_torus(
            "pressure_rib",
            radius * 1.015,
            radius * 0.055,
            (0, 0, z),
            pearl,
            component="structural pressure ribs",
            major_segments=40,
            minor_segments=8,
        )

    for side, y in (("front", -radius * 1.035), ("rear", radius * 1.035)):
        add_rounded_box(
            f"{side}_door_frame",
            (width * 0.48, depth * 0.08, height * 0.31),
            (0, y, height * 0.29),
            pearl,
            bevel=0.09,
            component="sliding dock doors",
        )
        for x in (-width * 0.115, width * 0.115):
            add_rounded_box(
                f"{side}_sliding_door",
                (width * 0.21, depth * 0.045, height * 0.27),
                (x, y + (-depth * 0.045 if side == "front" else depth * 0.045), height * 0.29),
                glass,
                bevel=0.055,
                component="sliding dock doors",
            )
        for x in (-width * 0.245, width * 0.245):
            add_rounded_box(
                f"{side}_seal_track",
                (width * 0.035, depth * 0.035, height * 0.30),
                (x, y + (-depth * 0.075 if side == "front" else depth * 0.075), height * 0.29),
                lumen,
                bevel=0.012,
                component="illuminated seal tracks",
            )

    add_cylinder(
        "current_drive_core",
        radius * 0.22,
        height * 0.72,
        (0, 0, height * 0.46),
        lumen,
        vertices=32,
        component="current-drive core",
        bevel=0.035,
    )
    add_torus(
        "bubble_intake_manifold",
        radius * 0.52,
        radius * 0.07,
        (0, 0, height * 0.15),
        mats[2],
        component="bubble intake manifold",
        major_segments=36,
        minor_segments=8,
    )
    for index in range(8):
        angle = math.tau * index / 8
        add_cylinder(
            "bubble_nozzle",
            radius * 0.035,
            height * 0.06,
            (math.cos(angle) * radius * 0.52, math.sin(angle) * radius * 0.52, height * 0.17),
            lumen,
            vertices=12,
            component="bubble intake manifold",
            bevel=0.004,
        )

    add_rounded_box(
        "control_pedestal",
        (width * 0.22, depth * 0.18, height * 0.18),
        (radius * 0.58, -radius * 0.60, height * 0.16),
        mats[0],
        bevel=0.055,
        component="control pedestal",
    )
    add_rounded_box(
        "control_face",
        (width * 0.16, depth * 0.035, height * 0.09),
        (radius * 0.58, -radius * 0.70, height * 0.19),
        lumen,
        bevel=0.025,
        component="control pedestal",
    )

    for side in (-1, 1):
        x = side * radius * 0.82
        add_tube(
            "service_conduit",
            [(x, radius * 0.73, height * 0.10), (x, radius * 0.88, height * 0.52), (x, radius * 0.86, height * 0.82)],
            radius * 0.035,
            mats[2],
            component="service conduits",
            resolution=2,
        )
    for z in (height * 0.11, height * 0.86):
        add_torus(
            "emergency_seal",
            radius * 1.04,
            radius * 0.045,
            (0, 0, z),
            seal,
            component="emergency pressure seals",
            major_segments=40,
            minor_segments=8,
        )

    add_cylinder(
        "roof_docking_plate",
        radius * 1.08,
        height * 0.08,
        (0, 0, height * 0.94),
        pearl,
        vertices=40,
        component="roof docking collar",
        bevel=0.045,
    )
    add_torus(
        "roof_docking_collar",
        radius * 0.86,
        radius * 0.12,
        (0, 0, height * 0.97),
        mats[2],
        component="roof docking collar",
        major_segments=40,
        minor_segments=10,
    )


def build_airlock_conduit(spec):
    _, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (3.2, 6.0, 3.2))
    radius = min(width, height) * 0.43
    center_z = height * 0.52
    glass = make_material("airlock_pressure_glass", (0.34, 0.70, 0.76), roughness=0.12, alpha=0.32)
    pearl = make_material("airlock_pearl_alloy", (0.66, 0.70, 0.68), metallic=0.62, roughness=0.25)
    gasket = make_material("airlock_gasket", (0.04, 0.06, 0.07), roughness=0.78)
    guide = make_material(
        "airlock_floor_guide",
        (0.04, 0.60, 0.72),
        roughness=0.24,
        emission=(0.04, 0.68, 0.80),
        emission_strength=1.8,
    )
    valve = make_material("airlock_valve_red", (0.62, 0.07, 0.08), metallic=0.28, roughness=0.36)
    span = depth * 0.82

    add_cylinder(
        "pressure_glass_conduit",
        radius,
        span,
        (0, 0, center_z),
        glass,
        vertices=48,
        rotation=(PI / 2, 0, 0),
        component="pressure-glass conduit",
        bevel=0.02,
    )
    for side, y, component in (
        ("start", -span * 0.51, "start docking collar"),
        ("end", span * 0.51, "end docking collar"),
    ):
        add_torus(
            f"{side}_docking_collar",
            radius * 1.03,
            radius * 0.13,
            (0, y, center_z),
            pearl,
            rotation=(PI / 2, 0, 0),
            component=component,
            major_segments=40,
            minor_segments=10,
        )
        add_torus(
            f"{side}_compression_flange",
            radius * 0.91,
            radius * 0.07,
            (0, y + (depth * 0.035 if side == "start" else -depth * 0.035), center_z),
            mats[1],
            rotation=(PI / 2, 0, 0),
            component="compression flanges",
            major_segments=36,
            minor_segments=8,
        )
        add_torus(
            f"{side}_gasket",
            radius * 0.82,
            radius * 0.035,
            (0, y + (depth * 0.065 if side == "start" else -depth * 0.065), center_z),
            gasket,
            rotation=(PI / 2, 0, 0),
            component="gasket seals",
            major_segments=36,
            minor_segments=6,
        )
        for index in range(8):
            angle = math.tau * index / 8
            add_cylinder(
                f"{side}_locking_dog",
                radius * 0.035,
                depth * 0.055,
                (math.cos(angle) * radius * 0.92, y, center_z + math.sin(angle) * radius * 0.92),
                mats[1],
                vertices=10,
                rotation=(PI / 2, 0, 0),
                component="compression flanges",
                bevel=0.003,
            )

    for index in range(5):
        y = -span * 0.39 + index * span * 0.195
        add_torus(
            "pressure_hoop",
            radius * 1.025,
            radius * 0.07,
            (0, y, center_z),
            pearl,
            rotation=(PI / 2, 0, 0),
            component="load-bearing pressure hoops",
            major_segments=36,
            minor_segments=8,
        )

    add_rounded_box(
        "service_spine",
        (width * 0.38, span * 0.93, height * 0.13),
        (0, 0, height * 0.12),
        mats[2],
        bevel=0.045,
        component="service spine",
    )
    add_rounded_box(
        "service_hatch",
        (width * 0.38, depth * 0.055, height * 0.28),
        (radius * 0.79, 0, center_z * 0.82),
        mats[0],
        bevel=0.045,
        rotation=(0, 0, PI / 2),
        component="service hatch",
    )
    add_cylinder(
        "pressure_gauge",
        width * 0.075,
        depth * 0.055,
        (radius * 0.84, -depth * 0.12, center_z * 0.92),
        guide,
        vertices=24,
        rotation=(0, PI / 2, 0),
        component="pressure gauge",
        bevel=0.006,
    )
    add_cylinder(
        "isolation_valve",
        width * 0.11,
        depth * 0.065,
        (radius * 0.85, depth * 0.14, center_z * 0.77),
        valve,
        vertices=10,
        rotation=(0, PI / 2, 0),
        component="emergency isolation valve",
        bevel=0.006,
    )
    add_torus(
        "valve_wheel",
        width * 0.12,
        width * 0.022,
        (radius * 0.90, depth * 0.14, center_z * 0.77),
        valve,
        rotation=(0, PI / 2, 0),
        component="emergency isolation valve",
        major_segments=20,
        minor_segments=6,
    )
    add_rounded_box(
        "illuminated_floor_guide",
        (width * 0.11, span * 0.88, height * 0.035),
        (0, 0, height * 0.26),
        guide,
        bevel=0.012,
        component="illuminated floor guide",
    )


def build_elevated_road_support(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (6.0, 2.6, 8.5))
    concrete = p.get("concrete", mats[0])
    hazard = make_material("road_support_hazard", (0.84, 0.54, 0.06), roughness=0.40)
    bearing = make_material("road_support_bearing", (0.07, 0.08, 0.09), roughness=0.86)
    inspection = make_material(
        "road_support_inspection_light",
        (0.04, 0.55, 0.68),
        roughness=0.25,
        emission=(0.04, 0.65, 0.78),
        emission_strength=1.5,
    )

    add_rounded_box(
        "crash_footing",
        (width * 0.58, depth * 0.92, height * 0.10),
        (0, 0, height * 0.05),
        concrete,
        bevel=0.10,
        component="reinforced crash footing",
    )
    add_cone(
        "tapered_pier",
        width * 0.20,
        width * 0.13,
        height * 0.76,
        (0, 0, height * 0.47),
        concrete,
        vertices=32,
        component="tapered support pier",
        bevel=0.025,
    )
    add_rounded_box(
        "cap_beam",
        (width, depth * 0.72, height * 0.085),
        (0, 0, height * 0.905),
        mats[0],
        bevel=0.08,
        component="transverse cap beam",
    )
    for x in (-width * 0.31, -width * 0.10, width * 0.10, width * 0.31):
        add_rounded_box(
            "bearing_pad",
            (width * 0.13, depth * 0.46, height * 0.022),
            (x, 0, height * 0.958),
            bearing,
            bevel=0.018,
            component="bearing pads",
        )
    for x in (-width * 0.46, width * 0.46):
        add_rounded_box(
            "lateral_restraint",
            (width * 0.06, depth * 0.56, height * 0.10),
            (x, 0, height * 0.94),
            mats[1],
            bevel=0.025,
            component="lateral restraint blocks",
        )
        add_tube(
            "knee_brace",
            [(x * 0.42, 0, height * 0.67), (x * 0.88, 0, height * 0.88)],
            depth * 0.055,
            mats[1],
            component="diagonal knee braces",
            resolution=2,
        )

    add_rounded_box(
        "inspection_door",
        (width * 0.16, depth * 0.035, height * 0.19),
        (0, -depth * 0.22, height * 0.29),
        mats[2],
        bevel=0.035,
        component="inspection door",
    )
    add_rounded_box(
        "inspection_light",
        (width * 0.045, depth * 0.025, height * 0.035),
        (width * 0.055, -depth * 0.24, height * 0.34),
        inspection,
        bevel=0.012,
        component="inspection door",
    )
    for side in (-1, 1):
        x = side * width * 0.145
        add_cylinder(
            "ladder_rail",
            depth * 0.025,
            height * 0.44,
            (x, depth * 0.22, height * 0.43),
            mats[1],
            vertices=12,
            component="maintenance ladder",
            bevel=0.003,
        )
    for index in range(9):
        z = height * (0.20 + index * 0.052)
        add_cylinder(
            "ladder_rung",
            depth * 0.022,
            width * 0.29,
            (0, depth * 0.22, z),
            mats[1],
            vertices=10,
            rotation=(0, PI / 2, 0),
            component="maintenance ladder",
            bevel=0.002,
        )
    add_tube(
        "drainage_outlet",
        [(width * 0.13, depth * 0.17, height * 0.70), (width * 0.18, depth * 0.25, height * 0.12)],
        depth * 0.035,
        mats[2],
        component="drainage outlet",
        resolution=2,
    )
    add_tube(
        "service_conduit",
        [(-width * 0.15, -depth * 0.18, height * 0.13), (-width * 0.17, -depth * 0.20, height * 0.68)],
        depth * 0.028,
        mats[1],
        component="service conduit",
        resolution=2,
    )
    for x in (-width * 0.24, width * 0.24):
        add_rounded_box(
            "collision_guard",
            (width * 0.075, depth * 0.14, height * 0.20),
            (x, -depth * 0.37, height * 0.10),
            mats[1],
            bevel=0.045,
            component="collision guards",
        )
    for z in (height * 0.12, height * 0.16):
        add_rounded_box(
            "hazard_band",
            (width * 0.42, depth * 0.035, height * 0.025),
            (0, -depth * 0.47, z),
            hazard,
            bevel=0.006,
            component="hazard bands",
        )


def build_accessibility_gate(spec):
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
            mats[0],
            bevel=0.045,
            component="anchored gate posts",
        )
        add_rounded_box(
            f"{side}_anchor",
            (width * 0.13, depth * 0.92, height * 0.06),
            (x, 0, height * 0.03),
            mats[1],
            bevel=0.025,
            component="anchored gate posts",
        )

    add_rounded_box(
        "gate_outer_frame",
        (width * 0.78, depth * 0.22, height * 0.78),
        (0, 0, height * 0.48),
        mats[0],
        bevel=0.045,
        component="accessible gate leaf",
    )
    for z in (height * 0.24, height * 0.48, height * 0.72):
        add_rounded_box(
            "gate_horizontal_rail",
            (width * 0.74, depth * 0.13, height * 0.055),
            (0, -depth * 0.02, z),
            mats[1],
            bevel=0.018,
            component="accessible gate leaf",
        )
    for x in (-width * 0.28, -width * 0.14, 0, width * 0.14, width * 0.28):
        add_rounded_box(
            "lower_infill",
            (width * 0.035, depth * 0.11, height * 0.34),
            (x, -depth * 0.02, height * 0.30),
            mats[1],
            bevel=0.014,
            component="accessible gate leaf",
        )

    add_cylinder(
        "hinge_barrel",
        width * 0.045,
        height * 0.72,
        (-width * 0.38, 0, height * 0.50),
        mats[1],
        vertices=20,
        component="hinge barrel",
        bevel=0.006,
    )
    add_cylinder(
        "lower_pivot",
        width * 0.065,
        height * 0.07,
        (-width * 0.38, 0, height * 0.08),
        mats[1],
        vertices=20,
        component="lower pivot",
        bevel=0.006,
    )
    add_tube(
        "closing_arm",
        [(-width * 0.40, depth * 0.10, height * 0.90), (-width * 0.22, depth * 0.12, height * 0.98), (0, depth * 0.10, height * 0.92)],
        width * 0.024,
        mats[1],
        component="closing arm",
        resolution=2,
    )
    add_rounded_box(
        "mechanical_latch",
        (width * 0.09, depth * 0.36, height * 0.13),
        (width * 0.36, 0, height * 0.58),
        mats[1],
        bevel=0.025,
        component="mechanical latch",
    )
    add_rounded_box(
        "electric_strike",
        (width * 0.07, depth * 0.42, height * 0.19),
        (width * 0.45, 0, height * 0.58),
        mats[2],
        bevel=0.025,
        component="electric strike",
    )
    add_rounded_box(
        "raised_lock_icon",
        (width * 0.11, depth * 0.06, height * 0.13),
        (width * 0.30, -depth * 0.24, height * 0.75),
        status,
        bevel=0.030,
        component="raised lock icon",
    )
    add_cylinder(
        "status_lamp",
        width * 0.028,
        depth * 0.08,
        (width * 0.42, -depth * 0.25, height * 0.84),
        status,
        vertices=20,
        rotation=(PI / 2, 0, 0),
        component="status lamp",
        bevel=0.004,
    )
    add_rounded_box(
        "closed_state_tab",
        (width * 0.24, depth * 0.06, height * 0.08),
        (0, -depth * 0.24, height * 0.82),
        status,
        bevel=0.018,
        component="closed state tab",
    )

    control_x = -width * 0.45
    add_rounded_box(
        "push_plate",
        (width * 0.13, depth * 0.06, height * 0.24),
        (control_x, -depth * 0.40, height * 0.55),
        tactile,
        bevel=0.035,
        component="wheelchair-height push plate",
    )
    add_rounded_box(
        "tactile_icon_panel",
        (width * 0.12, depth * 0.055, height * 0.10),
        (control_x, -depth * 0.41, height * 0.74),
        tactile,
        bevel=0.025,
        component="tactile icon panel",
    )
    add_rounded_box(
        "card_reader",
        (width * 0.09, depth * 0.06, height * 0.13),
        (control_x, -depth * 0.41, height * 0.90),
        mats[2],
        bevel=0.025,
        component="card reader",
    )
    add_rounded_box(
        "emergency_override",
        (width * 0.12, depth * 0.07, height * 0.12),
        (width * 0.45, -depth * 0.40, height * 0.30),
        status,
        bevel=0.025,
        component="emergency override",
    )
    add_rounded_box(
        "flush_threshold",
        (width * 0.88, depth * 0.82, height * 0.025),
        (0, 0, height * 0.0125),
        threshold,
        bevel=0.008,
        component="flush threshold",
    )
