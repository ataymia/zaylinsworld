import * as THREE from 'three';

// ───────────────────────────────────────────────────────────────────────────
//  blockSupplyLayout.js — physical display layout for the Block Supply store.
//
//  The registered prefab is a 10 × 9 room with its entrance centered on the
//  right wall. Displays therefore use the back wall, the full left wall, and only
//  the rear section of the right wall. The doorway lane and floor stay empty.
//  Weapons hang directly on real room surfaces and remain hover/interact targets.
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
  const material = Array.isArray(obj.material) ? obj.material[0] : obj.material;
  const hex = material?.color?.getHexString?.();
  return hex === '10141c';
}

installBlockSupplyPlateSuppressor();

const BACK_Z = -4.08;
const LEFT_X = -4.58;
const RIGHT_X = 4.58;

export const SHOP_ZONES = {
  // Left wall, upper/rear section. Sidearms get compact vertical bays and face
  // into the room. The second row grows downward rather than toward the doorway.
  'pistol-wall': {
    label: 'Pistols',
    origin: [LEFT_X, 2.08, -3.25], step: [0, 0, 0.82], perRow: 5, rowStep: [0, -0.58, 0],
    facing: Math.PI / 2, plate: '#1b2a3a',
  },

  // Main long-gun wall. Wider bays preserve readable silhouettes across rifles,
  // shotguns, and precision weapons with different authored long axes.
  'long-wall': {
    label: 'Long Weapons',
    origin: [-4.15, 1.72, BACK_Z], step: [1.08, 0, 0], perRow: 5, rowStep: [0, -0.64, 0],
    facing: 0, plate: '#22202e',
  },

  // Left wall, front section. Melee/tools stay attached to a real wall but remain
  // visually separate from the pistol section.
  'melee-rack': {
    label: 'Melee & Tools',
    origin: [LEFT_X, 1.82, 0.95], step: [0, 0, 0.72], perRow: 4, rowStep: [0, -0.58, 0],
    facing: Math.PI / 2, plate: '#2a241a',
  },

  // Upper-right portion of the back wall. Heavy/featured pieces receive the most
  // breathing room and never return to floor cases.
  'featured': {
    label: 'Featured',
    origin: [1.15, 2.1, BACK_Z], step: [1.02, 0, 0], perRow: 4, rowStep: [0, -0.66, 0],
    facing: 0, plate: '#2a1a2a',
  },

  // Rear segment of the right wall. This stops well before the centered entrance
  // at z=0, preserving a wide arrival/exit lane.
  'ammo-shelf': {
    label: 'Ammo',
    origin: [RIGHT_X, 1.65, -3.35], step: [0, 0, 0.68], perRow: 4, rowStep: [0, -0.48, 0],
    facing: -Math.PI / 2, plate: '#1a2a1a',
  },

  // Back-right wall. The origin stays high enough that even a third wrapped row
  // remains visibly mounted above the floor as the upgrade catalog grows.
  'upgrade-counter': {
    label: 'Upgrade Bench',
    origin: [2.7, 1.35, BACK_Z], step: [0.64, 0, 0], perRow: 3, rowStep: [0, -0.42, 0],
    facing: 0, plate: '#2a2a1a',
  },
};

export const SHOP_TABS = ['Weapons', 'Melee', 'Ammo', 'Upgrades', 'Owned'];

export function zoneSlot(zoneId, index) {
  const zone = SHOP_ZONES[zoneId] || SHOP_ZONES.featured;
  const row = Math.floor(index / zone.perRow);
  const col = index % zone.perRow;
  const pos = [
    zone.origin[0] + zone.step[0] * col + zone.rowStep[0] * row,
    zone.origin[1] + zone.step[1] * col + zone.rowStep[1] * row,
    zone.origin[2] + zone.step[2] * col + zone.rowStep[2] * row,
  ];
  return { pos, facing: zone.facing };
}
