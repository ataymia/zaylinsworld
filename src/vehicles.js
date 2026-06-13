// ───────────────────────────────────────────────────────────────────────────
//  vehicles.js — GTA-style "dupe" car builder. Distinct silhouettes per tier
//  built from extruded side-profiles + PBR clearcoat paint, glass, and wheels.
//  No real brands/logos — original designs that *evoke* familiar classes.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

// Extrude a 2D side-profile (authored as [length(X), height(Y)] points) across
// the car width (Z), then rotate so length runs along world +Z (car faces +Z).
function bodyMesh(profile, width, material, bevel = 0.05) {
  const shape = new THREE.Shape();
  shape.moveTo(profile[0][0], profile[0][1]);
  for (let i = 1; i < profile.length; i++) shape.lineTo(profile[i][0], profile[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 2, steps: 1, curveSegments: 6,
  });
  geo.translate(0, 0, -width / 2);   // centre across width
  geo.rotateY(-Math.PI / 2);          // length(X) → +Z, width → X
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function paintMat(color, { clearcoat = 0.8, rough = 0.32, metal = 0.55, cc = 0.06 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color), metalness: metal, roughness: rough,
    clearcoat, clearcoatRoughness: cc, envMapIntensity: 1.1,
  });
}
const glassMat = () => new THREE.MeshPhysicalMaterial({
  color: '#10141b', metalness: 0.1, roughness: 0.06, transmission: 0,
  clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4,
});
const chromeMat = () => new THREE.MeshStandardMaterial({ color: '#d7dbe0', metalness: 1, roughness: 0.18, envMapIntensity: 1.5 });
const tireMat = () => new THREE.MeshStandardMaterial({ color: '#0d0d10', roughness: 0.85, metalness: 0.05 });
const carbonMat = () => new THREE.MeshStandardMaterial({ color: '#16181d', roughness: 0.45, metalness: 0.5 });

// One wheel: tire + dished rim with spokes. Axle runs along X (car width).
function wheel(R, tireW, rimColor, spokes = 6) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(R, R, tireW, 26), tireMat());
  tire.rotation.z = Math.PI / 2; tire.castShadow = true; g.add(tire);
  const rimM = new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.95, roughness: 0.25, envMapIntensity: 1.4 });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.42, R * 0.42, tireW * 1.02, 22), rimM);
  hub.rotation.z = Math.PI / 2; g.add(hub);
  for (let i = 0; i < spokes; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(tireW * 0.7, R * 0.78, R * 0.12), rimM);
    sp.rotation.x = (i / spokes) * Math.PI * 2; g.add(sp);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.16, R * 0.16, tireW * 1.05, 12), chromeMat());
  cap.rotation.z = Math.PI / 2; g.add(cap);
  return g;
}

function lamp(color, emissive, w, h, intensity = 1) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06),
    new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.3 }));
}

// ── per-tier specifications ──────────────────────────────────────────────────
const TYPES = {
  // Economy hatchback — upright, tall greenhouse, short overhangs (Civic/Fit vibe)
  hatch: {
    width: 1.72, tub: [
      [1.78, 0.66], [1.74, 0.40], [1.58, 0.30], [-1.58, 0.30], [-1.74, 0.42],
      [-1.78, 0.84], [-1.45, 0.90], [0.42, 0.90], [0.72, 0.72],
    ],
    glass: [[0.42, 0.90], [0.06, 1.42], [-1.40, 1.40], [-1.74, 0.88]],
    glassW: 1.58, wheelR: 0.34, tireW: 0.26, axle: [1.12, -1.14], track: 0.84,
    rim: '#8c9096', spokes: 5, paint: { clearcoat: 0.4, rough: 0.42, metal: 0.3, cc: 0.18 },
    wing: false, splitter: false, exhaust: 1, sideGlass: true,
  },
  // Sport coupe — lower roof, raked screens, two doors
  coupe: {
    width: 1.86, tub: [
      [2.05, 0.56], [2.0, 0.34], [1.82, 0.26], [-1.9, 0.26], [-2.05, 0.40],
      [-2.05, 0.78], [-1.2, 0.84], [0.5, 0.84], [1.1, 0.6],
    ],
    glass: [[0.5, 0.84], [0.0, 1.18], [-1.05, 1.16], [-1.55, 0.82]],
    glassW: 1.7, wheelR: 0.37, tireW: 0.30, axle: [1.3, -1.32], track: 0.92,
    rim: '#c9ccd2', spokes: 6, paint: { clearcoat: 0.85, rough: 0.3, metal: 0.6, cc: 0.05 },
    wing: 'lip', splitter: true, exhaust: 2, sideGlass: true,
  },
  // Luxury sedan — long three-box, chrome trim, four doors
  sedan: {
    width: 1.92, tub: [
      [2.35, 0.6], [2.3, 0.36], [2.1, 0.28], [-2.3, 0.28], [-2.45, 0.4],
      [-2.45, 0.86], [-1.8, 0.92], [0.55, 0.92], [1.25, 0.74],
    ],
    glass: [[0.55, 0.92], [0.15, 1.3], [-1.5, 1.3], [-1.95, 0.9]],
    glassW: 1.76, wheelR: 0.38, tireW: 0.30, axle: [1.5, -1.55], track: 0.95,
    rim: '#dfe3e8', spokes: 10, paint: { clearcoat: 0.95, rough: 0.22, metal: 0.7, cc: 0.04 },
    wing: false, splitter: false, exhaust: 2, chrome: true, sideGlass: true,
  },
  // Exotic supercar — very low wedge, mid-engine deck, big wing (Lambo vibe)
  super: {
    width: 2.04, tub: [
      [2.4, 0.30], [2.3, 0.16], [2.0, 0.12], [-2.05, 0.12], [-2.3, 0.34],
      [-2.3, 0.66], [-0.7, 0.72], [0.2, 0.66], [1.55, 0.40],
    ],
    glass: [[0.2, 0.66], [-0.2, 0.92], [-1.0, 0.92], [-1.25, 0.62]],
    glassW: 1.74, wheelR: 0.42, tireW: 0.36, axle: [1.45, -1.5], track: 1.0,
    rim: '#1b1d22', spokes: 5, paint: { clearcoat: 1, rough: 0.22, metal: 0.7, cc: 0.03 },
    wing: 'gt', splitter: true, exhaust: 4, intakes: true, carbon: true, sideGlass: false,
  },
};

export const CAR_TYPES = Object.keys(TYPES);

export function buildCar(type = 'hatch', color = '#3a8d54') {
  const s = TYPES[type] || TYPES.hatch;
  const g = new THREE.Group();
  const pm = paintMat(color, s.paint);

  // body + greenhouse
  g.add(bodyMesh(s.tub, s.width, pm, type === 'super' ? 0.03 : 0.06));
  const glassGeoMat = glassMat();
  const cabin = bodyMesh(s.glass, s.glassW, glassGeoMat, 0.02);
  g.add(cabin);
  // body-colour roof cap so the greenhouse isn't pure glass
  const roof = bodyMesh(s.glass.map(([x, y]) => [x, y]), s.glassW * 1.005, pm, 0.02);
  roof.scale.y = 1.0; roof.position.y = 0.02;
  // thin roof slab on top of cabin
  const roofTop = s.glass.reduce((a, p) => Math.max(a, p[1]), 0);
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(s.glassW * 0.96,
    type === 'super' ? 0.04 : 0.06, Math.abs(s.glass[1][0] - s.glass[2][0]) + 0.1), pm);
  roofSlab.position.set(0, roofTop + 0.005, (s.glass[1][0] + s.glass[2][0]) / 2);
  roofSlab.castShadow = true; g.add(roofSlab);

  // rocker/side skirt for a planted stance
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(s.width * 1.01, 0.12,
    Math.abs(s.tub[0][0]) + Math.abs(s.tub[4][0]) - 0.5),
    s.carbon ? carbonMat() : pm);
  skirt.position.y = 0.24; g.add(skirt);

  // wheels + arches
  const wheelDefs = [];
  [s.axle[0], s.axle[1]].forEach(z => {
    [-1, 1].forEach(sx => {
      const w = wheel(s.wheelR, s.tireW, s.rim, s.spokes);
      w.position.set(sx * s.track, s.wheelR, z);
      g.add(w); wheelDefs.push(w);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(s.wheelR + 0.06, 0.06, 8, 16, Math.PI),
        s.carbon ? carbonMat() : pm);
      arch.position.set(sx * (s.track + s.tireW / 2 - 0.02), s.wheelR + 0.02, z);
      arch.rotation.y = Math.PI / 2; arch.rotation.x = Math.PI; g.add(arch);
    });
  });

  const frontZ = Math.max(...s.tub.map(p => p[0]));
  const rearZ = Math.min(...s.tub.map(p => p[0]));

  // headlights (front, +Z) + taillights (rear, -Z)
  [-1, 1].forEach(sx => {
    const hl = lamp('#eaf4ff', '#cfe4ff', 0.34, type === 'super' ? 0.1 : 0.16, 0.9);
    hl.position.set(sx * s.width * 0.32, s.tub[0][1] - 0.04, frontZ - 0.02); g.add(hl);
    const tl = lamp('#3a0a0a', '#ff2a2a', 0.4, 0.12, 1.0);
    tl.position.set(sx * s.width * 0.3, s.tub[5][1] - 0.06, rearZ + 0.02); g.add(tl);
  });
  // taillight bar for sedan/super
  if (s.chrome || s.carbon) {
    const bar = lamp('#3a0a0a', '#ff2a2a', s.width * 0.7, 0.06, 0.8);
    bar.position.set(0, s.tub[5][1] - 0.02, rearZ + 0.01); g.add(bar);
  }

  // grille / front splitter
  if (s.splitter) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.98, 0.05, 0.3), carbonMat());
    sp.position.set(0, 0.16, frontZ - 0.05); g.add(sp);
  }
  // chrome window trim + grille for the lux sedan
  if (s.chrome) {
    const grille = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.5, 0.18, 0.06), chromeMat());
    grille.position.set(0, s.tub[0][1] - 0.04, frontZ); g.add(grille);
  }

  // side intakes for the exotic
  if (s.intakes) {
    [-1, 1].forEach(sx => {
      const intk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.9), carbonMat());
      intk.position.set(sx * (s.width / 2 + 0.01), 0.46, -0.7); g.add(intk);
    });
  }

  // rear wing
  if (s.wing === 'gt') {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.1), carbonMat());
    [-1, 1].forEach(sx => { const st = stand.clone(); st.position.set(sx * 0.55, s.tub[5][1] + 0.18, rearZ + 0.25); g.add(st); });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.95, 0.05, 0.42), carbonMat());
    blade.position.set(0, s.tub[5][1] + 0.36, rearZ + 0.25); blade.rotation.x = -0.12; blade.castShadow = true; g.add(blade);
  } else if (s.wing === 'lip') {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.92, 0.05, 0.18), pm);
    lip.position.set(0, s.tub[5][1] + 0.02, rearZ + 0.04); lip.rotation.x = -0.2; g.add(lip);
  }

  // exhaust tips
  const exM = chromeMat();
  for (let i = 0; i < (s.exhaust || 1); i++) {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), exM);
    tip.rotation.x = Math.PI / 2;
    const spread = (s.exhaust === 4) ? [-0.5, -0.28, 0.28, 0.5][i]
      : (s.exhaust === 2) ? [-0.32, 0.32][i] : [0][i];
    tip.position.set(spread, 0.26, rearZ - 0.04); g.add(tip);
  }

  // side mirrors
  [-1, 1].forEach(sx => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), pm);
    arm.position.set(sx * (s.width / 2 + 0.08), s.glass[0][1] - 0.05, s.glass[0][0] - 0.1); g.add(arm);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.06), pm);
    cap.position.set(sx * (s.width / 2 + 0.16), s.glass[0][1] - 0.02, s.glass[0][0] - 0.12); g.add(cap);
  });

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.wheels = wheelDefs;
  g.userData.type = type;
  return g;
}
