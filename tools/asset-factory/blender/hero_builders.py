import math

import bpy

from common import (
    add_cylinder,
    add_rounded_box,
    add_torus,
    add_tube,
    add_uv_sphere,
    apply_modifier,
    make_material,
    set_material,
    tag_component,
)

PI = math.pi


def _superellipse(value, exponent=0.62):
    if abs(value) < 1e-8:
        return 0.0
    return math.copysign(abs(value) ** exponent, value)


def add_lofted_shell(name, sections, material, component, ring_points=28, exponent=0.62, subdivision=1):
    """Create a closed smooth shell by lofting superellipse cross-sections along Y."""
    vertices = []
    faces = []

    for y, half_width, center_z, half_height in sections:
        for index in range(ring_points):
            angle = math.tau * index / ring_points
            x = half_width * _superellipse(math.cos(angle), exponent)
            z = center_z + half_height * _superellipse(math.sin(angle), exponent)
            vertices.append((x, y, z))

    ring_count = len(sections)
    for ring in range(ring_count - 1):
        start = ring * ring_points
        next_start = (ring + 1) * ring_points
        for index in range(ring_points):
            nxt = (index + 1) % ring_points
            faces.append((start + index, start + nxt, next_start + nxt, next_start + index))

    faces.append(tuple(reversed(range(ring_points))))
    last_start = (ring_count - 1) * ring_points
    faces.append(tuple(last_start + index for index in range(ring_points)))

    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    set_material(obj, material)
    tag_component(obj, component)

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    obj.select_set(False)

    if subdivision > 0:
        modifier = obj.modifiers.new(name="surface_refinement", type="SUBSURF")
        modifier.subdivision_type = "CATMULL_CLARK"
        modifier.levels = subdivision
        modifier.render_levels = subdivision
        apply_modifier(obj, modifier.name)

    bevel = obj.modifiers.new(name="edge_control", type="BEVEL")
    bevel.width = 0.018
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    apply_modifier(obj, bevel.name)
    return obj


def _hover_nacelle(x, y, p, front):
    component = "front hover pods" if front else "rear hover pods"
    mount_y = y * 0.78
    add_tube(
        f"{component}_mount_arm",
        [(x * 0.72, mount_y, 0.46), (x * 0.88, y * 0.94, 0.38), (x, y, 0.31)],
        0.065,
        p["secondary"],
        component=component,
    )
    add_uv_sphere(
        f"{component}_aero_nacelle",
        0.48,
        (x, y, 0.30),
        p["body"],
        scale=(0.72, 1.18, 0.38),
        component=component,
        segments=40,
        rings=20,
    )
    add_uv_sphere(
        f"{component}_lower_shroud",
        0.38,
        (x, y, 0.20),
        p["secondary"],
        scale=(0.80, 1.18, 0.28),
        component=component,
        segments=36,
        rings=18,
    )
    add_torus(
        f"{component}_lift_ring",
        0.29,
        0.045,
        (x, y, 0.075),
        p["cyan"],
        component="underbody lift rings",
        major_segments=48,
        minor_segments=14,
    )
    add_cylinder(
        f"{component}_emitter_core",
        0.21,
        0.065,
        (x, y, 0.075),
        p["emitter_core"],
        vertices=40,
        component="underbody lift rings",
        bevel=0.008,
    )
    for index in range(4):
        angle = math.tau * index / 4
        add_rounded_box(
            f"{component}_service_fastener",
            (0.04, 0.055, 0.04),
            (x + math.cos(angle) * 0.29, y + math.sin(angle) * 0.37, 0.32),
            p["hardware"],
            bevel=0.009,
            component="service panels",
        )


def _seat(x, y, p, component):
    add_rounded_box(
        "seat_cushion",
        (0.52, 0.58, 0.14),
        (x, y, 0.74),
        p["interior"],
        bevel=0.10,
        component=component,
    )
    add_rounded_box(
        "seat_back",
        (0.50, 0.17, 0.62),
        (x, y + 0.20, 1.03),
        p["interior"],
        bevel=0.12,
        rotation=(math.radians(-8), 0, 0),
        component=component,
    )
    add_rounded_box(
        "seat_headrest",
        (0.30, 0.13, 0.20),
        (x, y + 0.25, 1.39),
        p["interior"],
        bevel=0.08,
        component=component,
    )


def build_hover_vehicle_realistic(spec):
    coupe = "coupe" in str(spec.get("variant") or "").lower() or "coupe" in spec["id"].lower()
    length = 4.35 if coupe else 4.65
    width = 2.12 if coupe else 2.05
    cabin_component = "two-seat cabin" if coupe else "passenger cabin"
    door_component = "two doors" if coupe else "four doors"

    p = {
        "body": make_material("hover_graphite_body", (0.055, 0.085, 0.125), metallic=0.82, roughness=0.24),
        "body_highlight": make_material("hover_blue_graphite", (0.09, 0.15, 0.22), metallic=0.72, roughness=0.23),
        "secondary": make_material("hover_brushed_structure", (0.17, 0.22, 0.28), metallic=0.92, roughness=0.22),
        "hardware": make_material("hover_hardware", (0.36, 0.42, 0.48), metallic=0.95, roughness=0.18),
        "glass": make_material("hover_smoked_glass", (0.025, 0.18, 0.28), metallic=0.05, roughness=0.08, alpha=0.42),
        "interior": make_material("hover_cabin_interior", (0.035, 0.045, 0.06), metallic=0.08, roughness=0.52),
        "black": make_material("hover_black_composite", (0.008, 0.012, 0.019), metallic=0.28, roughness=0.30),
        "emitter_core": make_material("hover_emitter_core", (0.01, 0.03, 0.045), metallic=0.70, roughness=0.20),
        "cyan": make_material("hover_cyan_emission", (0.0, 0.24, 0.32), metallic=0.12, roughness=0.18, emission=(0.0, 0.82, 1.0), emission_strength=5.0),
        "magenta": make_material("hover_magenta_status", (0.28, 0.0, 0.18), metallic=0.12, roughness=0.18, emission=(1.0, 0.0, 0.62), emission_strength=4.0),
        "headlight": make_material("hover_headlight", (0.55, 0.66, 0.72), roughness=0.08, emission=(0.92, 0.98, 1.0), emission_strength=5.0),
        "taillight": make_material("hover_taillight", (0.32, 0.0, 0.02), roughness=0.10, emission=(1.0, 0.0, 0.035), emission_strength=5.0),
    }

    half_length = length / 2
    body_sections = [
        (-half_length, width * 0.26, 0.56, 0.13),
        (-half_length * 0.88, width * 0.42, 0.57, 0.22),
        (-half_length * 0.50, width * 0.49, 0.61, 0.30),
        (0.0, width * 0.51, 0.62, 0.34),
        (half_length * 0.52, width * 0.49, 0.61, 0.31),
        (half_length * 0.86, width * 0.43, 0.58, 0.23),
        (half_length, width * 0.31, 0.58, 0.15),
    ]
    add_lofted_shell(
        "load_bearing_chassis",
        body_sections,
        p["body"],
        "lower chassis",
        ring_points=32,
        exponent=0.56,
        subdivision=1,
    )

    # Distinct structural modules retain believable impact and service volumes.
    add_lofted_shell(
        "front_crash_module",
        [
            (-half_length - 0.05, width * 0.22, 0.60, 0.10),
            (-half_length * 0.95, width * 0.39, 0.60, 0.18),
            (-half_length * 0.76, width * 0.44, 0.62, 0.22),
        ],
        p["body_highlight"],
        "aerodynamic nose" if coupe else "front crash structure",
        ring_points=28,
        exponent=0.58,
        subdivision=1,
    )
    add_rounded_box(
        "central_structural_spine",
        (0.34, length * 0.70, 0.22),
        (0, 0.04, 0.42),
        p["secondary"],
        bevel=0.10,
        component="central spine" if coupe else "lower chassis",
    )
    add_lofted_shell(
        "rear_power_module",
        [
            (half_length * 0.57, width * 0.43, 0.70, 0.24),
            (half_length * 0.84, width * 0.42, 0.68, 0.24),
            (half_length * 0.99, width * 0.30, 0.64, 0.15),
        ],
        p["body_highlight"],
        "rear power module" if coupe else "service panels",
        ring_points=28,
        exponent=0.58,
        subdivision=1,
    )

    cabin_length = 1.78 if coupe else 2.32
    cabin_sections = [
        (-cabin_length * 0.56, width * 0.26, 1.02, 0.12),
        (-cabin_length * 0.42, width * 0.36, 1.07, 0.32),
        (0.0, width * 0.39, 1.10, 0.40),
        (cabin_length * 0.42, width * 0.36, 1.07, 0.32),
        (cabin_length * 0.56, width * 0.27, 1.01, 0.12),
    ]
    add_lofted_shell(
        "passenger_glasshouse",
        cabin_sections,
        p["glass"],
        cabin_component,
        ring_points=28,
        exponent=0.68,
        subdivision=1,
    )

    # Inclined glazing and roof rails make the passenger package legible.
    add_rounded_box(
        "windshield_glass",
        (width * 0.69, 0.055, 0.48),
        (0, -cabin_length * 0.53, 1.12),
        p["glass"],
        bevel=0.05,
        rotation=(math.radians(22), 0, 0),
        component="windshield",
    )
    for side, x in (("left", -width * 0.39), ("right", width * 0.39)):
        add_rounded_box(
            f"{side}_side_glass",
            (0.035, cabin_length * 0.72, 0.40),
            (x, 0, 1.12),
            p["glass"],
            bevel=0.06,
            component="side windows",
        )
        add_tube(
            f"{side}_roof_rail",
            [(x * 0.92, -cabin_length * 0.42, 1.35), (x, 0, 1.49), (x * 0.92, cabin_length * 0.42, 1.35)],
            0.032,
            p["secondary"],
            component=cabin_component,
        )
        add_rounded_box(
            f"{side}_camera_mirror",
            (0.15, 0.24, 0.09),
            (x + (-0.11 if side == "left" else 0.11), -cabin_length * 0.36, 1.12),
            p["black"],
            bevel=0.05,
            component="service panels",
        )

    # Real seats, dashboard, and control volume are visible through the canopy.
    seat_y = -0.22 if coupe else -0.48
    _seat(-0.34, seat_y, p, cabin_component)
    _seat(0.34, seat_y, p, cabin_component)
    if not coupe:
        _seat(-0.34, 0.48, p, cabin_component)
        _seat(0.34, 0.48, p, cabin_component)
    add_rounded_box(
        "dashboard",
        (width * 0.66, 0.34, 0.17),
        (0, -cabin_length * 0.40, 0.89),
        p["interior"],
        bevel=0.08,
        component=cabin_component,
    )
    add_torus(
        "steering_yoke",
        0.16,
        0.025,
        (-0.30, -cabin_length * 0.43, 1.00),
        p["hardware"],
        rotation=(PI / 2, 0, 0),
        component=cabin_component,
        major_segments=28,
        minor_segments=10,
    )

    door_y_positions = (0.0,) if coupe else (-0.43, 0.43)
    for side, x in (("left", -width * 0.505), ("right", width * 0.505)):
        for y in door_y_positions:
            add_rounded_box(
                f"{side}_door_panel",
                (0.035, 0.98 if coupe else 0.74, 0.52),
                (x, y, 0.72),
                p["body_highlight"],
                bevel=0.07,
                component=door_component,
            )
            add_rounded_box(
                f"{side}_door_handle",
                (0.025, 0.17, 0.035),
                (x + (-0.025 if side == "left" else 0.025), y - 0.17, 0.81),
                p["hardware"],
                bevel=0.012,
                component="door handles",
            )
        add_rounded_box(
            f"{side}_side_intake",
            (0.045, 0.62, 0.16),
            (x, half_length * 0.48, 0.52),
            p["black"],
            bevel=0.05,
            component="side intakes" if coupe else "intake grilles",
        )
        for index in range(4):
            add_rounded_box(
                f"{side}_cooling_channel_{index}",
                (0.025, 0.42, 0.025),
                (x + (-0.025 if side == "left" else 0.025), half_length * 0.47, 0.47 + index * 0.045),
                p["hardware"],
                bevel=0.006,
                component="cooling channels",
            )

    pod_x = width * 0.54
    pod_y = length * 0.31
    _hover_nacelle(-pod_x, -pod_y, p, True)
    _hover_nacelle(pod_x, -pod_y, p, True)
    _hover_nacelle(-pod_x, pod_y, p, False)
    _hover_nacelle(pod_x, pod_y, p, False)

    # Layered fascia, lighting, grilles, and diffuser treatment.
    add_rounded_box(
        "front_fascia",
        (width * 0.66, 0.055, 0.18),
        (0, -half_length - 0.04, 0.58),
        p["black"],
        bevel=0.07,
        component="intake grilles",
    )
    for x in (-width * 0.28, width * 0.28):
        add_rounded_box(
            "headlight_module",
            (0.32, 0.035, 0.10),
            (x, -half_length - 0.075, 0.70),
            p["headlight"],
            bevel=0.04,
            component="front lights",
        )
        add_rounded_box(
            "taillight_module",
            (0.36, 0.035, 0.09),
            (x, half_length + 0.065, 0.67),
            p["taillight"],
            bevel=0.04,
            component="rear lights",
        )
        for index in range(4):
            add_rounded_box(
                "front_grille_vane",
                (0.025, 0.045, 0.13),
                (x - 0.10 + index * 0.065, -half_length - 0.085, 0.52),
                p["hardware"],
                bevel=0.006,
                component="intake grilles",
            )
    add_rounded_box(
        "rear_diffuser",
        (width * 0.68, 0.22, 0.11),
        (0, half_length - 0.02, 0.34),
        p["black"],
        bevel=0.04,
        component="service panels",
    )
    for index in range(5):
        add_rounded_box(
            "diffuser_fin",
            (0.035, 0.28, 0.12),
            (-0.36 + index * 0.18, half_length - 0.02, 0.31),
            p["secondary"],
            bevel=0.008,
            component="service panels",
        )

    add_rounded_box(
        "front_service_hatch",
        (width * 0.48, 0.025, 0.24),
        (0, -half_length * 0.58, 0.84),
        p["body_highlight"],
        bevel=0.07,
        component="service panels",
    )
    add_rounded_box(
        "rear_service_hatch",
        (width * 0.48, 0.025, 0.24),
        (0, half_length * 0.64, 0.84),
        p["body_highlight"],
        bevel=0.07,
        component="service panels",
    )
    add_rounded_box(
        "charging_connector",
        (0.035, 0.18, 0.14),
        (width * 0.50, length * 0.10, 0.62),
        p["cyan"],
        bevel=0.035,
        component="charging connector" if coupe else "charging port",
    )
    add_rounded_box(
        "registration_panel",
        (0.38, 0.025, 0.11),
        (0, half_length + 0.075, 0.50),
        p["secondary"],
        bevel=0.025,
        component="service panels",
    )


HERO_BUILDERS = {
    "hover_vehicle": build_hover_vehicle_realistic,
}
