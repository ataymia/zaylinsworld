import json
import math
import os

import bpy
from mathutils import Vector

from common import (
    add_cylinder,
    add_rounded_box,
    add_torus,
    add_tube,
    add_uv_sphere,
    calculate_bounds,
    make_material,
    set_material,
    tag_component,
)

PI = math.pi
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))
BASE_MAP_PATH = os.path.join(REPO_ROOT, "asset-factory", "vehicle-base-map.json")

with open(BASE_MAP_PATH, "r", encoding="utf8") as handle:
    BASE_MAP = json.load(handle).get("assets", {})


def _volume(obj):
    dimensions = [abs(value) for value in obj.dimensions]
    return dimensions[0] * dimensions[1] * dimensions[2]


def _world_bounds(objects):
    points = []
    for obj in objects:
        for corner in obj.bound_box:
            points.append(obj.matrix_world @ Vector(corner))
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return minimum, maximum, maximum - minimum


def _remove_object_tree(obj):
    children = list(obj.children)
    for child in children:
        _remove_object_tree(child)
    bpy.data.objects.remove(obj, do_unlink=True)


def _import_automotive_body(spec, body_material, glass_material):
    mapping = BASE_MAP.get(spec["id"])
    if not mapping:
        raise RuntimeError(f"No licensed automotive foundation is mapped for {spec['id']}.")

    source_path = os.path.join(REPO_ROOT, mapping["baseModel"])
    if not os.path.exists(source_path):
        raise RuntimeError(f"Vehicle foundation does not exist: {source_path}")

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=source_path)
    imported = [obj for obj in bpy.data.objects if obj not in before]
    imported_meshes = [obj for obj in imported if obj.type == "MESH"]
    if not imported_meshes:
        raise RuntimeError(f"Vehicle foundation imported no meshes: {mapping['baseModel']}")

    named_wheels = [
        obj for obj in imported_meshes
        if any(token in obj.name.lower() for token in ("wheel", "tire", "tyre"))
    ]

    # Kenney Car Kit vehicles expose separate wheel nodes. The name check is the
    # preferred route; the fallback only removes four repeated corner meshes when
    # importers rename those nodes.
    wheels = list(named_wheels)
    if not wheels and len(imported_meshes) >= 5:
        maximum_volume = max(_volume(obj) for obj in imported_meshes)
        possible = [obj for obj in imported_meshes if _volume(obj) < maximum_volume * 0.22]
        possible.sort(key=lambda obj: _volume(obj))
        if len(possible) >= 4:
            wheels = possible[:4]

    wheel_names = [obj.name for obj in wheels]
    for wheel in wheels:
        _remove_object_tree(wheel)

    imported = [obj for obj in imported if obj.name in bpy.data.objects]
    imported_meshes = [obj for obj in imported if obj.type == "MESH"]
    if not imported_meshes:
        raise RuntimeError("Removing wheel nodes also removed the automotive body.")

    base_root = bpy.data.objects.new("licensed_automotive_foundation", None)
    bpy.context.collection.objects.link(base_root)
    imported_set = set(imported)
    for obj in imported:
        if obj.parent not in imported_set:
            obj.parent = base_root

    bpy.context.view_layer.update()
    _, _, dimensions = _world_bounds(imported_meshes)
    if dimensions.x > dimensions.y:
        base_root.rotation_euler.z = PI / 2
        bpy.context.view_layer.update()
        _, _, dimensions = _world_bounds(imported_meshes)

    target = spec["dimensionsMeters"]
    target_width = float(target["width"]) * 0.82
    target_length = float(target["depth"]) * 0.92
    target_height = float(target["height"]) * 0.82
    scale_x = target_width / max(dimensions.x, 0.001)
    scale_y = target_length / max(dimensions.y, 0.001)
    scale_z = target_height / max(dimensions.z, 0.001)
    base_root.scale = (scale_x, scale_y, scale_z)
    bpy.context.view_layer.update()

    # Recenter the imported body horizontally and hold it above the emitter plane.
    minimum, maximum, dimensions = _world_bounds(imported_meshes)
    base_root.location.x -= (minimum.x + maximum.x) / 2
    base_root.location.y -= (minimum.y + maximum.y) / 2
    base_root.location.z += 0.34 - minimum.z
    bpy.context.view_layer.update()

    for obj in imported_meshes:
        original_material_names = [slot.material.name.lower() for slot in obj.material_slots if slot.material]
        for slot in obj.material_slots:
            if slot.material and any(token in slot.material.name.lower() for token in ("glass", "window", "windshield")):
                slot.material = glass_material
            elif slot.material:
                slot.material = body_material
        if not obj.material_slots:
            set_material(obj, body_material)
        tag_component(obj, "lower chassis")
        obj["zta_source_model"] = mapping["baseModel"]
        obj["zta_source_license"] = mapping["license"]
        obj["zta_removed_wheel_nodes"] = ", ".join(wheel_names)
        obj["zta_original_materials"] = ", ".join(original_material_names)

    base_root["zta_source_model"] = mapping["baseModel"]
    base_root["zta_source_name"] = mapping["baseName"]
    base_root["zta_source_license"] = mapping["license"]
    base_root["zta_conversion"] = mapping["conversion"]
    return base_root


def _hover_nacelle(name, x, y, front, materials):
    component = "front hover pods" if front else "rear hover pods"
    add_tube(
        f"{name}_mount_arm",
        [(x * 0.78, y * 0.86, 0.48), (x * 0.92, y * 0.96, 0.34), (x, y, 0.23)],
        0.055,
        materials["structure"],
        component=component,
    )
    add_uv_sphere(
        f"{name}_nacelle",
        0.43,
        (x, y, 0.22),
        materials["body_secondary"],
        scale=(0.64, 1.05, 0.34),
        component=component,
        segments=40,
        rings=20,
    )
    add_rounded_box(
        f"{name}_service_panel",
        (0.34, 0.42, 0.045),
        (x, y, 0.36),
        materials["hardware"],
        bevel=0.04,
        component="service panels",
    )
    add_torus(
        f"{name}_lift_ring",
        0.27,
        0.042,
        (x, y, 0.045),
        materials["cyan"],
        component="underbody lift rings",
        major_segments=48,
        minor_segments=14,
    )
    add_cylinder(
        f"{name}_emitter_core",
        0.19,
        0.065,
        (x, y, 0.045),
        materials["emitter"],
        vertices=40,
        component="underbody lift rings",
        bevel=0.008,
    )
    for index in range(4):
        angle = math.tau * index / 4
        add_rounded_box(
            f"{name}_fastener_{index}",
            (0.035, 0.05, 0.035),
            (x + math.cos(angle) * 0.25, y + math.sin(angle) * 0.33, 0.34),
            materials["hardware"],
            bevel=0.008,
            component="service panels",
        )


def _seat(name, x, y, materials, component):
    add_rounded_box(
        f"{name}_cushion",
        (0.46, 0.52, 0.12),
        (x, y, 0.76),
        materials["interior"],
        bevel=0.09,
        component=component,
    )
    add_rounded_box(
        f"{name}_back",
        (0.44, 0.14, 0.54),
        (x, y + 0.18, 1.02),
        materials["interior"],
        bevel=0.10,
        rotation=(math.radians(-9), 0, 0),
        component=component,
    )
    add_rounded_box(
        f"{name}_headrest",
        (0.28, 0.11, 0.17),
        (x, y + 0.22, 1.33),
        materials["interior"],
        bevel=0.07,
        component=component,
    )


def build_hover_vehicle_from_automotive_base(spec):
    coupe = "coupe" in str(spec.get("variant") or "").lower() or "coupe" in spec["id"].lower()
    width = float(spec["dimensionsMeters"]["width"])
    length = float(spec["dimensionsMeters"]["depth"])
    half_length = length / 2
    cabin_component = "two-seat cabin" if coupe else "passenger cabin"
    door_component = "two doors" if coupe else "four doors"

    materials = {
        "body": make_material("tech_hover_graphite", (0.045, 0.075, 0.115), metallic=0.82, roughness=0.24),
        "body_secondary": make_material("tech_hover_secondary", (0.09, 0.15, 0.22), metallic=0.72, roughness=0.23),
        "structure": make_material("tech_hover_structure", (0.18, 0.23, 0.29), metallic=0.92, roughness=0.22),
        "hardware": make_material("tech_hover_hardware", (0.39, 0.45, 0.52), metallic=0.95, roughness=0.17),
        "glass": make_material("tech_hover_glass", (0.02, 0.16, 0.25), metallic=0.04, roughness=0.07, alpha=0.38),
        "interior": make_material("tech_hover_interior", (0.025, 0.035, 0.052), metallic=0.06, roughness=0.56),
        "black": make_material("tech_hover_black", (0.006, 0.010, 0.018), metallic=0.28, roughness=0.30),
        "emitter": make_material("tech_hover_emitter_core", (0.008, 0.025, 0.04), metallic=0.74, roughness=0.18),
        "cyan": make_material("tech_hover_cyan", (0.0, 0.24, 0.32), metallic=0.12, roughness=0.18, emission=(0.0, 0.82, 1.0), emission_strength=5.0),
        "magenta": make_material("tech_hover_magenta", (0.28, 0.0, 0.18), metallic=0.12, roughness=0.18, emission=(1.0, 0.0, 0.62), emission_strength=4.0),
        "headlight": make_material("tech_hover_headlight", (0.55, 0.66, 0.72), roughness=0.08, emission=(0.92, 0.98, 1.0), emission_strength=5.0),
        "taillight": make_material("tech_hover_taillight", (0.32, 0.0, 0.02), roughness=0.10, emission=(1.0, 0.0, 0.035), emission_strength=5.0),
    }

    _import_automotive_body(spec, materials["body"], materials["glass"])

    # Structural underbody and power volumes remain visible beneath the inherited
    # automotive body instead of becoming decorative floating rings.
    add_rounded_box(
        "load_bearing_undertray",
        (width * 0.72, length * 0.68, 0.16),
        (0, 0, 0.32),
        materials["structure"],
        bevel=0.10,
        component="central spine" if coupe else "lower chassis",
    )
    add_rounded_box(
        "front_crash_and_sensor_module",
        (width * 0.58, 0.38, 0.16),
        (0, -half_length * 0.88, 0.52),
        materials["body_secondary"],
        bevel=0.10,
        component="aerodynamic nose" if coupe else "front crash structure",
    )
    add_rounded_box(
        "rear_power_service_module",
        (width * 0.60, 0.40, 0.20),
        (0, half_length * 0.80, 0.58),
        materials["body_secondary"],
        bevel=0.10,
        component="rear power module" if coupe else "service panels",
    )

    # The licensed body supplies the main cabin silhouette. Separate transparent
    # panels and visible seating keep the passenger packaging legible after the
    # body receives its dark TechTown finish.
    canopy_length = 1.75 if coupe else 2.25
    add_uv_sphere(
        "integrated_glasshouse",
        0.78,
        (0, -0.02, 1.03),
        materials["glass"],
        scale=(width * 0.45 / 0.78, canopy_length * 0.48 / 0.78, 0.48 / 0.78),
        component=cabin_component,
        segments=48,
        rings=24,
    )
    add_rounded_box(
        "windshield",
        (width * 0.66, 0.045, 0.42),
        (0, -canopy_length * 0.49, 1.05),
        materials["glass"],
        bevel=0.05,
        rotation=(math.radians(20), 0, 0),
        component="windshield",
    )
    for side, x in (("left", -width * 0.36), ("right", width * 0.36)):
        add_rounded_box(
            f"{side}_side_window",
            (0.035, canopy_length * 0.66, 0.33),
            (x, 0, 1.08),
            materials["glass"],
            bevel=0.06,
            component="side windows",
        )
        add_rounded_box(
            f"{side}_camera_mirror",
            (0.13, 0.20, 0.08),
            (x + (-0.10 if side == "left" else 0.10), -canopy_length * 0.34, 1.10),
            materials["black"],
            bevel=0.045,
            component="service panels",
        )

    _seat("driver_seat", -0.31, -0.18 if coupe else -0.42, materials, cabin_component)
    _seat("passenger_seat", 0.31, -0.18 if coupe else -0.42, materials, cabin_component)
    if not coupe:
        _seat("rear_left_seat", -0.31, 0.48, materials, cabin_component)
        _seat("rear_right_seat", 0.31, 0.48, materials, cabin_component)
    add_rounded_box(
        "dashboard",
        (width * 0.58, 0.28, 0.14),
        (0, -canopy_length * 0.40, 0.86),
        materials["interior"],
        bevel=0.07,
        component=cabin_component,
    )

    door_positions = (0.0,) if coupe else (-0.40, 0.40)
    for side, x in (("left", -width * 0.43), ("right", width * 0.43)):
        for y in door_positions:
            add_rounded_box(
                f"{side}_door_panel",
                (0.032, 0.94 if coupe else 0.70, 0.46),
                (x, y, 0.71),
                materials["body_secondary"],
                bevel=0.06,
                component=door_component,
            )
            add_rounded_box(
                f"{side}_door_handle",
                (0.025, 0.16, 0.032),
                (x + (-0.025 if side == "left" else 0.025), y - 0.15, 0.79),
                materials["hardware"],
                bevel=0.012,
                component="door handles",
            )
        add_rounded_box(
            f"{side}_side_intake",
            (0.04, 0.56, 0.14),
            (x, length * 0.24, 0.53),
            materials["black"],
            bevel=0.045,
            component="side intakes" if coupe else "intake grilles",
        )
        for index in range(4):
            add_rounded_box(
                f"{side}_cooling_channel_{index}",
                (0.025, 0.36, 0.022),
                (x + (-0.022 if side == "left" else 0.022), length * 0.24, 0.48 + index * 0.038),
                materials["hardware"],
                bevel=0.005,
                component="cooling channels",
            )

    pod_x = width * 0.49
    pod_y = length * 0.31
    _hover_nacelle("front_left", -pod_x, -pod_y, True, materials)
    _hover_nacelle("front_right", pod_x, -pod_y, True, materials)
    _hover_nacelle("rear_left", -pod_x, pod_y, False, materials)
    _hover_nacelle("rear_right", pod_x, pod_y, False, materials)

    add_rounded_box(
        "front_intake_fascia",
        (width * 0.56, 0.045, 0.14),
        (0, -half_length * 0.93, 0.55),
        materials["black"],
        bevel=0.055,
        component="intake grilles",
    )
    for x in (-width * 0.27, width * 0.27):
        add_rounded_box(
            "headlight_module",
            (0.30, 0.032, 0.09),
            (x, -half_length * 0.95, 0.69),
            materials["headlight"],
            bevel=0.035,
            component="front lights",
        )
        add_rounded_box(
            "taillight_module",
            (0.33, 0.032, 0.085),
            (x, half_length * 0.94, 0.66),
            materials["taillight"],
            bevel=0.035,
            component="rear lights",
        )
        for index in range(4):
            add_rounded_box(
                "front_grille_vane",
                (0.022, 0.038, 0.11),
                (x - 0.09 + index * 0.060, -half_length * 0.95, 0.52),
                materials["hardware"],
                bevel=0.005,
                component="intake grilles",
            )
    add_rounded_box(
        "rear_diffuser",
        (width * 0.58, 0.20, 0.09),
        (0, half_length * 0.88, 0.33),
        materials["black"],
        bevel=0.035,
        component="service panels",
    )
    add_rounded_box(
        "front_service_hatch",
        (width * 0.42, 0.025, 0.18),
        (0, -length * 0.30, 0.83),
        materials["body_secondary"],
        bevel=0.055,
        component="service panels",
    )
    add_rounded_box(
        "rear_service_hatch",
        (width * 0.42, 0.025, 0.18),
        (0, length * 0.31, 0.83),
        materials["body_secondary"],
        bevel=0.055,
        component="service panels",
    )
    add_rounded_box(
        "charging_connector",
        (0.032, 0.17, 0.13),
        (width * 0.44, length * 0.10, 0.62),
        materials["cyan"],
        bevel=0.03,
        component="charging connector" if coupe else "charging port",
    )


HERO_BUILDERS = {
    "hover_vehicle": build_hover_vehicle_from_automotive_base,
}
