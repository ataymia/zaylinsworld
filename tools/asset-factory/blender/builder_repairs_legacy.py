import math

from common import add_cylinder, add_rounded_box, add_torus, add_tube
from builder_repair_utils import PI, _component_details, _detail_materials, _dims

def build_streetlight_fixed(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (2.2, 0.6, 6.5))
    pole_h = height * 0.82
    add_cylinder("base_flange", min(width, depth) * 0.30, height * 0.018, (0, 0, height * 0.009), mats[0], vertices=20, component="base flange", bevel=0.006)
    for index in range(4):
        angle = math.tau * index / 4
        add_cylinder("anchor_bolt", 0.018, 0.055, (math.cos(angle) * 0.16, math.sin(angle) * 0.16, 0.055), mats[1], vertices=8, component="anchor bolts", bevel=0.002)
    add_cylinder("pole", min(width, depth) * 0.12, pole_h, (0, 0, pole_h / 2 + 0.04), mats[0], vertices=20, component="pole", bevel=0.008)
    add_rounded_box("maintenance_access", (0.14, 0.035, 0.34), (0, -min(width, depth) * 0.13, height * 0.18), mats[1], bevel=0.012, component="maintenance access")
    arm_z = height * 0.88
    add_tube("support_arm", [(0, 0, arm_z), (width * 0.18, 0, height * 0.96), (width * 0.42, 0, height * 0.96)], max(0.025, depth * 0.07), mats[0], component="support arm", resolution=2)
    add_rounded_box("luminaire_housing", (width * 0.28, depth * 0.54, height * 0.045), (width * 0.43, 0, height * 0.95), mats[2], bevel=0.025, component="luminaire housing")
    add_rounded_box("lens", (width * 0.22, depth * 0.40, height * 0.012), (width * 0.43, 0, height * 0.925), mats[4], bevel=0.009, component="lens")


def build_road_sign_fixed(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (1.1, 0.2, 2.8))
    post_h = height * 0.78
    add_rounded_box("support_post", (width * 0.08, max(0.05, depth * 0.36), post_h), (0, 0, post_h / 2), mats[1], bevel=0.012, component="support post")
    face_z = height * 0.78
    add_rounded_box("sign_face", (width * 0.86, max(0.035, depth * 0.22), height * 0.28), (0, -depth * 0.18, face_z), mats[3], bevel=0.045, component="sign face")
    add_rounded_box("border", (width * 0.78, max(0.018, depth * 0.10), height * 0.21), (0, -depth * 0.32, face_z), mats[4], bevel=0.035, component="border or lettering")
    add_rounded_box("inner_panel", (width * 0.66, max(0.012, depth * 0.06), height * 0.14), (0, -depth * 0.39, face_z), mats[2], bevel=0.025, component="border or lettering")
    for z in (face_z - height * 0.06, face_z + height * 0.06):
        add_rounded_box("mounting_bracket", (width * 0.22, depth * 0.32, height * 0.025), (0, 0, z), mats[0], bevel=0.008, component="mounting brackets")
        add_cylinder("fastener", max(0.01, width * 0.015), max(0.04, depth * 0.46), (0, -depth * 0.08, z), mats[1], vertices=8, rotation=(PI / 2, 0, 0), component="fasteners", bevel=0.002)
    add_cylinder("footing", width * 0.10, height * 0.05, (0, 0, height * 0.025), p.get("concrete", mats[0]), vertices=16, component="support post", bevel=0.006)


def build_mailbox_fixed(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (0.45, 0.75, 1.25))
    add_rounded_box("post", (width * 0.22, width * 0.22, height * 0.72), (0, 0, height * 0.36), mats[0], bevel=0.018, component="post")
    add_rounded_box("cross_support", (width * 0.80, width * 0.22, height * 0.09), (width * 0.16, 0, height * 0.68), mats[0], bevel=0.018, component="cross support")
    body_z = height * 0.84
    add_rounded_box("mailbox_body", (width * 0.86, depth * 0.88, height * 0.22), (width * 0.17, 0, body_z), mats[2], bevel=0.045, component="mailbox body")
    add_rounded_box("curved_roof", (width * 0.86, depth * 0.88, height * 0.16), (width * 0.17, 0, body_z + height * 0.16), mats[2], bevel=height * 0.075, component="curved roof")
    add_rounded_box("front_door", (width * 0.76, depth * 0.035, height * 0.27), (width * 0.17, -depth * 0.46, body_z + height * 0.02), mats[3], bevel=0.035, component="front door")
    add_rounded_box("handle", (width * 0.24, depth * 0.04, height * 0.035), (width * 0.17, -depth * 0.49, body_z + height * 0.14), mats[1], bevel=0.008, component="handle")
    add_rounded_box("flag_stem", (width * 0.07, depth * 0.05, height * 0.30), (width * 0.63, -depth * 0.12, body_z + height * 0.09), mats[4], bevel=0.006, component="signal flag")
    add_rounded_box("flag_plate", (width * 0.25, depth * 0.05, height * 0.08), (width * 0.63, -depth * 0.12, body_z + height * 0.27), mats[4], bevel=0.012, component="signal flag")
    add_cylinder("rear_hinge", width * 0.035, width * 0.72, (width * 0.17, depth * 0.44, body_z), mats[1], vertices=10, rotation=(0, PI / 2, 0), component="front door", bevel=0.002)


def build_bench_fixed(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (1.85, 0.72, 0.9))
    wood = p.get("wood", mats[1])
    for index in range(4):
        y = -depth * 0.20 + index * depth * 0.13
        add_rounded_box("seat_slat", (width * 0.88, depth * 0.10, height * 0.055), (0, y, height * 0.48), wood, bevel=0.015, component="seat structure")
    for index in range(4):
        z = height * 0.58 + index * height * 0.10
        add_rounded_box("back_slat", (width * 0.88, depth * 0.055, height * 0.07), (0, depth * 0.30, z), wood, bevel=0.015, component="back structure")
    for x, label in ((-width * 0.43, "left"), (width * 0.43, "right")):
        add_rounded_box(f"{label}_side_frame", (width * 0.055, depth * 0.62, height * 0.72), (x, 0, height * 0.36), mats[0], bevel=0.022, component="side frames")
        add_rounded_box(f"{label}_armrest", (width * 0.055, depth * 0.50, height * 0.06), (x, -depth * 0.01, height * 0.74), mats[1], bevel=0.018, component="armrests")
        add_rounded_box(f"{label}_foot", (width * 0.10, depth * 0.18, height * 0.07), (x, 0, height * 0.035), mats[2], bevel=0.015, component="anchored feet")
    add_rounded_box("rear_support", (width * 0.76, depth * 0.07, height * 0.08), (0, depth * 0.28, height * 0.48), mats[0], bevel=0.015, component="supports")
    add_rounded_box("front_support", (width * 0.76, depth * 0.07, height * 0.08), (0, -depth * 0.27, height * 0.43), mats[0], bevel=0.015, component="supports")


def build_trash_can_fixed(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (0.72, 0.72, 1.15))
    add_cylinder("liner", width * 0.34, height * 0.72, (0, 0, height * 0.42), mats[2], vertices=20, component="liner", bevel=0.01)
    for index in range(6):
        angle = math.tau * index / 6
        add_rounded_box("outer_enclosure", (width * 0.12, depth * 0.52, height * 0.68), (math.cos(angle) * width * 0.34, math.sin(angle) * depth * 0.34, height * 0.42), mats[0], bevel=0.025, rotation=(0, 0, angle), component="outer enclosure")
    add_torus("bottom_support_ring", width * 0.34, width * 0.035, (0, 0, height * 0.13), mats[1], component="support rings", major_segments=20, minor_segments=6)
    add_torus("top_support_ring", width * 0.34, width * 0.035, (0, 0, height * 0.72), mats[1], component="support rings", major_segments=20, minor_segments=6)
    add_rounded_box("disposal_opening", (width * 0.55, depth * 0.18, height * 0.18), (0, -depth * 0.34, height * 0.78), mats[2], bevel=0.045, component="disposal opening")
    add_rounded_box("rain_cover", (width * 0.82, depth * 0.82, height * 0.12), (0, 0, height * 0.94), mats[3], bevel=0.065, component="rain cover")
    add_rounded_box("service_access", (width * 0.50, depth * 0.035, height * 0.42), (0, depth * 0.37, height * 0.43), mats[1], bevel=0.035, component="service access")
    for x in (-width * 0.24, width * 0.24):
        add_rounded_box("base_anchor", (width * 0.12, depth * 0.12, height * 0.08), (x, 0, height * 0.04), mats[4], bevel=0.012, component="base anchors")


def build_charging_pad_fixed(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (2.8, 5.2, 0.35))
    add_rounded_box("ground_pad", (width * 0.96, depth * 0.96, height * 0.34), (0, 0, height * 0.17), p.get("concrete", mats[0]), bevel=min(width, depth) * 0.025, component="ground pad")
    for side in (-1, 1):
        add_rounded_box("protective_edging", (width * 0.07, depth * 0.94, height * 0.38), (side * width * 0.47, 0, height * 0.19), mats[0], bevel=0.025, component="protective edging")
        add_rounded_box("alignment_marking", (width * 0.055, depth * 0.72, height * 0.035), (side * width * 0.31, 0, height * 0.36), mats[4], bevel=0.009, component="alignment markings")
    for y in (-depth * 0.27, 0, depth * 0.27):
        add_cylinder("induction_array", width * 0.11, height * 0.08, (0, y, height * 0.37), mats[4], vertices=16, component="connector or induction array", bevel=0.006)
    add_rounded_box("power_module", (width * 0.20, depth * 0.13, height * 0.58), (width * 0.36, depth * 0.35, height * 0.29), mats[1], bevel=0.035, component="power module")
    add_rounded_box("status_lights", (width * 0.13, depth * 0.025, height * 0.13), (width * 0.36, depth * 0.285, height * 0.36), mats[4], bevel=0.018, component="status lights")


def build_fuel_pump_fixed(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (0.9, 0.62, 2.1))
    add_rounded_box("anchored_pedestal", (width * 0.92, depth * 0.90, height * 0.07), (0, 0, height * 0.035), p.get("concrete", mats[0]), bevel=0.045, component="anchored pedestal")
    add_rounded_box("cabinet", (width * 0.78, depth * 0.76, height * 0.78), (0, 0, height * 0.46), mats[0], bevel=0.07, component="cabinet")
    add_rounded_box("protective_trim", (width * 0.86, depth * 0.84, height * 0.08), (0, 0, height * 0.86), mats[1], bevel=0.04, component="protective trim")
    add_rounded_box("display", (width * 0.48, depth * 0.035, height * 0.18), (0, -depth * 0.40, height * 0.68), mats[4], bevel=0.025, component="display")
    add_rounded_box("payment_terminal", (width * 0.32, depth * 0.055, height * 0.13), (0, -depth * 0.42, height * 0.49), mats[2], bevel=0.022, component="payment terminal")
    add_rounded_box("service_panel", (width * 0.52, depth * 0.035, height * 0.30), (0, depth * 0.40, height * 0.42), mats[1], bevel=0.028, component="service panel")
    add_tube("hose", [(width * 0.34, depth * 0.34, height * 0.77), (width * 0.54, depth * 0.38, height * 0.54), (width * 0.48, depth * 0.30, height * 0.24)], width * 0.025, mats[2], component="hose", resolution=2)
    add_rounded_box("nozzle", (width * 0.15, depth * 0.12, height * 0.18), (width * 0.38, -depth * 0.43, height * 0.32), mats[2], bevel=0.025, component="nozzle")
    add_cylinder("nozzle_spout", width * 0.022, height * 0.14, (width * 0.38, -depth * 0.47, height * 0.47), mats[1], vertices=10, rotation=(0.12, 0, 0), component="nozzle", bevel=0.002)
    for index in range(5):
        add_rounded_box("vent", (width * 0.08, depth * 0.035, height * 0.018), (-width * 0.22 + index * width * 0.11, depth * 0.41, height * 0.66), mats[2], bevel=0.004, component="service panel")
    add_rounded_box("nozzle_cradle", (width * 0.22, depth * 0.08, height * 0.16), (width * 0.35, -depth * 0.37, height * 0.39), mats[3], bevel=0.025, component="nozzle")


def build_digital_kiosk_fixed(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (0.75, 0.55, 1.85))
    add_rounded_box("anchored_base", (width * 0.96, depth * 0.96, height * 0.08), (0, 0, height * 0.04), mats[0], bevel=0.06, component="anchored base")
    add_rounded_box("structural_body", (width * 0.76, depth * 0.72, height * 0.78), (0, 0, height * 0.47), mats[0], bevel=0.08, component="structural body")
    add_rounded_box("protective_bezel", (width * 0.70, depth * 0.09, height * 0.40), (0, -depth * 0.40, height * 0.66), mats[2], bevel=0.045, component="protective bezel")
    add_rounded_box("screen", (width * 0.58, depth * 0.04, height * 0.32), (0, -depth * 0.47, height * 0.66), mats[4], bevel=0.03, component="screen")
    add_rounded_box("input_area", (width * 0.54, depth * 0.22, height * 0.08), (0, -depth * 0.35, height * 0.40), mats[1], bevel=0.028, component="input area")
    add_rounded_box("service_panel", (width * 0.54, depth * 0.04, height * 0.24), (0, depth * 0.38, height * 0.31), mats[3], bevel=0.025, component="service panel")
    for index in range(5):
        add_rounded_box("ventilation", (width * 0.07, depth * 0.035, height * 0.012), (-width * 0.20 + index * width * 0.10, depth * 0.39, height * 0.62), mats[2], bevel=0.003, component="ventilation")
    add_rounded_box("identity_plate", (width * 0.42, depth * 0.045, height * 0.08), (0, -depth * 0.42, height * 0.18), mats[3], bevel=0.018, component="structural body")


def build_office_desk_fixed(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (1.65, 0.78, 0.76))
    add_rounded_box("work_surface", (width * 0.98, depth * 0.96, height * 0.10), (0, 0, height * 0.94), mats[1], bevel=0.04, component="work surface")
    for x in (-width * 0.43, width * 0.43):
        add_rounded_box("load_bearing_leg", (width * 0.08, depth * 0.78, height * 0.82), (x, 0, height * 0.41), mats[0], bevel=0.022, component="load-bearing legs or pedestal")
        add_rounded_box("floor_glide", (width * 0.14, depth * 0.84, height * 0.045), (x, 0, height * 0.023), mats[2], bevel=0.015, component="load-bearing legs or pedestal")
    add_rounded_box("storage", (width * 0.30, depth * 0.72, height * 0.54), (width * 0.25, 0, height * 0.31), mats[3], bevel=0.035, component="storage")
    for index in range(3):
        add_rounded_box("drawer", (width * 0.25, depth * 0.045, height * 0.12), (width * 0.25, -depth * 0.38, height * (0.18 + index * 0.17)), mats[1], bevel=0.015, component="storage")
    add_rounded_box("edge_trim", (width, depth * 0.045, height * 0.09), (0, -depth * 0.50, height * 0.94), mats[4], bevel=0.015, component="edge trim")
    add_rounded_box("cable_management", (width * 0.52, depth * 0.18, height * 0.08), (0, depth * 0.32, height * 0.75), mats[2], bevel=0.022, component="cable management")
    add_rounded_box("equipment_clearance", (width * 0.36, depth * 0.54, height * 0.025), (-width * 0.16, 0, height * 0.12), mats[2], bevel=0.005, component="equipment clearance")


def build_hover_vehicle_fixed(spec):
    p, mats = _detail_materials({**spec, "town": "techtown"})
    width, depth, height = _dims(spec, (2.05, 4.55, 1.45))
    body_z = height * 0.38
    add_rounded_box("load_bearing_chassis", (width * 0.92, depth * 0.80, height * 0.28), (0, 0, body_z), mats[0], bevel=0.13, component="load-bearing chassis")
    add_rounded_box("passenger_cabin", (width * 0.74, depth * 0.46, height * 0.48), (0, 0, height * 0.68), p.get("glass", mats[3]), bevel=0.18, component="passenger cabin")
    add_rounded_box("windshield", (width * 0.62, depth * 0.035, height * 0.30), (0, -depth * 0.23, height * 0.72), p.get("glass", mats[3]), bevel=0.045, rotation=(0.18, 0, 0), component="windshield")
    for side, x in (("left", -width * 0.40), ("right", width * 0.40)):
        for y in (-depth * 0.13, depth * 0.13):
            add_rounded_box("door", (width * 0.045, depth * 0.23, height * 0.38), (x, y, height * 0.54), mats[0], bevel=0.055, component="doors")
        add_rounded_box("service_panel", (width * 0.035, depth * 0.22, height * 0.17), (x, depth * 0.28, height * 0.39), mats[1], bevel=0.025, component="service panels")
        add_rounded_box("intake", (width * 0.035, depth * 0.20, height * 0.12), (x, -depth * 0.29, height * 0.38), mats[2], bevel=0.022, component="intakes")
    pod_positions = [(-1, -1), (1, -1), (-1, 1), (1, 1)]
    for index, (sx, sy) in enumerate(pod_positions):
        x, y = sx * width * 0.45, sy * depth * 0.30
        add_rounded_box("hover_pod", (width * 0.26, depth * 0.20, height * 0.18), (x, y, height * 0.18), mats[0], bevel=0.08, component="hover pods")
        add_cylinder("lift_emitter", width * 0.09, height * 0.07, (x, y, height * 0.08), mats[4], vertices=16, component="lift emitters", bevel=0.006)
        for bolt in range(3):
            angle = math.tau * bolt / 3
            add_cylinder("pod_fastener", width * 0.012, height * 0.04, (x + math.cos(angle) * width * 0.08, y + math.sin(angle) * depth * 0.055, height * 0.24), mats[1], vertices=8, component="service panels", bevel=0.002)
    for x in (-width * 0.27, width * 0.27):
        add_rounded_box("front_light", (width * 0.20, depth * 0.035, height * 0.09), (x, -depth * 0.41, height * 0.39), mats[3], bevel=0.025, component="front lights")
        add_rounded_box("rear_light", (width * 0.20, depth * 0.035, height * 0.09), (x, depth * 0.41, height * 0.39), mats[4], bevel=0.025, component="rear lights")
    add_rounded_box("charging_access", (width * 0.05, depth * 0.16, height * 0.13), (width * 0.46, depth * 0.10, height * 0.41), mats[4], bevel=0.025, component="service panels")
    _component_details(spec, width, depth, height, mats, scale=0.75)


