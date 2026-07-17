import * as THREE from 'three';

// ───────────────────────────────────────────────────────────────────────────
// blockSupplyLayout.js — physical display layout for the Block Supply store.
//
// Coordinates are local to the 16 x 12 Block Supply interior. Merchandise is
// deliberately distributed across the back, left and right slatwalls plus the
// two floor fixtures. This keeps the shop readable from the entrance and stops
// every category from collapsing into one crowded back-wall spreadsheet.
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
const LEFT_X = -7.48;
const RIGHT_X = 7.48;

export const SHOP_ZONES = Object.freeze({
  'pistol-wall': Object.freeze({
    label: 'Pistols · Back Left', wall: 'back',
    origin: [-5.65, 2.28, BACK_Z], step: [0.78, 0, 0], perRow: 4, rowStep: [0, -0.58, 0],
    facing: 0, plate: null,
  }),
  'long-wall': Object.freeze({
    label: 'Long Weapons · Back Center', wall: 'back',
    origin: [-1.95, 2.18, BACK_Z], step: [1.15, 0, 0], perRow: 5, rowStep: [0, -0.72, 0],
    facing: 0, plate: null,
  }),
  'melee-rack': Object.freeze({
    label: 'Melee & Tools · Right Wall', wall: 'right',
    origin: [RIGHT_X, 2.25, -3.1], step: [0, 0, 0.88], perRow: 5, rowStep: [0, -0.58, 0],
    facing: -Math.PI / 2, plate: null,
  }),
  'featured': Object.freeze({
    label: 'Featured · Glass Pedestal', wall: 'floor',
    origin: [-0.15, 1.92, 3.88], step: [0.92, 0, 0], perRow: 4, rowStep: [0, -0.48, 0],
    facing: Math.PI, plate: null,
  }),
  'ammo-shelf': Object.freeze({
    label: 'Ammo · Left Wall', wall: 'left',
    origin: [LEFT_X, 1.7, -3.0], step: [0, 0, 0.95], perRow: 6, rowStep: [0, -0.48, 0],
    facing: Math.PI / 2, plate: null,
  }),
  'upgrade-counter': Object.freeze({
    label: 'Upgrade Bench · Right Front', wall: 'right',
    origin: [RIGHT_X, 1.7, 2.0], step: [0, 0, 0.82], perRow: 3, rowStep: [0, -0.48, 0],
    facing: -Math.PI / 2, plate: null,
  }),
});

export const SHOP_TABS = ['Weapons', 'Melee', 'Ammo', 'Upgrades', 'Owned'];

export function zoneSlot(zoneId, index) {
  const zone = SHOP_ZONES[zoneId] || SHOP_ZONES.featured;
  const row = Math.floor(index / zone.perRow);
  const col = index % zone.perRow;
  return {
    pos: [
      zone.origin[0] + zone.step[0] * col + zone.rowStep[0] * row,
      zone.origin[1] + zone.step[1] * col + zone.rowStep[1] * row,
      zone.origin[2] + zone.step[2] * col + zone.rowStep[2] * row,
    ],
    facing: zone.facing,
    wall: zone.wall,
    label: zone.label,
  };
}
