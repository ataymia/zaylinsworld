// ───────────────────────────────────────────────────────────────────────────
// chickenSpotKitchen.js — purpose-built fryer equipment for Chicken Spot.
//
// Dedicated fryer GLBs are not present in the runtime asset library yet. This
// lightweight prefab replaces the restaurant pack's stove/griddle pieces so the
// kitchen reads as fried-chicken service rather than a bakery or pizza line.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.42,
    metalness: options.metalness ?? 0.72,
    emissive: options.emissive || '#000000',
    emissiveIntensity: options.emissiveIntensity || 0,
  });
}

function box(width, height, depth, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
}

function fryerUnit({ x, z, double = false }) {
  const group = new THREE.Group();
  group.name = double ? 'chicken-fryer-double' : 'chicken-fryer-single';

  const steel = material('#9da6ad');
  const darkSteel = material('#48515a', { roughness: 0.5, metalness: 0.65 });
  const oil = material('#24170d', { roughness: 0.22, metalness: 0.05 });
  const black = material('#15191e', { roughness: 0.65, metalness: 0.25 });
  const hot = material('#d98c24', { roughness: 0.35, metalness: 0.1, emissive: '#7a3500', emissiveIntensity: 0.25 });

  const width = double ? 2.35 : 1.3;
  const body = box(width, 1.02, 1.18, steel);
  body.position.y = 0.51;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const toeKick = box(width * 0.92, 0.18, 1.08, darkSteel);
  toeKick.position.set(0, 0.09, 0.03);
  group.add(toeKick);

  const control = box(width * 0.92, 0.34, 0.16, darkSteel);
  control.position.set(0, 0.88, 0.58);
  group.add(control);

  const wells = double ? [-0.57, 0.57] : [0];
  for (const wellX of wells) {
    const rim = box(0.92, 0.09, 0.82, steel);
    rim.position.set(wellX, 1.055, -0.08);
    group.add(rim);

    const oilWell = box(0.76, 0.035, 0.66, oil);
    oilWell.position.set(wellX, 1.105, -0.08);
    group.add(oilWell);

    const basket = new THREE.Group();
    basket.name = 'fryer-basket';
    const basketMat = material('#6f7880', { roughness: 0.38, metalness: 0.88 });
    const basketBase = box(0.68, 0.08, 0.56, basketMat);
    basketBase.position.y = 0.04;
    basket.add(basketBase);
    for (let rail = -2; rail <= 2; rail++) {
      const railMesh = box(0.035, 0.3, 0.55, basketMat);
      railMesh.position.set(rail * 0.14, 0.18, 0);
      basket.add(railMesh);
    }
    const handle = box(0.1, 0.08, 0.62, black);
    handle.position.set(0, 0.18, 0.58);
    basket.add(handle);
    basket.position.set(wellX, 1.11, -0.08);
    group.add(basket);

    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), black);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(wellX - 0.19, 0.91, 0.69);
    group.add(dial);

    const indicator = box(0.18, 0.09, 0.04, hot);
    indicator.position.set(wellX + 0.2, 0.91, 0.685);
    group.add(indicator);
  }

  const splash = box(width, 0.72, 0.08, steel);
  splash.position.set(0, 1.38, -0.54);
  group.add(splash);

  group.position.set(x, 0, z);
  group.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  group.updateWorldMatrix(true, true);
  return {
    group,
    support: new THREE.Box3().setFromObject(group),
  };
}

function drainRack(x, z) {
  const group = new THREE.Group();
  group.name = 'chicken-drain-rack';
  const steel = material('#8c959d', { roughness: 0.4, metalness: 0.85 });
  const tray = box(1.45, 0.1, 0.85, steel);
  tray.position.y = 0.92;
  group.add(tray);

  for (let legX = -1; legX <= 1; legX += 2) {
    for (let legZ = -1; legZ <= 1; legZ += 2) {
      const leg = box(0.09, 0.9, 0.09, steel);
      leg.position.set(legX * 0.62, 0.45, legZ * 0.32);
      group.add(leg);
    }
  }

  for (let rail = -3; rail <= 3; rail++) {
    const wire = box(0.035, 0.035, 0.7, steel);
    wire.position.set(rail * 0.18, 0.99, 0);
    group.add(wire);
  }

  group.position.set(x, 0, z);
  group.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  group.updateWorldMatrix(true, true);
  return { group, support: new THREE.Box3().setFromObject(group) };
}

export function buildChickenFryerLine(root, offsetX = 0, offsetZ = 0) {
  if (!root) return { items: 0, supports: [] };
  const pieces = [
    fryerUnit({ x: offsetX - 4.6, z: offsetZ - 4.45, double: true }),
    fryerUnit({ x: offsetX - 2.7, z: offsetZ - 4.45, double: false }),
    drainRack(offsetX - 1.15, offsetZ - 4.45),
  ];

  for (const piece of pieces) root.add(piece.group);
  console.info('[furnish] chicken ← procedural fryer line | pieces:', pieces.length);
  return {
    items: pieces.length,
    supports: pieces.map((piece) => piece.support),
  };
}
