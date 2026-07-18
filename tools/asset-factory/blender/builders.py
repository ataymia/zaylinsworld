import math

import bpy

from common import (
    add_bolt_ring,
    add_cone,
    add_cylinder,
    add_octagonal_prism,
    add_rounded_box,
    add_text_mesh,
    add_torus,
    add_tube,
    add_uv_sphere,
    default_palette,
    make_material,
    tag_component,
)

PI = math.pi


def _variant(spec, token):
    return token in str(spec.get("variant") or "").lower() or token in spec["id"].lower()


def _label_once(obj, component):
    if obj:
        tag_component(obj, component)
    return obj


def build_streetlight(spec):
    p = default_palette(spec["town"])
    residential = _variant(spec, "residential")
    height = 5.2 if residential else 7.4
    pole_bottom = 0.095 if residential else 0.12
    pole_top = 0.055 if residential else 0.07
    flange_r = 0.24 if residential else 0.29

    add_cylinder("streetlight_base_flange", flange_r, 0.07, (0, 0, 0.035), p["metal"], component="base flange")
    for index in range(6):
        a = math.tau * index / 6
        add_cylinder(
            f"anchor_bolt_{index}", 0.018, 0.055,
            (math.cos(a) * flange_r * 0.72, math.sin(a) * flange_r * 0.72, 0.085),
            p["metal_light"], vertices=10, component="anchor bolts", bevel=0.003,
        )
    add_cone("tapered_pole", pole_bottom, pole_top, height - 0.25, (0, 0, (height - 0.25) / 2 + 0.08), p["metal"], vertices=36, component="tapered pole")
    add_rounded_box("maintenance_door", (0.13, 0.025, 0.42), (0, -pole_bottom - 0.01, 0.78), p["metal_light"], bevel=0.012, component="maintenance door")
    add_rounded_box("maintenance_latch", (0.025, 0.018, 0.08), (0.04, -pole_bottom - 0.03, 0.78), p["black"], bevel=0.006, component="maintenance door")

    if residential:
        points = [(0, 0, height - 0.65), (0.05, 0, height - 0.15), (0.45, 0, height + 0.12), (0.95, 0, height - 0.02)]
        add_tube("curved_arm", points, 0.045, p["metal"], component="curved arm")
        fixture_x = 1.02
        fixture_z = height - 0.12
        add_rounded_box("fixture_housing", (0.48, 0.28, 0.16), (fixture_x, 0, fixture_z), p["metal"], bevel=0.035, component="fixture housing")
        add_rounded_box("glass_lens", (0.36, 0.21, 0.025), (fixture_x, 0, fixture_z - 0.092), p["warm_light"], bevel=0.012, component="glass lens")
    else:
        pole_top_z = height - 0.32
        add_tube("mast_arm", [(0, 0, pole_top_z), (0.4, 0, height - 0.05), (2.15, 0, height - 0.05)], 0.055, p["metal"], component="mast arm")
        add_tube("arm_brace", [(0.12, 0, pole_top_z - 0.28), (0.65, 0, height - 0.05)], 0.026, p["metal_light"], component="arm brace")
        fixture_x = 2.23
        fixture_z = height - 0.10
        add_rounded_box("luminaire_housing", (0.72, 0.32, 0.18), (fixture_x, 0, fixture_z), p["metal"], bevel=0.04, component="luminaire housing")
        add_rounded_box("glass_lens", (0.58, 0.24, 0.025), (fixture_x, 0, fixture_z - 0.105), p["warm_light"], bevel=0.012, component="glass lens")
        for index in range(5):
            add_rounded_box("cooling_rib", (0.035, 0.26, 0.055), (fixture_x - 0.20 + index * 0.10, 0, fixture_z + 0.115), p["metal_light"], bevel=0.006, component="cooling ribs")


def _signal_head(x, z, p, suffix):
    add_cylinder(f"hanger_{suffix}", 0.025, 0.45, (x, 0, z + 0.38), p["metal"], component=f"signal head {suffix}")
    add_rounded_box(f"signal_housing_{suffix}", (0.34, 0.28, 1.08), (x, 0, z), p["black"], bevel=0.055, component=f"signal head {suffix}")
    lens_data = [
        (z + 0.34, p["red_light"], "red lenses"),
        (z, p["amber_light"], "amber lenses"),
        (z - 0.34, p["green_light"], "green lenses"),
    ]
    for lens_z, material, component in lens_data:
        add_cylinder(f"{component}_{suffix}", 0.115, 0.045, (x, -0.155, lens_z), material, vertices=32, rotation=(PI / 2, 0, 0), component=component, bevel=0.006)
        add_torus(f"visor_ring_{component}_{suffix}", 0.13, 0.018, (x, -0.175, lens_z), p["black"], rotation=(PI / 2, 0, 0), component="visibility visors")
        add_rounded_box(f"visor_cap_{component}_{suffix}", (0.30, 0.17, 0.075), (x, -0.235, lens_z + 0.11), p["black"], bevel=0.02, rotation=(math.radians(-8), 0, 0), component="visibility visors")


def build_traffic_light(spec):
    p = default_palette(spec["town"])
    height = 6.4
    add_cylinder("traffic_base", 0.34, 0.09, (0, 0, 0.045), p["metal"], component="base flange")
    add_bolt_ring("traffic_anchor", 8, 0.25, 0.105, 0.018, 0.055, p["metal_light"], "anchor bolts")
    add_cone("traffic_vertical_support", 0.14, 0.09, height - 0.25, (0, 0, (height - 0.25) / 2 + 0.08), p["metal"], vertices=36, component="vertical support")
    add_cylinder("mast_arm", 0.09, 7.6, (3.65, 0, height - 0.25), p["metal"], rotation=(0, PI / 2, 0), component="mast arm")
    add_tube("mast_arm_brace", [(0, 0, height - 1.0), (0.75, 0, height - 0.25)], 0.045, p["metal_light"], component="arm brace")
    _signal_head(2.6, height - 1.1, p, "left")
    _signal_head(5.8, height - 1.1, p, "right")
    add_rounded_box("pedestrian_signal", (0.42, 0.24, 0.55), (0, -0.17, 2.65), p["black"], bevel=0.045, component="pedestrian signal")
    add_rounded_box("pedestrian_display", (0.31, 0.025, 0.39), (0, -0.305, 2.65), p["white"], bevel=0.02, component="pedestrian signal")
    add_rounded_box("push_button_box", (0.16, 0.11, 0.28), (0, -0.16, 1.25), p["metal_light"], bevel=0.025, component="push button")
    add_cylinder("push_button", 0.035, 0.03, (0, -0.235, 1.30), p["yellow"], vertices=24, rotation=(PI / 2, 0, 0), component="push button")


def build_road_sign(spec):
    p = default_palette(spec["town"])
    variant = str(spec.get("variant") or "").lower()
    if "street" in variant or "street_name" in spec["id"]:
        add_cylinder("street_sign_pole", 0.045, 3.0, (0, 0, 1.5), p["metal_light"], vertices=24, component="vertical pole")
        add_cylinder("pole_cap", 0.06, 0.06, (0, 0, 3.03), p["metal"], vertices=24, component="pole cap")
        add_torus("upper_mounting_collar", 0.06, 0.012, (0, 0, 2.73), p["metal"], component="mounting collars")
        add_torus("lower_mounting_collar", 0.06, 0.012, (0, 0, 2.55), p["metal"], component="mounting collars")
        add_rounded_box("dreamdrop_blade", (1.35, 0.055, 0.25), (0.42, 0, 2.75), p["green"], bevel=0.07, component="dreamdrop blade")
        add_rounded_box("centre_blade", (0.055, 1.35, 0.25), (0, 0.42, 2.56), p["green"], bevel=0.025, component="centre blade")
        add_rounded_box("blade_bracket_x", (0.16, 0.12, 0.08), (0, 0, 2.75), p["metal"], bevel=0.02, component="brackets")
        add_rounded_box("blade_bracket_y", (0.12, 0.16, 0.08), (0, 0, 2.56), p["metal"], bevel=0.02, component="brackets")
        add_text_mesh("dreamdrop_text", "DREAMDROP BLVD", (0.42, -0.034, 2.75), 0.12, 0.006, p["white"], component="street lettering")
        add_text_mesh("centre_text", "CENTRE AVE", (0.034, 0.42, 2.56), 0.12, 0.006, p["white"], rotation=(PI / 2, 0, PI / 2), component="street lettering")
        return

    add_rounded_box("perforated_post", (0.065, 0.065, 2.25), (0, 0, 1.15), p["metal_light"], bevel=0.012, component="perforated post")
    for index in range(10):
        add_cylinder("post_perforation", 0.009, 0.075, (0, -0.002, 0.35 + index * 0.18), p["black"], vertices=12, rotation=(PI / 2, 0, 0), component="perforated post", bevel=0.002)
    add_cylinder("footing_collar", 0.12, 0.16, (0, 0, 0.08), p["concrete"], component="footing collar")
    sign_z = 2.18
    add_octagonal_prism("octagonal_sign_face", 0.43, 0.035, (0, 0, sign_z), p["white"], component="octagonal sign face")
    add_octagonal_prism("red_inner_face", 0.385, 0.042, (0, -0.025, sign_z), p["paint_red"], component="white border")
    add_text_mesh("stop_lettering", "STOP", (0, -0.053, sign_z), 0.22, 0.009, p["white"], component="stop lettering")
    add_rounded_box("rear_bracket_upper", (0.18, 0.08, 0.06), (0, 0.045, sign_z + 0.18), p["metal"], bevel=0.012, component="rear brackets")
    add_rounded_box("rear_bracket_lower", (0.18, 0.08, 0.06), (0, 0.045, sign_z - 0.18), p["metal"], bevel=0.012, component="rear brackets")
    for z in (sign_z + 0.18, sign_z - 0.18):
        add_cylinder("mounting_bolt", 0.016, 0.09, (0, -0.055, z), p["metal_light"], vertices=10, rotation=(PI / 2, 0, 0), component="mounting bolts", bevel=0.003)


def build_district_sign(spec):
    p = default_palette(spec["town"])
    add_rounded_box("masonry_plinth", (3.6, 0.65, 0.55), (0, 0, 0.275), p["brick"], bevel=0.04, component="masonry plinth")
    add_rounded_box("left_pier", (0.52, 0.62, 1.55), (-1.48, 0, 0.88), p["brick"], bevel=0.035, component="side piers")
    add_rounded_box("right_pier", (0.52, 0.62, 1.55), (1.48, 0, 0.88), p["brick"], bevel=0.035, component="side piers")
    add_rounded_box("cap_stone", (3.75, 0.75, 0.18), (0, 0, 1.82), p["cream"], bevel=0.045, component="cap stone")
    add_rounded_box("inset_sign_panel", (2.55, 0.14, 0.82), (0, -0.36, 1.18), p["navy"], bevel=0.055, component="inset sign panel")
    add_rounded_box("border_trim", (2.72, 0.04, 0.99), (0, -0.445, 1.18), p["cream"], bevel=0.055, component="border trim")
    add_rounded_box("panel_overlay", (2.48, 0.025, 0.75), (0, -0.47, 1.18), p["navy"], bevel=0.045, component="inset sign panel")
    add_text_mesh("district_lettering", "DREAMDROP", (0, -0.505, 1.34), 0.30, 0.012, p["yellow"], component="raised lettering")
    add_text_mesh("district_subtitle", "DISTRICT", (0, -0.505, 1.04), 0.16, 0.008, p["white"], component="raised lettering")
    for x in (-1.0, 1.0):
        add_cylinder("uplight_fixture", 0.10, 0.13, (x, -0.48, 0.18), p["metal"], vertices=24, component="uplights")
        add_cylinder("uplight_lens", 0.075, 0.018, (x, -0.48, 0.255), p["warm_light"], vertices=24, component="uplights")


def build_fire_hydrant(spec):
    p = default_palette(spec["town"])
    red = p["paint_red"]
    add_cylinder("base_flange", 0.34, 0.09, (0, 0, 0.045), red, vertices=40, component="base flange")
    add_bolt_ring("base_bolt", 8, 0.265, 0.105, 0.022, 0.065, p["metal_light"], "eight base bolts")
    add_cone("main_barrel", 0.24, 0.19, 0.66, (0, 0, 0.43), red, vertices=40, component="main barrel")
    add_torus("lower_body_collar", 0.245, 0.035, (0, 0, 0.20), red, component="body collars")
    add_torus("upper_body_collar", 0.205, 0.03, (0, 0, 0.72), red, component="body collars")
    add_uv_sphere("domed_bonnet", 0.235, (0, 0, 0.82), red, scale=(1, 1, 0.62), component="domed bonnet", segments=40, rings=20)
    add_cylinder("bonnet_lower_ring", 0.225, 0.07, (0, 0, 0.75), red, vertices=40, component="domed bonnet")
    add_cylinder("operating_nut", 0.075, 0.11, (0, 0, 1.01), p["metal"], vertices=6, component="operating nut")

    for side, x in (("left", -0.29), ("right", 0.29)):
        add_cylinder(f"{side}_outlet_neck", 0.115, 0.20, (x, 0, 0.58), red, vertices=32, rotation=(0, PI / 2, 0), component=f"{side} hose outlet")
        add_torus(f"{side}_outlet_collar", 0.12, 0.022, (x * 1.15, 0, 0.58), red, rotation=(0, PI / 2, 0), component=f"{side} hose outlet")
        cap_x = x + (-0.12 if side == "left" else 0.12)
        add_cylinder(f"{side}_hose_cap", 0.118, 0.07, (cap_x, 0, 0.58), p["metal"], vertices=12, rotation=(0, PI / 2, 0), component="hose caps")
        add_cylinder(f"{side}_cap_nut", 0.055, 0.055, (cap_x + (-0.05 if side == "left" else 0.05), 0, 0.58), p["metal_light"], vertices=6, rotation=(0, PI / 2, 0), component="hose caps")
        chain_x = -0.20 if side == "left" else 0.20
        add_tube(f"{side}_cap_chain", [(chain_x, 0.11, 0.70), (cap_x, 0.12, 0.66), (cap_x, 0.10, 0.53)], 0.008, p["metal_light"], component="cap chains")


def build_utility_box(spec):
    p = default_palette(spec["town"])
    body_mat = make_material("utility_sage_paint", (0.28, 0.34, 0.29), metallic=0.52, roughness=0.42)
    add_rounded_box("concrete_pad", (1.08, 0.74, 0.12), (0, 0, 0.06), p["concrete"], bevel=0.025, component="concrete pad")
    add_rounded_box("cabinet_body", (0.95, 0.62, 1.33), (0, 0, 0.785), body_mat, bevel=0.045, component="cabinet body")
    add_rounded_box("service_door", (0.82, 0.035, 1.12), (0, -0.329, 0.80), body_mat, bevel=0.035, component="service door")
    add_cylinder("piano_hinge", 0.018, 0.95, (-0.40, -0.355, 0.82), p["metal"], vertices=16, component="hinge")
    add_rounded_box("recessed_latch", (0.08, 0.035, 0.18), (0.30, -0.37, 0.80), p["black"], bevel=0.018, component="recessed latch")
    add_rounded_box("warning_placard", (0.24, 0.018, 0.16), (0.16, -0.375, 1.15), p["yellow"], bevel=0.012, component="warning placard")
    for row_z in (0.43, 0.53, 1.08, 1.18):
        for index in range(5):
            add_rounded_box("vent_louver", (0.085, 0.025, 0.016), (-0.25 + index * 0.125, -0.37, row_z), p["black"], bevel=0.005, component="vent louvers")
    add_rounded_box("roof_drip_edge", (1.02, 0.70, 0.065), (0, 0, 1.48), body_mat, bevel=0.025, component="drip edge")
    for x in (-0.26, 0.26):
        add_cylinder("rear_conduit_entry", 0.055, 0.12, (x, 0.35, 0.28), p["black"], vertices=24, rotation=(PI / 2, 0, 0), component="conduit entries")
    add_bolt_ring("cabinet_anchor", 4, 0.41, 0.15, 0.018, 0.05, p["metal_light"], "anchor bolts")


def build_municipal_bench(spec):
    p = default_palette(spec["town"])
    wood = p.get("wood", p["metal_light"])
    frame = p["metal"]
    seat_z = 0.48
    for index in range(5):
        y = -0.24 + index * 0.12
        add_rounded_box("seat_slat", (1.72, 0.095, 0.055), (0, y, seat_z), wood, bevel=0.018, component="seat slats")
    for index in range(5):
        z = 0.68 + index * 0.115
        add_rounded_box("back_slat", (1.72, 0.055, 0.085), (0, 0.29, z), wood, bevel=0.018, rotation=(math.radians(-7), 0, 0), component="back slats")
    for side, x in (("left", -0.82), ("right", 0.82)):
        add_tube(f"{side}_side_frame", [(x, -0.30, 0.05), (x, -0.28, 0.42), (x, 0.18, 0.48), (x, 0.28, 1.15)], 0.035, frame, component=f"{side} side frame")
        add_tube(f"{side}_armrest", [(x, -0.24, 0.68), (x, 0.12, 0.68), (x, 0.22, 0.74)], 0.035, frame, component="armrests")
        add_rounded_box(f"{side}_foot_front", (0.12, 0.22, 0.055), (x, -0.24, 0.03), frame, bevel=0.015, component="anchored feet")
        add_rounded_box(f"{side}_foot_rear", (0.12, 0.22, 0.055), (x, 0.24, 0.03), frame, bevel=0.015, component="anchored feet")
    add_cylinder("rear_support_rail", 0.025, 1.62, (0, 0.31, 0.78), frame, vertices=20, rotation=(0, PI / 2, 0), component="rear support rails")
    add_cylinder("seat_support_rail", 0.025, 1.62, (0, 0, 0.40), frame, vertices=20, rotation=(0, PI / 2, 0), component="rear support rails")
    for x in (-0.72, 0, 0.72):
        for z in (0.45, 0.74, 1.05):
            add_cylinder("slat_mounting_bolt", 0.011, 0.025, (x, -0.305 if z < 0.55 else 0.315, z), p["metal_light"], vertices=10, rotation=(PI / 2, 0, 0), component="mounting bolts", bevel=0.002)
    add_tube("center_divider", [(0, -0.22, 0.49), (0, -0.02, 0.67), (0, 0.12, 0.68)], 0.025, frame, component="armrests")


def build_municipal_trash_can(spec):
    p = default_palette(spec["town"])
    radius = 0.34
    add_cylinder("internal_liner", 0.27, 0.88, (0, 0, 0.50), p["black"], vertices=40, component="internal liner")
    add_torus("bottom_support_ring", radius, 0.032, (0, 0, 0.13), p["metal"], component="bottom support ring")
    add_torus("top_support_ring", radius, 0.032, (0, 0, 0.93), p["metal"], component="top support ring")
    for index in range(20):
        angle = math.tau * index / 20
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        add_rounded_box("vertical_slat", (0.055, 0.04, 0.78), (x, y, 0.53), p["metal"], bevel=0.012, rotation=(0, 0, angle), component="vertical slats")
    add_uv_sphere("rain_hood", 0.37, (0, 0, 0.99), p["metal"], scale=(1, 1, 0.42), component="rain hood", segments=40, rings=18)
    add_rounded_box("disposal_opening", (0.37, 0.035, 0.25), (0, -0.35, 0.87), p["black"], bevel=0.07, component="disposal opening")
    add_rounded_box("service_door", (0.42, 0.025, 0.60), (0, 0.35, 0.46), p["metal"], bevel=0.04, component="service door")
    add_rounded_box("service_latch", (0.07, 0.035, 0.10), (0.13, 0.38, 0.48), p["metal_light"], bevel=0.016, component="latch")
    for index in range(4):
        a = math.tau * index / 4
        add_cylinder("base_anchor", 0.018, 0.05, (math.cos(a) * 0.26, math.sin(a) * 0.26, 0.04), p["metal_light"], vertices=10, component="base anchors", bevel=0.003)


def build_bollard(spec):
    p = default_palette(spec["town"])
    add_cylinder("anchored_base", 0.13, 0.08, (0, 0, 0.04), p["metal"], component="anchored base")
    add_cylinder("main_post", 0.09, 0.82, (0, 0, 0.47), p["metal"], component="main post")
    add_uv_sphere("cap", 0.095, (0, 0, 0.91), p["metal"], scale=(1, 1, 0.45), component="cap")
    add_torus("reflective_band", 0.093, 0.014, (0, 0, 0.72), p.get("yellow", p.get("cyan", p["metal_light"])), component="reflective band")
    add_bolt_ring("bollard_anchor", 4, 0.095, 0.085, 0.012, 0.04, p["metal_light"], "mounting hardware")


def build_planter(spec):
    p = default_palette(spec["town"])
    outer = p.get("concrete", p["metal"])
    soil = make_material("planter_soil", (0.12, 0.055, 0.022), roughness=0.95)
    leaf = make_material("planter_leaf", (0.06, 0.28, 0.09), roughness=0.72)
    add_rounded_box("outer_planter_body", (1.0, 1.0, 0.68), (0, 0, 0.34), outer, bevel=0.10, component="outer planter body")
    add_rounded_box("inner_soil_volume", (0.82, 0.82, 0.09), (0, 0, 0.70), soil, bevel=0.08, component="inner soil volume")
    add_torus("rim", 0.50, 0.04, (0, 0, 0.69), outer, component="rim")
    for index in range(3):
        a = math.tau * index / 3
        add_cylinder("drainage_detail", 0.018, 0.04, (math.cos(a) * 0.31, math.sin(a) * 0.31, 0.08), p["black"], vertices=12, rotation=(PI / 2, 0, 0), component="drainage detail")
    for index in range(9):
        angle = math.tau * index / 9
        r = 0.12 + 0.17 * (index % 3) / 2
        x, y = math.cos(angle) * r, math.sin(angle) * r
        add_tube("plant_stem", [(x, y, 0.73), (x * 1.1, y * 1.1, 0.95 + 0.05 * (index % 2))], 0.012, leaf, component="planting")
        add_uv_sphere("plant_leaf", 0.08, (x * 1.12, y * 1.12, 0.98 + 0.05 * (index % 2)), leaf, scale=(1.6, 0.55, 0.35), component="planting", segments=18, rings=10)


def build_mailbox(spec):
    p = default_palette(spec["town"])
    body = p.get("navy", p["metal"])
    add_rounded_box("post", (0.11, 0.11, 1.0), (0, 0, 0.50), p.get("wood", p["metal"]), bevel=0.018, component="post")
    add_rounded_box("cross_support", (0.42, 0.11, 0.11), (0.11, 0, 0.92), p.get("wood", p["metal"]), bevel=0.018, component="cross support")
    add_rounded_box("mailbox_lower_body", (0.38, 0.68, 0.25), (0.18, 0, 1.10), body, bevel=0.05, component="mailbox body")
    add_uv_sphere("curved_roof", 0.22, (0.18, 0, 1.26), body, scale=(0.86, 1.55, 0.60), component="curved roof", segments=32, rings=16)
    add_rounded_box("front_door", (0.34, 0.03, 0.28), (0.18, -0.355, 1.13), body, bevel=0.07, component="front door")
    add_rounded_box("door_handle", (0.09, 0.035, 0.035), (0.18, -0.39, 1.27), p["metal_light"], bevel=0.012, component="handle")
    add_rounded_box("signal_flag_stem", (0.035, 0.035, 0.36), (0.41, -0.08, 1.20), p.get("paint_red", p["metal_light"]), bevel=0.008, component="signal flag")
    add_rounded_box("signal_flag_plate", (0.12, 0.035, 0.10), (0.41, -0.08, 1.39), p.get("paint_red", p["metal_light"]), bevel=0.018, component="signal flag")


def build_guardrail(spec):
    p = default_palette(spec["town"])
    for index, x in enumerate((-1.8, -0.6, 0.6, 1.8)):
        add_rounded_box("support_post", (0.10, 0.14, 0.72), (x, 0, 0.36), p["metal_light"], bevel=0.012, component="support posts")
        add_rounded_box("spacer", (0.18, 0.22, 0.16), (x, -0.10, 0.58), p["metal"], bevel=0.018, component="spacers")
        add_cylinder("rail_fastener", 0.022, 0.10, (x, -0.23, 0.58), p["metal"], vertices=10, rotation=(PI / 2, 0, 0), component="fasteners", bevel=0.004)
    # Three overlapping strips create a readable corrugated W-beam silhouette.
    add_rounded_box("rail_beam_center", (4.0, 0.065, 0.18), (0, -0.24, 0.58), p["metal_light"], bevel=0.025, component="rail beam")
    add_rounded_box("rail_beam_upper", (4.0, 0.055, 0.10), (0, -0.275, 0.69), p["metal_light"], bevel=0.022, rotation=(math.radians(8), 0, 0), component="rail beam")
    add_rounded_box("rail_beam_lower", (4.0, 0.055, 0.10), (0, -0.275, 0.47), p["metal_light"], bevel=0.022, rotation=(math.radians(-8), 0, 0), component="rail beam")
    add_rounded_box("end_treatment_left", (0.36, 0.28, 0.44), (-2.12, -0.16, 0.48), p["metal_light"], bevel=0.11, component="end treatment")
    add_rounded_box("end_treatment_right", (0.36, 0.28, 0.44), (2.12, -0.16, 0.48), p["metal_light"], bevel=0.11, component="end treatment")


def build_storm_drain(spec):
    p = default_palette(spec["town"])
    add_rounded_box("curb_section", (1.2, 0.32, 0.30), (0, 0.16, 0.15), p["concrete"], bevel=0.025, component="curb section")
    add_rounded_box("gutter_channel", (1.2, 0.33, 0.08), (0, -0.16, 0.04), p["concrete"], bevel=0.018, rotation=(math.radians(-2), 0, 0), component="gutter channel")
    add_rounded_box("drain_opening", (0.78, 0.06, 0.18), (0, -0.02, 0.13), p["black"], bevel=0.02, component="drain opening")
    add_rounded_box("grate_frame", (0.82, 0.36, 0.045), (0, -0.20, 0.085), p["metal"], bevel=0.018, component="frame")
    for index in range(9):
        x = -0.34 + index * 0.085
        add_rounded_box("grate_bar", (0.035, 0.30, 0.025), (x, -0.20, 0.115), p["metal_light"], bevel=0.006, component="metal grate")


def build_picnic_table(spec):
    p = default_palette(spec["town"])
    wood = p.get("wood", p["metal_light"])
    frame = p["metal"]
    for index in range(6):
        y = -0.32 + index * 0.13
        add_rounded_box("tabletop_board", (1.80, 0.11, 0.055), (0, y, 0.76), wood, bevel=0.016, component="tabletop boards")
    for side, y in (("left", -0.72), ("right", 0.72)):
        for index in range(3):
            add_rounded_box("seat_board", (1.80, 0.11, 0.055), (0, y + (index - 1) * 0.105, 0.43), wood, bevel=0.016, component="seat boards")
    for x in (-0.62, 0.62):
        add_tube("load_bearing_frame", [(x, -0.75, 0.06), (x, -0.38, 0.75), (x, 0.38, 0.75), (x, 0.75, 0.06)], 0.035, frame, component="load-bearing frame")
        add_tube("cross_brace", [(x, -0.58, 0.28), (x, 0.58, 0.58)], 0.024, frame, component="cross braces")
        add_tube("cross_brace", [(x, 0.58, 0.28), (x, -0.58, 0.58)], 0.024, frame, component="cross braces")
    for x in (-0.72, 0.72):
        for y in (-0.72, 0.72):
            add_rounded_box("foot", (0.18, 0.18, 0.05), (x, y, 0.025), frame, bevel=0.014, component="feet")
    for x in (-0.62, 0.62):
        for y in (-0.30, 0.30):
            add_cylinder("fastener", 0.012, 0.07, (x, y, 0.80), p["metal_light"], vertices=10, component="fasteners", bevel=0.002)


def build_pallet_stack(spec):
    p = default_palette(spec["town"])
    wood = p.get("wood", p["metal_light"])
    for layer in range(3):
        z0 = 0.06 + layer * 0.20
        for index in range(6):
            y = -0.42 + index * 0.168
            add_rounded_box("top_deck_board", (1.2, 0.13, 0.045), (0.02 * (layer % 2), y, z0 + 0.11), wood, bevel=0.009, component="top deck boards")
        for y in (-0.37, 0, 0.37):
            add_rounded_box("stringer", (1.12, 0.11, 0.095), (0.02 * (layer % 2), y, z0 + 0.035), wood, bevel=0.01, component="stringers")
        for index in range(4):
            y = -0.36 + index * 0.24
            add_rounded_box("bottom_deck_board", (1.12, 0.095, 0.035), (0.02 * (layer % 2), y, z0 - 0.035), wood, bevel=0.008, component="bottom deck boards")
    add_rounded_box("fork_spacing_marker", (0.38, 0.96, 0.03), (0, 0, 0.035), p["black"], bevel=0.005, component="spacing gaps")
    add_rounded_box("stack_offset_marker", (1.22, 1.02, 0.025), (0.02, 0, 0.61), wood, bevel=0.006, component="stack offsets")


def build_loading_crate(spec):
    p = default_palette(spec["town"])
    wood = p.get("wood", p["metal_light"])
    add_rounded_box("crate_front", (0.96, 0.06, 0.78), (0, -0.45, 0.51), wood, bevel=0.015, component="crate panels")
    add_rounded_box("crate_back", (0.96, 0.06, 0.78), (0, 0.45, 0.51), wood, bevel=0.015, component="crate panels")
    add_rounded_box("crate_left", (0.06, 0.78, 0.78), (-0.52, 0, 0.51), wood, bevel=0.015, component="crate panels")
    add_rounded_box("crate_right", (0.06, 0.78, 0.78), (0.52, 0, 0.51), wood, bevel=0.015, component="crate panels")
    add_rounded_box("crate_top", (1.1, 0.9, 0.06), (0, 0, 0.93), wood, bevel=0.015, component="crate panels")
    for x in (-0.52, 0.52):
        for y in (-0.45, 0.45):
            add_rounded_box("corner_frame", (0.10, 0.10, 0.92), (x, y, 0.49), p["metal"], bevel=0.015, component="corner frame")
    for x in (-0.34, 0.34):
        add_rounded_box("base_skid", (0.18, 1.0, 0.10), (x, 0, 0.05), wood, bevel=0.016, component="base skids")
    for x in (-0.43, 0.43):
        for z in (0.25, 0.74):
            add_cylinder("fastener", 0.015, 0.08, (x, -0.49, z), p["metal_light"], vertices=10, rotation=(PI / 2, 0, 0), component="fasteners", bevel=0.003)
    add_text_mesh("handling_marking", "THIS SIDE UP", (0, -0.495, 0.50), 0.11, 0.004, p["black"], component="handling markings")


def build_bus_shelter(spec):
    p = default_palette(spec["town"])
    frame = p["metal"]
    glass = p["glass"]
    for x in (-1.45, 1.45):
        for y in (-0.58, 0.58):
            add_rounded_box("foundation_pad", (0.22, 0.22, 0.08), (x, y, 0.04), p["concrete"], bevel=0.025, component="foundation pads")
            add_rounded_box("structural_post", (0.09, 0.09, 2.25), (x, y, 1.16), frame, bevel=0.018, component="structural frame")
    add_rounded_box("roof", (3.2, 1.5, 0.15), (0, 0, 2.40), frame, bevel=0.08, component="roof")
    add_rounded_box("back_weather_panel", (2.75, 0.035, 1.75), (0, 0.58, 1.34), glass, bevel=0.035, component="weather panels")
    add_rounded_box("left_weather_panel", (0.035, 1.05, 1.75), (-1.45, 0.05, 1.34), glass, bevel=0.025, component="weather panels")
    add_rounded_box("bench_seat", (2.25, 0.42, 0.10), (0, 0.18, 0.52), p.get("wood", frame), bevel=0.04, component="bench")
    add_rounded_box("bench_back", (2.25, 0.09, 0.65), (0, 0.39, 0.90), p.get("wood", frame), bevel=0.04, component="bench")
    add_rounded_box("route_panel", (0.52, 0.055, 1.10), (1.1, 0.53, 1.40), p.get("navy", frame), bevel=0.04, component="route panel")
    add_text_mesh("route_text", "BUS\nDREAMDROP", (1.1, 0.495, 1.42), 0.11, 0.006, p["white"], component="route panel")
    add_rounded_box("lighting_strip", (2.4, 0.18, 0.035), (0, 0, 2.30), p.get("warm_light", p["white"]), bevel=0.012, component="lighting")


def build_charging_pad(spec):
    p = default_palette(spec["town"])
    accent = p.get("cyan", p.get("yellow", p["metal_light"]))
    add_rounded_box("ground_pad", (2.8, 5.2, 0.14), (0, 0, 0.07), p["concrete"], bevel=0.12, component="ground pad")
    add_rounded_box("protective_edging", (2.95, 5.35, 0.08), (0, 0, 0.12), p["metal"], bevel=0.11, component="protective edging")
    add_rounded_box("pad_inner", (2.68, 5.08, 0.045), (0, 0, 0.19), p["black"], bevel=0.10, component="ground pad")
    for x in (-0.95, 0.95):
        add_rounded_box("alignment_marking", (0.08, 3.8, 0.015), (x, 0, 0.225), accent, bevel=0.02, component="alignment markings")
    for y in (-1.6, -0.8, 0, 0.8, 1.6):
        add_torus("induction_array", 0.38, 0.035, (0, y, 0.235), accent, component="connector or induction array")
    add_rounded_box("power_module", (0.55, 0.42, 1.05), (1.25, 2.15, 0.62), p["metal"], bevel=0.07, component="power module")
    add_rounded_box("status_screen", (0.34, 0.025, 0.28), (1.25, 1.925, 0.78), accent, bevel=0.03, component="status lights")
    for index in range(4):
        add_cylinder("pad_anchor", 0.018, 0.05, ((-1.25 if index % 2 == 0 else 1.25), (-2.35 if index < 2 else 2.35), 0.20), p["metal_light"], vertices=10, component="protective edging", bevel=0.003)


def build_fuel_pump(spec):
    p = default_palette(spec["town"])
    accent = p.get("cyan", p.get("yellow", p["metal_light"]))
    add_rounded_box("anchored_pedestal", (0.82, 0.58, 0.14), (0, 0, 0.07), p["concrete"], bevel=0.06, component="anchored pedestal")
    add_rounded_box("pump_cabinet", (0.72, 0.48, 1.75), (0, 0, 1.00), p["metal"], bevel=0.08, component="cabinet")
    add_rounded_box("protective_trim", (0.80, 0.56, 0.16), (0, 0, 1.82), p["metal_light"], bevel=0.06, component="protective trim")
    add_rounded_box("display", (0.42, 0.025, 0.34), (0, -0.255, 1.35), accent, bevel=0.035, component="display")
    add_rounded_box("payment_terminal", (0.25, 0.04, 0.22), (0, -0.27, 0.95), p["black"], bevel=0.03, component="payment terminal")
    add_rounded_box("service_panel", (0.48, 0.025, 0.52), (0, 0.255, 0.82), p["metal_light"], bevel=0.035, component="service panel")
    add_tube("hose", [(0.32, 0.23, 1.62), (0.52, 0.26, 1.25), (0.50, 0.24, 0.66), (0.35, 0.16, 0.55)], 0.022, p.get("rubber", p["black"]), component="hose")
    add_rounded_box("nozzle_handle", (0.12, 0.08, 0.30), (0.34, -0.30, 0.65), p["black"], bevel=0.035, rotation=(0, math.radians(8), 0), component="nozzle")
    add_cylinder("nozzle_spout", 0.018, 0.24, (0.34, -0.32, 0.86), p["metal_light"], vertices=16, rotation=(math.radians(12), 0, 0), component="nozzle", bevel=0.003)
    for index in range(5):
        add_rounded_box("vent_slot", (0.075, 0.025, 0.018), (-0.20 + index * 0.10, 0.27, 1.48), p["black"], bevel=0.005, component="service panel")


def build_digital_kiosk(spec):
    p = default_palette(spec["town"])
    accent = p.get("cyan", p.get("warm_light", p["white"]))
    add_rounded_box("anchored_base", (0.72, 0.55, 0.14), (0, 0, 0.07), p["metal"], bevel=0.09, component="anchored base")
    add_rounded_box("structural_body", (0.58, 0.42, 1.55), (0, 0, 0.91), p["metal"], bevel=0.10, component="structural body")
    add_rounded_box("screen_bezel", (0.52, 0.055, 0.78), (0, -0.24, 1.22), p["black"], bevel=0.06, component="protective bezel")
    add_rounded_box("screen", (0.43, 0.025, 0.66), (0, -0.285, 1.22), accent, bevel=0.04, component="screen")
    add_rounded_box("input_area", (0.40, 0.16, 0.14), (0, -0.25, 0.72), p["metal_light"], bevel=0.035, component="input area")
    add_rounded_box("service_panel", (0.42, 0.025, 0.40), (0, 0.225, 0.55), p["metal_light"], bevel=0.035, component="service panel")
    for index in range(5):
        add_rounded_box("ventilation_slot", (0.055, 0.025, 0.015), (-0.14 + index * 0.07, 0.23, 1.18), p["black"], bevel=0.004, component="ventilation")


def build_hologram_billboard(spec):
    p = default_palette(spec["town"])
    accent = p.get("cyan", p.get("warm_light", p["white"]))
    add_rounded_box("foundation", (3.3, 0.7, 0.18), (0, 0, 0.09), p["concrete"], bevel=0.07, component="foundation or wall mount")
    for x in (-1.35, 1.35):
        add_rounded_box("support_post", (0.16, 0.20, 2.45), (x, 0, 1.31), p["metal"], bevel=0.035, component="support frame")
        add_rounded_box("service_access", (0.22, 0.03, 0.42), (x, 0.12, 0.62), p["metal_light"], bevel=0.03, component="service access")
    add_rounded_box("display_frame", (3.55, 0.18, 1.72), (0, 0, 2.05), p["metal"], bevel=0.10, component="support frame")
    add_rounded_box("display_plane", (3.28, 0.025, 1.45), (0, -0.115, 2.05), accent, bevel=0.075, component="display plane")
    for x in (-1.25, -0.42, 0.42, 1.25):
        add_cylinder("emitter_hardware", 0.07, 0.20, (x, -0.12, 1.17), p["metal_light"], vertices=24, rotation=(PI / 2, 0, 0), component="projector or emitter hardware")
    add_tube("cable_routing", [(-1.35, 0.10, 0.55), (-1.35, 0.15, 1.6), (-0.6, 0.16, 1.72)], 0.025, p["black"], component="cable routing")


def build_office_desk(spec):
    p = default_palette(spec["town"])
    top_mat = p.get("metal_light", p["metal"])
    add_rounded_box("work_surface", (1.65, 0.78, 0.075), (0, 0, 0.74), top_mat, bevel=0.045, component="work surface")
    for x in (-0.72, 0.72):
        add_rounded_box("load_bearing_leg", (0.12, 0.62, 0.70), (x, 0, 0.36), p["metal"], bevel=0.025, component="load-bearing legs or pedestal")
        add_rounded_box("floor_glide", (0.20, 0.68, 0.045), (x, 0, 0.03), p["black"], bevel=0.018, component="load-bearing legs or pedestal")
    add_rounded_box("storage_drawer", (0.42, 0.62, 0.40), (0.47, 0, 0.30), p["metal"], bevel=0.045, component="storage")
    for z in (0.22, 0.34, 0.46):
        add_rounded_box("drawer_front", (0.35, 0.035, 0.095), (0.47, -0.33, z), p["metal_light"], bevel=0.018, component="storage")
    add_rounded_box("edge_trim", (1.68, 0.035, 0.09), (0, -0.405, 0.74), p.get("cyan", p["metal"]), bevel=0.018, component="edge trim")
    add_rounded_box("cable_tray", (0.82, 0.16, 0.08), (0, 0.27, 0.61), p["black"], bevel=0.025, component="cable management")
    add_cylinder("cable_grommet", 0.045, 0.08, (-0.48, 0.20, 0.78), p["black"], vertices=24, component="cable management")
    add_rounded_box("equipment_clearance", (0.52, 0.55, 0.02), (-0.20, 0, 0.10), p["black"], bevel=0.005, component="equipment clearance")


def build_multi_monitor(spec):
    p = default_palette(spec["town"])
    accent = p.get("cyan", p.get("warm_light", p["white"]))
    add_rounded_box("mounting_base", (0.72, 0.42, 0.07), (0, 0, 0.035), p["metal"], bevel=0.04, component="desk or mounting base")
    add_cylinder("central_monitor_post", 0.045, 0.72, (0, 0, 0.42), p["metal"], vertices=24, component="monitor arms")
    for index, x in enumerate((-0.48, 0, 0.48)):
        add_tube("monitor_arm", [(0, 0, 0.62), (x * 0.60, 0, 0.72), (x, 0, 0.76)], 0.022, p["metal_light"], component="monitor arms")
        add_rounded_box("rear_housing", (0.46, 0.08, 0.30), (x, 0, 0.82), p["black"], bevel=0.035, component="rear housings")
        add_rounded_box("display_bezel", (0.43, 0.035, 0.27), (x, -0.055, 0.82), p["metal"], bevel=0.03, component="bezels")
        add_rounded_box("display", (0.38, 0.018, 0.22), (x, -0.082, 0.82), accent, bevel=0.022, component="multiple displays")
        add_tube("monitor_cable", [(x, 0.05, 0.67), (x * 0.5, 0.12, 0.42), (0, 0.10, 0.18)], 0.009, p["black"], component="cables")
    add_rounded_box("keyboard", (0.54, 0.20, 0.035), (0, -0.34, 0.10), p["black"], bevel=0.025, component="input devices")
    add_rounded_box("mouse", (0.10, 0.15, 0.04), (0.38, -0.34, 0.11), p["black"], bevel=0.035, component="input devices")


def build_restaurant_booth(spec):
    p = default_palette(spec["town"])
    upholstery = p.get("magenta", p.get("navy", p["metal"]))
    table_mat = p.get("metal_light", p["metal"])
    for side, y in (("front", -0.67), ("back", 0.67)):
        add_rounded_box("seat_base", (1.75, 0.50, 0.36), (0, y, 0.25), p["black"], bevel=0.08, component="seat bases")
        add_rounded_box("upholstered_cushion", (1.65, 0.45, 0.16), (0, y, 0.50), upholstery, bevel=0.10, component="upholstered cushions")
        add_rounded_box("backrest", (1.70, 0.22, 0.82), (0, y + (0.20 if side == "front" else -0.20), 0.90), upholstery, bevel=0.12, rotation=(math.radians(4 if side == "front" else -4), 0, 0), component="backrests")
        for x in (-0.56, 0, 0.56):
            add_rounded_box("upholstery_seam", (0.025, 0.235, 0.66), (x, y + (0.315 if side == "front" else -0.315), 0.90), p["black"], bevel=0.006, component="seams")
        for x in (-0.72, 0.72):
            add_rounded_box("floor_glide", (0.12, 0.16, 0.04), (x, y, 0.02), p["black"], bevel=0.014, component="floor glides")
    add_rounded_box("tabletop", (1.55, 0.76, 0.07), (0, 0, 0.76), table_mat, bevel=0.055, component="tabletop")
    add_cylinder("table_pedestal", 0.075, 0.66, (0, 0, 0.39), p["metal"], vertices=28, component="table pedestal")
    add_rounded_box("table_base", (0.62, 0.42, 0.06), (0, 0, 0.03), p["metal"], bevel=0.06, component="table pedestal")


def build_classroom_desk(spec):
    p = default_palette(spec["town"])
    accent = p.get("cyan", p.get("wood", p["metal_light"]))
    add_rounded_box("work_surface", (0.72, 0.52, 0.055), (0, 0, 0.72), accent, bevel=0.045, component="work surface")
    for x in (-0.29, 0.29):
        for y in (-0.20, 0.20):
            add_rounded_box("leg", (0.045, 0.045, 0.67), (x, y, 0.34), p["metal"], bevel=0.012, component="legs")
            add_rounded_box("floor_glide", (0.075, 0.075, 0.025), (x, y, 0.015), p["black"], bevel=0.012, component="feet")
    add_rounded_box("modesty_panel", (0.60, 0.035, 0.24), (0, 0.22, 0.48), p["metal_light"], bevel=0.025, component="storage shelf or modesty panel")
    add_rounded_box("under_shelf", (0.58, 0.30, 0.035), (0, 0.05, 0.45), p["metal"], bevel=0.018, component="storage shelf or modesty panel")
    for x in (-0.29, 0.29):
        add_cylinder("fastener", 0.010, 0.06, (x, -0.235, 0.72), p["metal_light"], vertices=10, rotation=(PI / 2, 0, 0), component="fasteners", bevel=0.002)


def build_modern_bed(spec):
    p = default_palette(spec["town"])
    fabric = p.get("navy", p.get("metal_light", p["metal"]))
    sheet = make_material("bed_sheet", (0.56, 0.60, 0.66), roughness=0.72)
    pillow = make_material("bed_pillow", (0.82, 0.84, 0.88), roughness=0.76)
    add_rounded_box("bed_frame", (1.65, 2.10, 0.22), (0, 0, 0.24), p["metal"], bevel=0.08, component="bed frame")
    for x in (-0.70, 0.70):
        for y in (-0.92, 0.92):
            add_rounded_box("support_leg", (0.10, 0.10, 0.24), (x, y, 0.12), p["metal"], bevel=0.025, component="support legs")
    add_rounded_box("mattress", (1.56, 2.00, 0.28), (0, 0, 0.48), sheet, bevel=0.14, component="mattress")
    add_rounded_box("headboard", (1.68, 0.18, 0.95), (0, 0.98, 0.84), fabric, bevel=0.12, component="headboard")
    for x in (-0.42, 0.42):
        add_rounded_box("pillow", (0.65, 0.42, 0.16), (x, 0.63, 0.72), pillow, bevel=0.14, rotation=(math.radians(-5), 0, 0), component="pillows")
    add_rounded_box("duvet", (1.50, 1.25, 0.12), (0, -0.28, 0.70), fabric, bevel=0.10, component="blanket or duvet")
    for x in (-0.52, 0, 0.52):
        add_rounded_box("duvet_seam", (0.025, 1.15, 0.025), (x, -0.28, 0.775), p["black"], bevel=0.006, component="blanket or duvet")


def build_wall_screen(spec):
    p = default_palette(spec["town"])
    accent = p.get("cyan", p.get("warm_light", p["white"]))
    add_rounded_box("mounting_bracket", (0.58, 0.06, 0.34), (0, 0.08, 0.34), p["metal"], bevel=0.035, component="mounting bracket")
    add_rounded_box("rear_housing", (1.20, 0.11, 0.72), (0, 0, 0.36), p["black"], bevel=0.07, component="rear housing")
    add_rounded_box("protective_bezel", (1.14, 0.035, 0.66), (0, -0.075, 0.36), p["metal"], bevel=0.055, component="protective bezel")
    add_rounded_box("screen_panel", (1.04, 0.018, 0.56), (0, -0.102, 0.36), accent, bevel=0.035, component="screen panel")
    add_cylinder("status_light", 0.014, 0.018, (0.49, -0.12, 0.08), accent, vertices=16, rotation=(PI / 2, 0, 0), component="status light", bevel=0.002)
    add_rounded_box("power_channel", (0.08, 0.045, 0.42), (0.43, 0.08, -0.08), p["metal"], bevel=0.018, component="cable or power channel")


def _hover_pod(x, y, z, p, component):
    add_rounded_box("hover_pod_mount", (0.62, 0.78, 0.22), (x, y, z + 0.12), p["metal"], bevel=0.16, component=component)
    add_torus("hover_lift_ring", 0.28, 0.045, (x, y, z), p["cyan"], component="underbody lift rings")
    add_cylinder("hover_emitter_core", 0.18, 0.09, (x, y, z), p["black"], vertices=32, component="underbody lift rings")
    for index in range(4):
        a = math.tau * index / 4
        add_rounded_box("pod_service_fastener", (0.045, 0.07, 0.045), (x + math.cos(a) * 0.23, y + math.sin(a) * 0.23, z + 0.12), p["metal_light"], bevel=0.012, component="service panels")


def build_hover_vehicle(spec):
    p = default_palette("techtown")
    coupe = _variant(spec, "coupe")
    length = 4.35 if coupe else 4.65
    width = 2.12 if coupe else 2.05
    height = 1.24 if coupe else 1.48
    body_z = 0.62

    add_rounded_box("lower_chassis", (width * 0.92, length * 0.82, 0.38), (0, 0, body_z), p["metal"], bevel=0.20, component="lower chassis")
    add_rounded_box("central_spine", (0.38, length * 0.72, 0.34), (0, 0.02, body_z + 0.20), p["metal_light"], bevel=0.12, component="central spine")
    add_rounded_box("front_crash_structure", (width * 0.76, 0.72, 0.33), (0, -length * 0.41, body_z + 0.05), p["metal"], bevel=0.20, component="front crash structure")
    add_rounded_box("aerodynamic_nose", (width * 0.80, 0.82, 0.28), (0, -length * 0.46, body_z + 0.22), p["metal"], bevel=0.22, rotation=(math.radians(-5), 0, 0), component="aerodynamic nose")
    add_rounded_box("rear_power_module", (width * 0.82, 0.82, 0.48), (0, length * 0.38, body_z + 0.20), p["metal"], bevel=0.18, component="rear power module")

    cabin_length = 1.75 if coupe else 2.25
    cabin_z = height * 0.63
    add_rounded_box("passenger_cabin", (width * 0.76, cabin_length, height * 0.58), (0, 0.02, cabin_z), p["glass"], bevel=0.28, component="two-seat cabin" if coupe else "passenger cabin")
    add_rounded_box("windshield", (width * 0.67, 0.08, height * 0.35), (0, -cabin_length * 0.49, cabin_z + 0.05), p["glass"], bevel=0.05, rotation=(math.radians(18), 0, 0), component="windshield")
    add_rounded_box("rear_glass", (width * 0.64, 0.07, height * 0.28), (0, cabin_length * 0.49, cabin_z + 0.02), p["glass"], bevel=0.05, rotation=(math.radians(-18), 0, 0), component="side windows")

    door_y_positions = (-0.42, 0.42) if not coupe else (0.0,)
    for side, x in (("left", -width * 0.405), ("right", width * 0.405)):
        for door_index, y in enumerate(door_y_positions):
            add_rounded_box("door_panel", (0.055, 0.82 if not coupe else 1.25, 0.54), (x, y, body_z + 0.38), p["metal"], bevel=0.07, component="four doors" if not coupe else "two doors")
            add_rounded_box("door_handle", (0.035, 0.18, 0.045), (x + (-0.035 if side == "left" else 0.035), y - 0.20, body_z + 0.45), p["metal_light"], bevel=0.016, component="door handles")
        add_rounded_box("side_window", (0.035, cabin_length * 0.78, height * 0.30), (x, 0.01, cabin_z + 0.07), p["glass"], bevel=0.07, component="side windows")
        add_rounded_box("camera_mirror", (0.13, 0.22, 0.10), (x + (-0.12 if side == "left" else 0.12), -cabin_length * 0.35, cabin_z + 0.12), p["black"], bevel=0.055, component="service panels")
        add_rounded_box("side_intake", (0.05, 0.65, 0.18), (x + (-0.04 if side == "left" else 0.04), length * 0.24, body_z + 0.18), p["black"], bevel=0.05, component="side intakes")

    pod_x = width * 0.46
    pod_y = length * 0.31
    _hover_pod(-pod_x, -pod_y, 0.26, p, "front hover pods")
    _hover_pod(pod_x, -pod_y, 0.26, p, "front hover pods")
    _hover_pod(-pod_x, pod_y, 0.26, p, "rear hover pods")
    _hover_pod(pod_x, pod_y, 0.26, p, "rear hover pods")

    for x in (-width * 0.28, width * 0.28):
        add_rounded_box("front_light", (0.28, 0.035, 0.11), (x, -length * 0.505, body_z + 0.25), p["white"], bevel=0.04, component="front lights")
        add_rounded_box("rear_light", (0.28, 0.035, 0.10), (x, length * 0.505, body_z + 0.28), p["red_light"], bevel=0.04, component="rear lights")
    for x in (-width * 0.26, width * 0.26):
        add_rounded_box("intake_grille", (0.32, 0.035, 0.14), (x, -length * 0.505, body_z + 0.06), p["black"], bevel=0.035, component="intake grilles")
        for index in range(4):
            add_rounded_box("cooling_channel", (0.025, 0.05, 0.11), (x - 0.10 + index * 0.065, -length * 0.525, body_z + 0.06), p["metal_light"], bevel=0.006, component="cooling channels")
    add_rounded_box("charging_port", (0.04, 0.18, 0.15), (width * 0.45, length * 0.12, body_z + 0.20), p["cyan"], bevel=0.035, component="charging port" if not coupe else "charging connector")
    add_rounded_box("front_service_panel", (width * 0.55, 0.035, 0.18), (0, -length * 0.35, body_z + 0.45), p["metal_light"], bevel=0.055, component="service panels")
    add_rounded_box("rear_service_panel", (width * 0.55, 0.035, 0.20), (0, length * 0.36, body_z + 0.52), p["metal_light"], bevel=0.055, component="service panels")


BUILDERS = {
    "streetlight": build_streetlight,
    "traffic_light": build_traffic_light,
    "road_sign": build_road_sign,
    "district_sign": build_district_sign,
    "fire_hydrant": build_fire_hydrant,
    "utility_box": build_utility_box,
    "municipal_bench": build_municipal_bench,
    "municipal_trash_can": build_municipal_trash_can,
    "bollard": build_bollard,
    "planter": build_planter,
    "mailbox": build_mailbox,
    "guardrail": build_guardrail,
    "storm_drain": build_storm_drain,
    "picnic_table": build_picnic_table,
    "pallet_stack": build_pallet_stack,
    "loading_crate": build_loading_crate,
    "bus_shelter": build_bus_shelter,
    "charging_pad": build_charging_pad,
    "fuel_pump": build_fuel_pump,
    "digital_kiosk": build_digital_kiosk,
    "hologram_billboard": build_hologram_billboard,
    "office_desk": build_office_desk,
    "multi_monitor": build_multi_monitor,
    "restaurant_booth": build_restaurant_booth,
    "classroom_desk": build_classroom_desk,
    "modern_bed": build_modern_bed,
    "wall_screen": build_wall_screen,
    "hover_vehicle": build_hover_vehicle,
}
