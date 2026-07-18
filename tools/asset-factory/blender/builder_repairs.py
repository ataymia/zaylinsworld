from builder_repairs_legacy import (
    build_bench_fixed,
    build_charging_pad_fixed,
    build_digital_kiosk_fixed,
    build_fuel_pump_fixed,
    build_hover_vehicle_fixed,
    build_mailbox_fixed,
    build_office_desk_fixed,
    build_road_sign_fixed,
    build_streetlight_fixed,
    build_trash_can_fixed,
)
from builder_repairs_modular import (
    build_modular_building,
    build_modular_connector,
    build_modular_food,
    build_modular_furniture,
    build_modular_infrastructure,
    build_modular_prop,
    build_modular_road,
    build_state_variant,
)


def install_repairs(builders):
    builders.update({
        "streetlight": build_streetlight_fixed,
        "road_sign": build_road_sign_fixed,
        "mailbox": build_mailbox_fixed,
        "municipal_bench": build_bench_fixed,
        "municipal_trash_can": build_trash_can_fixed,
        "charging_pad": build_charging_pad_fixed,
        "fuel_pump": build_fuel_pump_fixed,
        "digital_kiosk": build_digital_kiosk_fixed,
        "office_desk": build_office_desk_fixed,
        "hover_vehicle": build_hover_vehicle_fixed,
        "modular_connector": build_modular_connector,
        "modular_infrastructure": build_modular_infrastructure,
        "modular_furniture": build_modular_furniture,
        "modular_prop": build_modular_prop,
        "state_variant": build_state_variant,
        "modular_building": build_modular_building,
        "modular_road": build_modular_road,
        "modular_food": build_modular_food,
    })
    return builders
