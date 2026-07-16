#!/usr/bin/env python3
"""Export the uploaded Sunbox free male avatar as a modular web GLB.

The source .blend remains outside Git. This script selects only the shared rig,
full-morph body, approved wardrobe pieces, and attachment anchors.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import bpy
from mathutils import Matrix


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, help='Path to Male_Avatar_Character_Free .blend')
    parser.add_argument('--output', required=True, help='Output raw GLB path')
    return parser.parse_args()


def make_mat(name, color, rough=0.75, metal=0.0, alpha=1.0):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, alpha)
    try:
        material.surface_render_method = 'DITHERED'
    except Exception:
        pass
    bsdf = material.node_tree.nodes.get('Principled BSDF') if material.node_tree else None
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Metallic'].default_value = metal
        bsdf.inputs['Alpha'].default_value = alpha
    return material


def main() -> None:
    args = parse_args()
    source = str(Path(args.source).expanduser().resolve())
    output = str(Path(args.output).expanduser().resolve())
    if not os.path.isfile(source):
        raise FileNotFoundError(source)

    bpy.ops.wm.open_mainfile(filepath=source)
    bpy.ops.object.select_all(action='DESELECT')

    arm = bpy.data.objects.get('Avatar_Male_Armature')
    source_body = bpy.data.objects.get('Avatar_Male_GEO')
    body = bpy.data.objects.get('Avatar_Male_GEO.002')
    if not all((arm, source_body, body)):
        raise RuntimeError('Expected Sunbox armature/body objects were not found')

    # Use the body with the complete morph library and copy the visible body's materials.
    if not body.users_collection:
        bpy.context.scene.collection.objects.link(body)
    for index, slot in enumerate(source_body.material_slots):
        if index >= len(body.data.materials):
            body.data.materials.append(slot.material)
        else:
            body.data.materials[index] = slot.material
    if len(body.data.materials) > 4 and bpy.data.materials.get('Eyebrows'):
        body.data.materials[4] = bpy.data.materials['Eyebrows']

    body.name = 'ZW_Player_Body'
    body.data.name = 'ZW_Player_Body_Mesh'
    body['zwSlot'] = 'body'
    body['zwItemId'] = 'male-base'
    body['zwDefault'] = True
    bpy.data.objects.remove(source_body, do_unlink=True)

    canonical = {
        'Tshirt_Male': ('ZW_Top_TShirt', 'top', 'tshirt', True),
        'Hoodie_Male': ('ZW_Top_Hoodie', 'top', 'hoodie', False),
        'Jeans_Male': ('ZW_Bottom_Jeans', 'bottom', 'jeans', True),
        'Shorts_01_Male': ('ZW_Bottom_CargoShorts', 'bottom', 'cargo-shorts', False),
        'BasketballShoes_Male': ('ZW_Shoes_Basketball', 'shoes', 'basketball', True),
        'FlipFlops_Male': ('ZW_Shoes_FlipFlops', 'shoes', 'flipflops', False),
        'Hair_16': ('ZW_Hair_CrewCut', 'hair', 'crew-cut', True),
        'Hair_01': ('ZW_Hair_CloseCrop', 'hair', 'close-crop', False),
        'FacialHair_06': ('ZW_FacialHair_Beard', 'facialHair', 'beard', False),
        'FacialHair_08': ('ZW_FacialHair_Goatee', 'facialHair', 'goatee', False),
        'Hat_04': ('ZW_Hat_Beanie', 'hat', 'beanie', False),
        'Hat_05': ('ZW_Hat_BaseballCap', 'hat', 'baseball-cap', False),
        'Glasses_02': ('ZW_Glasses_Pilot', 'glasses', 'pilot', False),
        'Glasses_04': ('ZW_Glasses_Square', 'glasses', 'square', False),
    }

    keep_names = {body.name, arm.name}
    for original, (new_name, slot, item_id, default) in canonical.items():
        obj = bpy.data.objects.get(original)
        if not obj:
            raise RuntimeError(f'Missing expected modular object: {original}')
        obj.name = new_name
        obj.data.name = new_name + '_Mesh'
        obj['zwSlot'] = slot
        obj['zwItemId'] = item_id
        obj['zwDefault'] = default
        obj.hide_viewport = False
        obj.hide_render = False
        obj.hide_set(False)
        keep_names.add(new_name)
        for modifier in list(obj.modifiers):
            if modifier.type == 'NODES':
                obj.modifiers.remove(modifier)
            elif modifier.type == 'ARMATURE' and modifier.object is None:
                obj.modifiers.remove(modifier)

    arm.name = 'ZW_Player_Armature'
    arm.data.name = 'ZW_Player_Armature_Data'
    arm['zwRole'] = 'player-rig'
    arm['zwSource'] = 'Sunbox Games / CGTrader model 3901952'

    for obj in list(bpy.data.objects):
        if obj.name in keep_names:
            continue
        if obj.type in {'CAMERA', 'LIGHT'} or obj.name.startswith(('CTRL_', 'STRL_')):
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        if obj.type == 'MESH' and len(obj.data.polygons) == 0:
            bpy.data.objects.remove(obj, do_unlink=True)

    materials = {
        'Skin': make_mat('ZW_Skin', (0.31, 0.17, 0.09), 0.72),
        'Nails': make_mat('ZW_Nails', (0.45, 0.25, 0.18), 0.55),
        'Eyelashes': make_mat('ZW_Eyelashes', (0.015, 0.01, 0.008), 0.9),
        'Teeth': make_mat('ZW_Teeth', (0.93, 0.9, 0.82), 0.4),
        'Hair': make_mat('ZW_Hair', (0.035, 0.022, 0.016), 0.88),
        'Eyes': make_mat('ZW_Eyes', (0.16, 0.07, 0.025), 0.38),
        'Eyebrows': make_mat('ZW_Eyebrows', (0.035, 0.022, 0.016), 0.9),
        'T-Shirt': make_mat('ZW_TShirt', (0.08, 0.08, 0.09), 0.8),
        'Hoodie': make_mat('ZW_Hoodie', (0.26, 0.27, 0.3), 0.86),
        'Jeans': make_mat('ZW_Jeans', (0.07, 0.16, 0.29), 0.9),
        'CargoShorts': make_mat('ZW_CargoShorts', (0.23, 0.25, 0.19), 0.9),
        'BasketballShoes': make_mat('ZW_BasketballShoes', (0.92, 0.92, 0.94), 0.55),
        'FlipFlops': make_mat('ZW_FlipFlops', (0.08, 0.08, 0.09), 0.75),
        'Beanie': make_mat('ZW_Beanie', (0.04, 0.04, 0.05), 0.9),
        'BaseballCap': make_mat('ZW_BaseballCap', (0.04, 0.04, 0.05), 0.86),
        'Glasses': make_mat('ZW_GlassesFrame', (0.04, 0.04, 0.045), 0.35, 0.35),
        'Glass': make_mat('ZW_GlassesLens', (0.12, 0.16, 0.2), 0.1, 0.0, 0.28),
    }

    for obj in [entry for entry in bpy.data.objects if entry.type == 'MESH']:
        for index, old in enumerate(list(obj.data.materials)):
            if old and old.name in materials:
                obj.data.materials[index] = materials[old.name]
        obj['zwRenderable'] = True

    def bone_anchor(name: str, bone_name: str):
        if bone_name not in arm.data.bones:
            raise RuntimeError(f'Missing attachment bone: {bone_name}')
        empty = bpy.data.objects.new(name, None)
        bpy.context.scene.collection.objects.link(empty)
        empty.empty_display_type = 'PLAIN_AXES'
        empty.empty_display_size = 0.06
        empty.parent = arm
        empty.parent_type = 'BONE'
        empty.parent_bone = bone_name
        empty.matrix_parent_inverse = Matrix.Identity(4)
        empty['zwAnchor'] = name.replace('ZW_Anchor_', '').lower()
        return empty

    anchors = [
        bone_anchor('ZW_Anchor_Head', 'Head'),
        bone_anchor('ZW_Anchor_RightHand', 'Hand_R'),
        bone_anchor('ZW_Anchor_LeftHand', 'Hand_L'),
        bone_anchor('ZW_Anchor_Chest', 'Chest'),
    ]
    keep_names.update(anchor.name for anchor in anchors)

    bpy.context.scene['zwPackage'] = 'sunbox-male-free'
    bpy.context.scene['zwLicense'] = 'CGTrader Royalty Free License (no AI)'
    bpy.context.scene['zwModelId'] = '3901952'

    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.data.objects:
        if obj.name in keep_names:
            obj.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm

    Path(output).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=output,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_animations=False,
        export_skins=True,
        export_morph=True,
        export_morph_normal=False,
        export_morph_tangent=False,
        export_extras=True,
        export_materials='EXPORT',
        export_cameras=False,
        export_lights=False,
        export_all_influences=False,
    )
    print(f'[player-avatar] exported {output}: {os.path.getsize(output)} bytes')


if __name__ == '__main__':
    main()
