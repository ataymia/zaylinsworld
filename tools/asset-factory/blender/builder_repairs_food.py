import math

from common import add_cylinder, add_rounded_box, add_tube, add_uv_sphere, make_material
from builder_repair_utils import _detail_materials, _dims
from builder_repairs_modular import build_modular_food as build_modular_food_plated


def _is_drink(spec):
    identity = f"{spec.get('id', '')} {spec.get('fileName', '')} {spec.get('displayName', '')}".lower()
    return any(token in identity for token in (
        'drink', 'beverage', 'juice', 'soda', 'smoothie', 'shake', 'tea', 'coffee', 'cup', 'bottle'
    ))


def build_modular_food_fixed(spec):
    if not _is_drink(spec):
        return build_modular_food_plated(spec)

    p, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (0.48, 0.48, 0.62))
    radius = min(width, depth) * 0.34
    cup_height = height * 0.68
    cup_center = height * 0.38

    cup_glass = make_material('drink_cup_glass', (0.55, 0.72, 0.78), roughness=0.16, metallic=0.0)
    liquid = make_material('drink_liquid', (0.88, 0.28, 0.12), roughness=0.22)
    fruit_a = make_material('drink_fruit_a', (0.95, 0.66, 0.10), roughness=0.58)
    fruit_b = make_material('drink_fruit_b', (0.52, 0.12, 0.42), roughness=0.54)
    lid = make_material('drink_lid', (0.16, 0.18, 0.22), roughness=0.36)
    straw = make_material('drink_straw', (0.24, 0.72, 0.82), roughness=0.28)

    add_cylinder('cup_outer', radius, cup_height, (0, 0, cup_center), cup_glass,
                 vertices=32, component='recognizable primary structure', bevel=0.018)
    add_cylinder('liquid_volume', radius * 0.88, cup_height * 0.78,
                 (0, 0, height * 0.34), liquid, vertices=28,
                 component='functional secondary components', bevel=0.014)
    add_cylinder('cup_base', radius * 0.82, height * 0.045,
                 (0, 0, height * 0.055), mats[1], vertices=28,
                 component='recognizable primary structure', bevel=0.012)
    add_cylinder('sealed_lid', radius * 1.03, height * 0.055,
                 (0, 0, height * 0.735), lid, vertices=32,
                 component='functional secondary components', bevel=0.016)
    add_cylinder('lid_opening', radius * 0.16, height * 0.065,
                 (radius * 0.22, 0, height * 0.77), mats[2], vertices=20,
                 component='functional secondary components', bevel=0.008)
    add_tube('straw', [
        (radius * 0.22, 0, height * 0.72),
        (radius * 0.20, 0, height * 0.90),
        (radius * 0.34, 0, height * 0.99),
    ], max(0.012, radius * 0.07), straw,
       component='functional secondary components', resolution=3)

    for index in range(7):
        angle = math.tau * index / 7
        ring = radius * (0.36 if index % 2 else 0.58)
        z = height * (0.23 + (index % 3) * 0.12)
        add_uv_sphere('fruit_bubble', radius * (0.12 if index % 2 else 0.10),
                      (math.cos(angle) * ring, math.sin(angle) * ring, z),
                      fruit_a if index % 2 else fruit_b,
                      segments=16, rings=8, component='appropriate materials')

    add_rounded_box('brand_label', (radius * 1.25, radius * 0.06, height * 0.16),
                    (0, -radius * 1.02, height * 0.42), mats[4], bevel=0.018,
                    component='appropriate materials')
    add_rounded_box('condensation_band', (radius * 1.55, radius * 0.05, height * 0.035),
                    (0, -radius * 1.01, height * 0.58), cup_glass, bevel=0.008,
                    component='appropriate materials')
