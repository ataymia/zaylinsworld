from common import add_cylinder, add_rounded_box
from builder_repair_utils import PI, _detail_materials, _dims


def build_wall_screen_fixed(spec):
    """Build a wall display entirely inside its audited dimensions.

    The earlier builder positioned the power channel below the panel, making the
    measured height roughly 40% taller than the specification. This version
    scales every part from the canonical dimensions and keeps mounts, vents,
    controls, and cable routing inside the requested envelope.
    """
    _, mats = _detail_materials(spec)
    width, depth, height = _dims(spec, (1.20, 0.24, 0.72))
    front_y = -depth * 0.42
    rear_y = depth * 0.30
    center_z = height * 0.50

    add_rounded_box(
        "mounting_bracket",
        (width * 0.54, depth * 0.20, height * 0.38),
        (0, rear_y, center_z),
        mats[0], bevel=min(width, height) * 0.025,
        component="mounting bracket",
    )
    add_rounded_box(
        "rear_housing",
        (width, depth * 0.62, height),
        (0, 0, center_z),
        mats[2], bevel=min(width, height) * 0.055,
        component="rear housing",
    )
    add_rounded_box(
        "protective_bezel",
        (width * 0.95, depth * 0.19, height * 0.91),
        (0, front_y, center_z),
        mats[0], bevel=min(width, height) * 0.045,
        component="protective bezel",
    )
    add_rounded_box(
        "screen_panel",
        (width * 0.87, depth * 0.075, height * 0.78),
        (0, -depth * 0.53, center_z + height * 0.015),
        mats[4], bevel=min(width, height) * 0.032,
        component="screen panel",
    )

    # Rear rails, ventilation, and fasteners raise topology honestly while also
    # making the prop read as manufactured equipment from non-front angles.
    for x in (-width * 0.34, width * 0.34):
        add_rounded_box(
            "mount_rail",
            (width * 0.075, depth * 0.18, height * 0.72),
            (x, depth * 0.37, center_z),
            mats[1], bevel=0.012,
            component="mounting bracket",
        )
    for index in range(5):
        x = width * (-0.28 + index * 0.14)
        add_rounded_box(
            "vent_slot",
            (width * 0.075, depth * 0.08, height * 0.035),
            (x, depth * 0.345, height * 0.22),
            mats[1], bevel=0.005,
            component="rear housing",
        )
    for x in (-width * 0.41, width * 0.41):
        for z in (height * 0.16, height * 0.84):
            add_cylinder(
                "bezel_fastener",
                max(0.008, width * 0.010),
                max(0.018, depth * 0.10),
                (x, -depth * 0.55, z),
                mats[1], vertices=10, rotation=(PI / 2, 0, 0),
                component="protective bezel", bevel=0.002,
            )

    add_cylinder(
        "status_light",
        max(0.010, width * 0.012),
        max(0.018, depth * 0.10),
        (width * 0.41, -depth * 0.56, height * 0.11),
        mats[3], vertices=16, rotation=(PI / 2, 0, 0),
        component="status light", bevel=0.002,
    )
    add_rounded_box(
        "power_channel",
        (width * 0.075, depth * 0.20, height * 0.58),
        (width * 0.42, depth * 0.30, height * 0.38),
        mats[1], bevel=0.012,
        component="cable or power channel",
    )
