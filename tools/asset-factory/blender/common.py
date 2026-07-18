import math
import os
import re
from mathutils import Vector

import bpy


def clean_name(value):
    return re.sub(r"[^a-z0-9]+", "_", str(value).lower()).strip("_")


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_material(name, color, metallic=0.0, roughness=0.5, emission=None, emission_strength=0.0, alpha=1.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, alpha)
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        base = bsdf.inputs.get("Base Color")
        if base:
            base.default_value = (*color, 1.0)
        metal = bsdf.inputs.get("Metallic")
        if metal:
            metal.default_value = metallic
        rough = bsdf.inputs.get("Roughness")
        if rough:
            rough.default_value = roughness
        alpha_input = bsdf.inputs.get("Alpha")
        if alpha_input:
            alpha_input.default_value = alpha
        if emission:
            emit = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
            if emit:
                emit.default_value = (*emission, 1.0)
            strength = bsdf.inputs.get("Emission Strength")
            if strength:
                strength.default_value = emission_strength
    if alpha < 1.0:
        mat.blend_method = "BLEND"
        mat.use_screen_refraction = True
        mat.show_transparent_back = False
    return mat


def tag_component(obj, component):
    if component:
        obj["zta_component"] = component
        obj.name = f"component__{clean_name(component)}__{clean_name(obj.name)}"
    return obj


def set_material(obj, material):
    if material and hasattr(obj.data, "materials"):
        obj.data.materials.append(material)
    return obj


def apply_modifier(obj, modifier_name):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.modifier_apply(modifier=modifier_name)
    finally:
        obj.select_set(False)


def apply_transform(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)


def add_rounded_box(name, size, location, material, bevel=0.035, rotation=(0.0, 0.0, 0.0), component=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    apply_transform(obj)
    if bevel > 0:
        modifier = obj.modifiers.new(name="edge_softening", type="BEVEL")
        modifier.width = min(bevel, min(size) * 0.2)
        modifier.segments = 3
        modifier.limit_method = "ANGLE"
        apply_modifier(obj, modifier.name)
    set_material(obj, material)
    return tag_component(obj, component)


def add_cylinder(name, radius, depth, location, material, vertices=32, rotation=(0.0, 0.0, 0.0), component=None, bevel=0.015):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    if bevel > 0:
        modifier = obj.modifiers.new(name="edge_softening", type="BEVEL")
        modifier.width = min(bevel, radius * 0.22, depth * 0.1)
        modifier.segments = 2
        apply_modifier(obj, modifier.name)
    set_material(obj, material)
    return tag_component(obj, component)


def add_cone(name, radius1, radius2, depth, location, material, vertices=32, rotation=(0.0, 0.0, 0.0), component=None, bevel=0.012):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    if bevel > 0:
        modifier = obj.modifiers.new(name="edge_softening", type="BEVEL")
        modifier.width = min(bevel, max(0.01, min(radius1, max(radius2, 0.01)) * 0.18))
        modifier.segments = 2
        apply_modifier(obj, modifier.name)
    set_material(obj, material)
    return tag_component(obj, component)


def add_uv_sphere(name, radius, location, material, scale=(1.0, 1.0, 1.0), component=None, segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    set_material(obj, material)
    return tag_component(obj, component)


def add_torus(name, major_radius, minor_radius, location, material, rotation=(0.0, 0.0, 0.0), component=None, major_segments=32, minor_segments=10):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    set_material(obj, material)
    return tag_component(obj, component)


def add_tube(name, points, radius, material, component=None, resolution=3, cyclic=False):
    curve_data = bpy.data.curves.new(name=f"{name}_curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = resolution
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 3
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    set_material(obj, material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    obj.select_set(False)
    return tag_component(obj, component)


def add_text_mesh(name, body, location, size, depth, material, rotation=(math.pi / 2, 0.0, 0.0), component=None, align="CENTER"):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = align
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = depth
    obj.data.bevel_depth = min(depth * 0.35, 0.01)
    obj.data.bevel_resolution = 2
    set_material(obj, material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    obj.select_set(False)
    return tag_component(obj, component)


def add_octagonal_prism(name, radius, depth, location, material, rotation=(math.pi / 2, 0.0, 0.0), component=None, bevel=0.01):
    return add_cylinder(
        name=name,
        radius=radius,
        depth=depth,
        location=location,
        material=material,
        vertices=8,
        rotation=rotation,
        component=component,
        bevel=bevel,
    )


def add_bolt_ring(prefix, count, radius, z, bolt_radius, bolt_height, material, component, axis="z"):
    objects = []
    for index in range(count):
        angle = math.tau * index / count
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        location = (x, y, z)
        rotation = (0.0, 0.0, 0.0)
        if axis == "x":
            rotation = (0.0, math.pi / 2, 0.0)
        elif axis == "y":
            rotation = (math.pi / 2, 0.0, 0.0)
        objects.append(add_cylinder(
            f"{prefix}_{index + 1:02d}", bolt_radius, bolt_height, location, material,
            vertices=8, rotation=rotation, component=component, bevel=0.004,
        ))
    return objects


def create_root(spec):
    root = bpy.data.objects.new("ASSET_ROOT", None)
    bpy.context.collection.objects.link(root)
    root["zta_asset_id"] = spec["id"]
    root["zta_display_name"] = spec["displayName"]
    root["zta_town"] = spec["town"]
    root["zta_family"] = spec["family"]
    root["zta_description"] = spec["description"]
    root["zta_license"] = spec.get("license", "Original ZTA procedural geometry")
    return root


def parent_scene_objects(root):
    for obj in list(bpy.context.scene.objects):
        if obj is root or obj.type in {"CAMERA", "LIGHT"} or obj.get("preview_only"):
            continue
        if obj.parent is None:
            obj.parent = root


def mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.get("preview_only")]


def calculate_bounds(objects=None):
    objects = objects or mesh_objects()
    points = []
    for obj in objects:
        for corner in obj.bound_box:
            points.append(obj.matrix_world @ Vector(corner))
    if not points:
        return {"min": [0, 0, 0], "max": [0, 0, 0], "dimensions": [0, 0, 0]}
    min_v = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    max_v = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    dim = max_v - min_v
    return {"min": list(min_v), "max": list(max_v), "dimensions": list(dim)}


def move_to_ground_center(root):
    bounds = calculate_bounds()
    min_v = Vector(bounds["min"])
    max_v = Vector(bounds["max"])
    center_x = (min_v.x + max_v.x) / 2
    center_y = (min_v.y + max_v.y) / 2
    root.location.x -= center_x
    root.location.y -= center_y
    root.location.z -= min_v.z
    bpy.context.view_layer.update()


def triangle_count(obj):
    if obj.type != "MESH":
        return 0
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def collect_stats(spec):
    objects = mesh_objects()
    bounds = calculate_bounds(objects)
    components = sorted({obj.get("zta_component") for obj in objects if obj.get("zta_component")})
    materials = sorted({slot.material.name for obj in objects for slot in obj.material_slots if slot.material})
    return {
        "meshObjects": len(objects),
        "triangles": sum(triangle_count(obj) for obj in objects),
        "materials": materials,
        "materialCount": len(materials),
        "components": components,
        "bounds": bounds,
        "requiredComponents": spec.get("requiredComponents", []),
    }


def component_matches(required, present):
    required_key = clean_name(required)
    present_keys = [clean_name(value) for value in present]
    return any(required_key == value or required_key in value or value in required_key for value in present_keys)


def evaluate_quality(spec, stats, preview_coverage):
    quality = spec.get("quality", {})
    failures = []
    if stats["meshObjects"] < quality.get("minimumMeshObjects", 1):
        failures.append(f"mesh object count {stats['meshObjects']} is below {quality.get('minimumMeshObjects')}")
    if stats["triangles"] < quality.get("minimumTriangles", 1):
        failures.append(f"triangle count {stats['triangles']} is below {quality.get('minimumTriangles')}")
    if stats["triangles"] > quality.get("maximumTriangles", 1000000):
        failures.append(f"triangle count {stats['triangles']} exceeds {quality.get('maximumTriangles')}")
    if stats["materialCount"] < quality.get("minimumMaterials", 1):
        failures.append(f"material count {stats['materialCount']} is below {quality.get('minimumMaterials')}")
    if stats["materialCount"] > quality.get("maximumMaterials", 999):
        failures.append(f"material count {stats['materialCount']} exceeds {quality.get('maximumMaterials')}")

    missing = [item for item in spec.get("requiredComponents", []) if not component_matches(item, stats["components"])]
    if missing:
        failures.append("missing required components: " + ", ".join(missing))

    expected = spec.get("dimensionsMeters", {})
    actual = stats["bounds"]["dimensions"]
    tolerance = quality.get("dimensionTolerance", 0.35)
    for axis, actual_value in zip(("width", "depth", "height"), actual):
        expected_value = float(expected.get(axis, actual_value or 1.0))
        if expected_value <= 0:
            continue
        error = abs(actual_value - expected_value) / expected_value
        if error > tolerance:
            failures.append(f"{axis} {actual_value:.3f}m differs from target {expected_value:.3f}m by {error:.0%}")

    min_z = stats["bounds"]["min"][2]
    if abs(min_z) > quality.get("groundPivotToleranceMeters", 0.04):
        failures.append(f"ground pivot error: lowest point is {min_z:.3f}m")

    min_coverage = quality.get("minimumPreviewCoverage", 0.07)
    max_coverage = quality.get("maximumPreviewCoverage", 0.9)
    for index, coverage in enumerate(preview_coverage):
        if coverage < min_coverage or coverage > max_coverage:
            failures.append(f"preview {index + 1} silhouette coverage {coverage:.3f} is outside {min_coverage}-{max_coverage}")

    return {"passed": not failures, "failures": failures}


def configure_render():
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
    scene.view_settings.look = "Medium High Contrast"
    world = scene.world or bpy.data.worlds.new("AssetPreviewWorld")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.035, 0.045, 0.065, 1.0)
    background.inputs["Strength"].default_value = 0.35


def add_area_light(name, location, energy, size, color):
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    bpy.context.collection.objects.link(obj)
    return obj


def point_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_turntable(spec, preview_dir):
    os.makedirs(preview_dir, exist_ok=True)
    configure_render()
    bounds = calculate_bounds()
    dimensions = Vector(bounds["dimensions"])
    center = Vector((0.0, 0.0, dimensions.z * 0.48))
    radius = max(dimensions.x, dimensions.y, dimensions.z, 1.0)
    distance = radius * 2.35 + 1.0

    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera_data.lens = 58
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera

    key = add_area_light("PreviewKey", (distance * 0.7, -distance * 0.8, distance * 1.1), 1300, radius * 1.4, (1.0, 0.86, 0.74))
    fill = add_area_light("PreviewFill", (-distance * 0.8, -distance * 0.2, distance * 0.65), 850, radius * 1.2, (0.55, 0.72, 1.0))
    rim = add_area_light("PreviewRim", (0.0, distance * 0.9, distance * 1.25), 1100, radius, (0.65, 0.8, 1.0))
    for light in (key, fill, rim):
        point_at(light, center)

    coverages = []
    paths = []
    for index, degrees in enumerate((35, 125, 215, 305), start=1):
        angle = math.radians(degrees)
        camera.location = (
            math.cos(angle) * distance,
            math.sin(angle) * distance,
            max(dimensions.z * 0.9, radius * 0.72),
        )
        point_at(camera, center)
        path = os.path.join(preview_dir, f"{spec['id']}_view_{index}.png")
        bpy.context.scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        render_result = bpy.data.images.get("Render Result")
        pixels = list(render_result.pixels)
        alpha_values = pixels[3::4]
        coverage = sum(1 for alpha in alpha_values if alpha > 0.05) / max(1, len(alpha_values))
        coverages.append(coverage)
        paths.append(path)

    for obj in (camera, key, fill, rim):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.cameras.remove(camera_data, do_unlink=True)
    return paths, coverages


def export_glb(root, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in mesh_objects():
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_extras=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )


def default_palette(town):
    palettes = {
        "starter-town": {
            "metal": make_material("starter_dark_metal", (0.16, 0.19, 0.22), metallic=0.78, roughness=0.34),
            "metal_light": make_material("starter_galvanized", (0.48, 0.52, 0.55), metallic=0.82, roughness=0.3),
            "paint_red": make_material("starter_red_paint", (0.55, 0.035, 0.025), metallic=0.18, roughness=0.36),
            "navy": make_material("starter_civic_navy", (0.055, 0.09, 0.16), metallic=0.25, roughness=0.34),
            "cream": make_material("starter_cream", (0.68, 0.59, 0.44), metallic=0.02, roughness=0.58),
            "brick": make_material("starter_brick", (0.38, 0.11, 0.075), metallic=0.0, roughness=0.72),
            "wood": make_material("starter_wood", (0.34, 0.16, 0.065), metallic=0.0, roughness=0.5),
            "black": make_material("starter_black", (0.012, 0.016, 0.022), metallic=0.35, roughness=0.42),
            "glass": make_material("starter_glass", (0.46, 0.7, 0.82), metallic=0.05, roughness=0.12, alpha=0.42),
            "concrete": make_material("starter_concrete", (0.34, 0.34, 0.32), metallic=0.0, roughness=0.84),
            "white": make_material("starter_white", (0.91, 0.91, 0.88), metallic=0.0, roughness=0.36),
            "yellow": make_material("starter_warning_yellow", (0.95, 0.55, 0.035), metallic=0.05, roughness=0.38),
            "green": make_material("starter_sign_green", (0.02, 0.23, 0.09), metallic=0.08, roughness=0.4),
            "red_light": make_material("starter_red_light", (0.25, 0.0, 0.0), roughness=0.18, emission=(1.0, 0.01, 0.0), emission_strength=4.0),
            "amber_light": make_material("starter_amber_light", (0.3, 0.09, 0.0), roughness=0.18, emission=(1.0, 0.22, 0.0), emission_strength=4.0),
            "green_light": make_material("starter_green_light", (0.0, 0.16, 0.025), roughness=0.18, emission=(0.0, 1.0, 0.08), emission_strength=4.0),
            "warm_light": make_material("starter_warm_light", (0.65, 0.5, 0.28), roughness=0.1, emission=(1.0, 0.73, 0.38), emission_strength=3.0),
        },
        "techtown": {
            "metal": make_material("tech_dark_metal", (0.025, 0.035, 0.055), metallic=0.9, roughness=0.23),
            "metal_light": make_material("tech_brushed_metal", (0.2, 0.25, 0.3), metallic=0.92, roughness=0.2),
            "black": make_material("tech_composite", (0.008, 0.012, 0.02), metallic=0.35, roughness=0.27),
            "glass": make_material("tech_smoked_glass", (0.025, 0.11, 0.18), metallic=0.08, roughness=0.08, alpha=0.45),
            "cyan": make_material("tech_cyan_emissive", (0.0, 0.2, 0.28), metallic=0.15, roughness=0.2, emission=(0.0, 0.85, 1.0), emission_strength=5.0),
            "magenta": make_material("tech_magenta_emissive", (0.25, 0.0, 0.18), metallic=0.1, roughness=0.2, emission=(1.0, 0.0, 0.62), emission_strength=4.0),
            "white": make_material("tech_white_light", (0.4, 0.45, 0.5), roughness=0.12, emission=(0.9, 0.96, 1.0), emission_strength=4.0),
            "red_light": make_material("tech_red_light", (0.24, 0.0, 0.01), roughness=0.16, emission=(1.0, 0.0, 0.03), emission_strength=4.0),
            "rubber": make_material("tech_rubber", (0.006, 0.008, 0.012), metallic=0.0, roughness=0.75),
            "concrete": make_material("tech_concrete", (0.16, 0.17, 0.19), metallic=0.0, roughness=0.68),
        },
    }
    return palettes.get(town, palettes["starter-town"])
