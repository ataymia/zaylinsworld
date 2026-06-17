import * as THREE from 'three';
import '../skinRuntime.js';

// ───────────────────────────────────────────────────────────────────────────
//  blockSupplyLayout.js — physical display layout for the Block Supply store.
//
//  Back-wall version: every visible item is mounted to the same back wall. The
//  right-wall / floor-case layouts looked like floating objects once the bad
//  per-item backing boxes were removed, so the store now uses one clean visual
//  rule: weapons hang on the wall, player walks up, interaction prompt/shop menu
//  handles the details.
//
//  Coordinates are LOCAL to the Block Supply interior origin (see interiors.js).
//  The main display builder still tries to add one little square backing plate
//  per weapon. This module is imported before that builder runs, so we suppress
//  only those exact plate meshes. Result: weapons hang directly on the back wall.
//
//  It also imports skinRuntime.js here because main.js imports this config before
//  building the creator/player/NPC avatars. That installs the visible-skin hook
//  early without risky main.js surgery.
// ───────────────────────────────────────────────────────────────────────────

function installBlockSupplyPlateSuppressor() {
  if (THREE.Object3D.prototype.__zwNoBlockSupplyPlates) return;
  THREE.Object3D.prototype.__zwNoBlockSupplyPlates = true;
  const originalAdd = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function (...objects) {
    const kept = [];
    for (const obj of objects) {
      if (isBlockSupplyDisplayPlate(obj)) {
        obj.visible = false;
        continue;
      }
      kept.push(obj);
    }
    return kept.length ? originalAdd.apply(this, kept) : this;
  };
}

function isBlockSupplyDisplayPlate(obj) {
  if (!obj || !obj.isMesh || !obj.geometry) return false;
  const p = obj.geometry.parameters || {};
  const isPlateSize = Math.abs((p.width || 0) - 0.72) < 0.002
    && Math.abs((p.height || 0) - 0.72) < 0.002
    && Math.abs((p.depth || 0) - 0.06) < 0.002;
  if (!isPlateSize) return false;
  const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
  const hex = mat && mat.color && mat.color.getHexString && mat.color.getHexString();
  return hex === '10141c';
}

installBlockSupplyPlateSuppressor();

const BACK_Z = -4.08;

export const SHOP_ZONES = {
  // Row 1: pistols/sidearms across the upper-left back wall.
  'pistol-wall': {
    label: 'Pistols',
    origin: [-4.45, 2.08, BACK_Z], step: [0.82, 0, 0], perRow: 6, rowStep: [0, -0.48, 0],
    facing: 0, plate: '#1b2a3a',
  },

  // Row 2/3: long weapons across the middle back wall with wider spacing.
  'long-wall': {
    label: 'Long Weapons',
    origin: [-4.45, 1.42, BACK_Z], step: [1.08, 0, 0], perRow: 5, rowStep: [0, -0.52, 0],
    facing: 0, plate: '#22202e',
  },

  // Row 4: melee/tools also mounted on the back wall. No side-wall floating.
  'melee-rack': {
    label: 'Melee & Tools',
    origin: [-4.45, 0.72, BACK_Z], step: [0.88, 0, 0], perRow: 6, rowStep: [0, -0.42, 0],
    facing: 0, plate: '#2a241a',
  },

  // Featured/heavy items share the upper-right back wall.
  'featured': {
    label: 'Featured',
    origin: [0.9, 2.08, BACK_Z], step: [0.98, 0, 0], perRow: 4, rowStep: [0, -0.58, 0],
    facing: 0, plate: '#2a1a2a',
  },

  // Utility rows stay small and low on the right side of the same back wall.
  'ammo-shelf': {
    label: 'Ammo',
    origin: [1.1, 0.82, BACK_Z], step: [0.68, 0, 0], perRow: 4, rowStep: [0, -0.4, 0],
    facing: 0, plate: '#1a2a1a',
  },
  'upgrade-counter': {
    label: 'Upgrade Bench',
    origin: [3.05, 0.82, BACK_Z], step: [0.58, 0, 0], perRow: 3, rowStep: [0, -0.4, 0],
    facing: 0, plate: '#2a2a1a',
  },
};

export const SHOP_TABS = ['Weapons', 'Melee', 'Ammo', 'Upgrades', 'Owned'];

export function zoneSlot(zoneId, index) {
  const z = SHOP_ZONES[zoneId] || SHOP_ZONES['featured'];
  const row = Math.floor(index / z.perRow);
  const col = index % z.perRow;
  const pos = [
    z.origin[0] + z.step[0] * col + z.rowStep[0] * row,
    z.origin[1] + z.step[1] * col + z.rowStep[1] * row,
    z.origin[2] + z.step[2] * col + z.rowStep[2] * row,
  ];
  return { pos, facing: z.facing };
}
