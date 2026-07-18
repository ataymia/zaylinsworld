import math

from common import add_cylinder, add_rounded_box, add_tube, make_material
from builder_repair_utils import _component_details, _detail_materials, _dims
from builder_repairs_legacy import build_bench_fixed


def build_bench_fixed_r8(spec):
    """Preserve the accepted bench silhouette and guarantee every declared component."""
    build_bench_fixed(spec)
    _, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (1.85, 0.72, 0.9))
    _component_details(spec, width, depth, height, mats, scale=0.42)


def build_fuel_pump_fixed_r8(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (0.9, 0.62, 2.1))
    warning = make_material("fuel_pump_safety_yellow", (0.95, 0.58, 0.05), metallic=0.15, roughness=0.38)
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
    add_rounded_box("safety_placard", (width * 0.46, depth * 0.025, height * 0.10), (0, -depth * 0.44, height * 0.90), warning, bevel=0.012, component="protective trim")
    add_rounded_box("cabinet_crown", (width * 0.72, depth * 0.68, height * 0.06), (0, 0, height * 0.91), mats[3], bevel=0.025, component="cabinet")


def build_digital_kiosk_fixed_r8(spec):
    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (0.75, 0.55, 1.85))
    accent = make_material("kiosk_accessibility_accent", (0.10, 0.48, 0.90), metallic=0.05, roughness=0.34, emission=(0.04, 0.16, 0.34), emission_strength=0.45)
    add_rounded_box("anchored_base", (width * 0.96, depth * 0.96, height * 0.08), (0, 0, height * 0.04), mats[0], bevel=0.06, component="anchored base")
    add_rounded_box("structural_body", (width * 0.76, depth * 0.72, height * 0.78), (0, 0, height * 0.47), mats[0], bevel=0.08, component="structural body")
    add_rounded_box("protective_bezel", (width * 0.70, depth * 0.09, height * 0.40), (0, -depth * 0.40, height * 0.66), mats[2], bevel=0.045, component="protective bezel")
    add_rounded_box("screen", (width * 0.58, depth * 0.04, height * 0.32), (0, -depth * 0.47, height * 0.66), mats[4], bevel=0.03, component="screen")
    add_rounded_box("input_area", (width * 0.54, depth * 0.22, height * 0.08), (0, -depth * 0.35, height * 0.40), mats[1], bevel=0.028, component="input area")
    add_rounded_box("service_panel", (width * 0.54, depth * 0.04, height * 0.24), (0, depth * 0.38, height * 0.31), mats[3], bevel=0.025, component="service panel")
    for index in range(5):
        add_rounded_box("ventilation", (width * 0.07, depth * 0.035, height * 0.012), (-width * 0.20 + index * width * 0.10, depth * 0.39, height * 0.62), mats[2], bevel=0.003, component="ventilation")
    add_rounded_box("identity_plate", (width * 0.42, depth * 0.045, height * 0.08), (0, -depth * 0.42, height * 0.18), accent, bevel=0.018, component="structural body")
    add_rounded_box("accessible_input_marker", (width * 0.12, depth * 0.035, height * 0.12), (width * 0.23, -depth * 0.48, height * 0.39), accent, bevel=0.018, component="input area")


def build_hover_vehicle_fixed_r8(spec):
    p, mats = _detail_materials({**spec, "town": "techtown"})
    width, depth, height = _dims(spec, (2.05, 4.55, 1.45))
    body_z = height * 0.38
    add_rounded_box("load_bearing_chassis", (width * 0.92, depth * 0.80, height * 0.28), (0, 0, body_z), mats[0], bevel=0.13, component="load-bearing chassis")
    add_rounded_box("passenger_cabin", (width * 0.74, depth * 0.46, height * 0.48), (0, 0, height * 0.68), p.get("glass", mats[3]), bevel=0.18, component="passenger cabin")
    add_rounded_box("windshield", (width * 0.62, depth * 0.035, height * 0.30), (0, -depth * 0.23, height * 0.72), p.get("glass", mats[3]), bevel=0.045, rotation=(0.18, 0, 0), component="windshield")
    for side, x in (("left", -width * 0.40), ("right", width * 0.40)):
        add_rounded_box(f"{side}_door", (width * 0.045, depth * 0.46, height * 0.38), (x, 0, height * 0.54), mats[0], bevel=0.055, component="doors")
        add_rounded_box(f"{side}_service_panel", (width * 0.035, depth * 0.22, height * 0.17), (x, depth * 0.28, height * 0.39), mats[1], bevel=0.025, component="service panels")
        add_rounded_box(f"{side}_intake", (width * 0.035, depth * 0.20, height * 0.12), (x, -depth * 0.29, height * 0.38), mats[2], bevel=0.022, component="intakes")
    for index, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        x, y = sx * width * 0.40, sy * depth * 0.30
        add_rounded_box(f"hover_pod_{index}", (width * 0.23, depth * 0.18, height * 0.16), (x, y, height * 0.17), mats[0], bevel=0.065, component="four hover pods")
        add_cylinder(f"underbody_emitter_{index}", width * 0.075, height * 0.055, (x, y, height * 0.075), mats[4], vertices=12, component="underbody emitters", bevel=0.005)
    for x in (-width * 0.27, width * 0.27):
        add_rounded_box("front_light", (width * 0.20, depth * 0.035, height * 0.09), (x, -depth * 0.41, height * 0.39), mats[3], bevel=0.025, component="front lights")
        add_rounded_box("rear_light", (width * 0.20, depth * 0.035, height * 0.09), (x, depth * 0.41, height * 0.39), mats[4], bevel=0.025, component="rear lights")
    add_rounded_box("charging_access", (width * 0.05, depth * 0.16, height * 0.13), (width * 0.46, depth * 0.10, height * 0.41), mats[4], bevel=0.025, component="charging access")
