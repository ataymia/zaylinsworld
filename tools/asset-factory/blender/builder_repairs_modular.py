import math

from common import add_cylinder, add_rounded_box, add_tube, make_material
from builder_repair_utils import PI, _component_details, _detail_materials, _dims

def build_modular_connector(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (2, 2, 2))
    add_rounded_box("primary_span", (width * 0.82, depth * 0.76, height * 0.36), (0, 0, height * 0.50), mats[0], bevel=min(width, depth, height) * 0.05, component="primary structural span")
    for side, x in (("start", -width * 0.46), ("end", width * 0.46)):
        add_rounded_box(f"{side}_socket", (width * 0.12, depth * 0.66, height * 0.46), (x, 0, height * 0.50), mats[1], bevel=0.04, component=f"{side} connection socket")
    for x in (-width * 0.34, width * 0.34):
        add_rounded_box("frame_post", (width * 0.07, depth * 0.70, height * 0.72), (x, 0, height * 0.42), mats[0], bevel=0.025, component="load-bearing frame")
    add_rounded_box("service_access", (width * 0.28, depth * 0.035, height * 0.20), (0, -depth * 0.40, height * 0.46), mats[3], bevel=0.025, component="service access")
    for side in (-1, 1):
        add_rounded_box("transition_trim", (width * 0.08, depth * 0.82, height * 0.08), (side * width * 0.42, 0, height * 0.70), mats[4], bevel=0.018, component="seal or transition trim")
        add_rounded_box("boundary", (width * 0.04, depth * 0.78, height * 0.44), (side * width * 0.48, 0, height * 0.45), mats[2], bevel=0.018, component="collision-safe boundary")
    add_rounded_box("lod_silhouette", (width * 0.72, depth * 0.05, height * 0.08), (0, depth * 0.40, height * 0.72), mats[1], bevel=0.018, component="LOD-preserved silhouette")
    _component_details(spec, width, depth, height, mats, scale=0.65)


def build_modular_infrastructure(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (1.2, 0.8, 1.8))
    add_rounded_box("base_mount", (width * 0.92, depth * 0.92, height * 0.08), (0, 0, height * 0.04), p.get("concrete", mats[0]), bevel=0.045, component="anchored base or mount")
    add_rounded_box("enclosure", (width * 0.72, depth * 0.68, height * 0.72), (0, 0, height * 0.44), mats[0], bevel=0.075, component="structural enclosure or frame")
    add_rounded_box("operating_surface", (width * 0.58, depth * 0.05, height * 0.24), (0, -depth * 0.37, height * 0.60), mats[4], bevel=0.035, component="primary operating surface")
    add_rounded_box("control", (width * 0.24, depth * 0.08, height * 0.14), (width * 0.18, -depth * 0.39, height * 0.38), mats[2], bevel=0.025, component="user control or connection")
    add_rounded_box("service_access", (width * 0.44, depth * 0.04, height * 0.30), (0, depth * 0.36, height * 0.34), mats[1], bevel=0.025, component="service access")
    add_tube("service_path", [(-width * 0.28, depth * 0.33, height * 0.16), (-width * 0.40, depth * 0.40, height * 0.05)], max(0.015, width * 0.025), mats[2], component="power, conduit, drainage, or network path", resolution=2)
    add_rounded_box("weather_hood", (width * 0.82, depth * 0.78, height * 0.10), (0, 0, height * 0.82), mats[3], bevel=0.05, component="safety and weather protection")
    for x in (-width * 0.32, width * 0.32):
        add_cylinder("fastener", width * 0.018, height * 0.055, (x, -depth * 0.39, height * 0.15), mats[1], vertices=8, rotation=(PI / 2, 0, 0), component="fasteners and identification", bevel=0.002)
    _component_details(spec, width, depth, height, mats, scale=0.65)


def build_modular_furniture(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (1.4, 0.8, 1.0))
    add_rounded_box("use_surface", (width * 0.92, depth * 0.80, height * 0.10), (0, 0, height * 0.70), mats[1], bevel=0.045, component="primary use surface")
    for x in (-width * 0.39, width * 0.39):
        add_rounded_box("frame", (width * 0.08, depth * 0.68, height * 0.62), (x, 0, height * 0.34), mats[0], bevel=0.025, component="load-bearing frame")
        add_rounded_box("leg", (width * 0.09, depth * 0.12, height * 0.58), (x, depth * 0.28, height * 0.29), mats[0], bevel=0.022, component="legs, pedestal, or wall mount")
        add_rounded_box("floor_contact", (width * 0.15, depth * 0.18, height * 0.04), (x, depth * 0.28, height * 0.02), mats[2], bevel=0.012, component="floor or wall contact detail")
    add_rounded_box("contact_surface", (width * 0.72, depth * 0.52, height * 0.12), (0, -depth * 0.06, height * 0.79), mats[3], bevel=0.065, component="user contact surface")
    add_rounded_box("storage", (width * 0.36, depth * 0.58, height * 0.32), (width * 0.18, 0, height * 0.25), mats[1], bevel=0.035, component="storage or access component")
    for x in (-width * 0.24, 0, width * 0.24):
        add_cylinder("fastener", width * 0.015, height * 0.045, (x, -depth * 0.42, height * 0.68), mats[4], vertices=8, rotation=(PI / 2, 0, 0), component="joinery and fasteners", bevel=0.002)
    add_rounded_box("clearance_marker", (width * 0.54, depth * 0.44, height * 0.025), (0, 0, height * 0.10), mats[2], bevel=0.005, component="interaction clearance")
    _component_details(spec, width, depth, height, mats, scale=0.65)


def build_modular_prop(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (0.8, 0.6, 0.8))
    add_rounded_box("primary_body", (width * 0.82, depth * 0.76, height * 0.62), (0, 0, height * 0.40), mats[0], bevel=min(width, depth, height) * 0.08, component="object-specific primary body")
    add_rounded_box("support", (width * 0.92, depth * 0.84, height * 0.08), (0, 0, height * 0.04), mats[1], bevel=0.03, component="support or contact structure")
    add_rounded_box("opening", (width * 0.46, depth * 0.05, height * 0.24), (0, -depth * 0.40, height * 0.46), mats[2], bevel=0.03, component="functional opening or access")
    add_rounded_box("handle", (width * 0.30, depth * 0.08, height * 0.08), (0, -depth * 0.45, height * 0.64), mats[3], bevel=0.025, component="handle, control, or closure")
    add_rounded_box("secondary_assembly", (width * 0.32, depth * 0.26, height * 0.24), (width * 0.26, depth * 0.20, height * 0.36), mats[4], bevel=0.035, component="secondary functional assembly")
    for x in (-width * 0.28, width * 0.28):
        add_cylinder("fastener", width * 0.018, height * 0.05, (x, -depth * 0.40, height * 0.20), mats[1], vertices=8, rotation=(PI / 2, 0, 0), component="fasteners and seams", bevel=0.002)
    add_rounded_box("placement_contact", (width * 0.54, depth * 0.52, height * 0.025), (0, 0, height * 0.09), mats[2], bevel=0.005, component="placement contact")
    add_cylinder("interaction_socket", width * 0.055, height * 0.08, (-width * 0.28, depth * 0.22, height * 0.48), mats[4], vertices=12, component="interaction or inventory socket", bevel=0.004)
    _component_details(spec, width, depth, height, mats, scale=0.62)


def build_state_variant(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (1, 1, 1))
    add_rounded_box("base_relationship", (width * 0.84, depth * 0.78, height * 0.56), (0, 0, height * 0.36), mats[0], bevel=min(width, depth, height) * 0.08, component="base object relationship")
    add_rounded_box("state_geometry", (width * 0.58, depth * 0.56, height * 0.18), (0, 0, height * 0.72), mats[1], bevel=0.045, component="state-defining geometry")
    add_rounded_box("state_material", (width * 0.46, depth * 0.04, height * 0.24), (0, -depth * 0.41, height * 0.46), mats[4], bevel=0.025, component="state-defining material layer")
    add_cylinder("transition_socket", width * 0.06, height * 0.10, (width * 0.34, depth * 0.26, height * 0.42), mats[3], vertices=12, component="animation transition socket", bevel=0.004)
    add_rounded_box("collision_state", (width * 0.70, depth * 0.62, height * 0.025), (0, 0, height * 0.09), mats[2], bevel=0.006, component="collision state")
    add_rounded_box("interaction_state", (width * 0.24, depth * 0.08, height * 0.15), (-width * 0.26, -depth * 0.42, height * 0.35), mats[3], bevel=0.025, component="interaction state")
    add_rounded_box("damage_metadata", (width * 0.22, depth * 0.06, height * 0.16), (width * 0.26, -depth * 0.42, height * 0.35), mats[1], bevel=0.022, component="damage or repair metadata")
    add_rounded_box("lod_swap", (width * 0.72, depth * 0.04, height * 0.08), (0, depth * 0.40, height * 0.68), mats[4], bevel=0.018, component="LOD and swap policy")
    _component_details(spec, width, depth, height, mats, scale=0.62)


def build_modular_building(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (18, 14, 9))
    foundation_h = height * 0.06
    add_rounded_box("foundation", (width * 0.96, depth * 0.96, foundation_h), (0, 0, foundation_h / 2), p.get("concrete", mats[0]), bevel=0.05, component="foundation")
    add_rounded_box("primary_massing", (width * 0.90, depth * 0.88, height * 0.78), (0, 0, foundation_h + height * 0.39), mats[0], bevel=0.14, component="primary massing")
    add_rounded_box("roof_line", (width * 0.96, depth * 0.94, height * 0.08), (0, 0, height * 0.87), mats[2], bevel=0.08, component="roof line")
    add_rounded_box("entrance", (width * 0.18, depth * 0.05, height * 0.34), (0, -depth * 0.46, height * 0.23), mats[3], bevel=0.06, component="entrance")
    for floor in range(3):
        z = height * (0.28 + floor * 0.20)
        for column in range(5):
            x = width * (-0.32 + column * 0.16)
            add_rounded_box("window", (width * 0.10, depth * 0.035, height * 0.11), (x, -depth * 0.46, z), p.get("glass", mats[4]), bevel=0.035, component="window system")
    for x in (-width * 0.45, width * 0.45):
        add_rounded_box("facade_break", (width * 0.035, depth * 0.91, height * 0.72), (x, 0, height * 0.43), mats[1], bevel=0.025, component="facade material breaks")
    add_rounded_box("service_side", (width * 0.20, depth * 0.035, height * 0.22), (width * 0.25, depth * 0.46, height * 0.18), mats[2], bevel=0.045, component="service side")
    for x in (-width * 0.28, 0, width * 0.28):
        add_rounded_box("rooftop_service", (width * 0.12, depth * 0.14, height * 0.08), (x, depth * 0.12, height * 0.93), mats[1], bevel=0.035, component="roof line")
    _component_details(spec, width, depth, height, mats, scale=0.55)


def build_modular_road(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (10, 10, 0.3))
    add_rounded_box("surface_slab", (width, depth, height * 0.46), (0, 0, height * 0.23), p.get("concrete", mats[2]), bevel=0.035, component="surface slab")
    for side in (-1, 1):
        add_rounded_box("edge", (width * 0.07, depth, height * 0.70), (side * width * 0.465, 0, height * 0.35), mats[1], bevel=0.025, component="curbs or edges")
        add_rounded_box("marking", (width * 0.025, depth * 0.84, height * 0.035), (side * width * 0.23, 0, height * 0.49), mats[3], bevel=0.008, component="lane or path markings")
    add_rounded_box("connection_seam", (width, depth * 0.025, height * 0.04), (0, 0, height * 0.49), mats[0], bevel=0.006, component="connection seams")
    for x in (-width * 0.34, 0, width * 0.34):
        add_rounded_box("drainage", (width * 0.08, depth * 0.08, height * 0.05), (x, depth * 0.44, height * 0.49), mats[2], bevel=0.012, component="drainage detail")
    _component_details(spec, width, depth, height, mats, scale=0.42)


def build_modular_food(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (0.6, 0.6, 0.35))
    ceramic = make_material("food_ceramic", (0.82, 0.78, 0.68), roughness=0.34)
    food_a = make_material("food_primary", (0.55, 0.16, 0.06), roughness=0.62)
    food_b = make_material("food_secondary", (0.18, 0.48, 0.12), roughness=0.72)
    sauce = make_material("food_sauce", (0.86, 0.48, 0.06), roughness=0.28)
    add_cylinder("serving_base", width * 0.46, height * 0.08, (0, 0, height * 0.04), ceramic, vertices=24, component="recognizable primary structure", bevel=0.01)
    add_cylinder("main_portion", width * 0.34, height * 0.20, (0, 0, height * 0.18), food_a, vertices=20, component="functional secondary components", bevel=0.025)
    for index in range(5):
        angle = math.tau * index / 5
        add_cylinder("ingredient", width * 0.075, height * 0.10, (math.cos(angle) * width * 0.24, math.sin(angle) * depth * 0.24, height * 0.20), food_b if index % 2 else sauce, vertices=12, component="appropriate materials", bevel=0.012)
    add_rounded_box("utensil", (width * 0.62, depth * 0.045, height * 0.035), (0, depth * 0.42, height * 0.07), mats[1], bevel=0.009, component="functional secondary components")
    _component_details(spec, width, depth, height, [ceramic, food_a, food_b, sauce], scale=0.5)


