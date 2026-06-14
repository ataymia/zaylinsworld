// ───────────────────────────────────────────────────────────────────────────
//  interiors.js — real, walkable 3D interiors for every enterable building.
//  Each interior has floor/walls/props, NPCs, interaction stations, colliders,
//  a spawn point and an exit. Interiors live far from the city (offset) and are
//  shown only while the player is inside.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { buildAvatar } from './avatar.js';
import { buildCar } from './vehicles.js';

function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: o.rough ?? 0.9, metalness: o.metal ?? 0,
    flatShading: o.flat ?? false,
    side: o.side ?? THREE.FrontSide,
    emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color('#000'),
    emissiveIntensity: o.emissiveIntensity ?? 1,
  });
}
function box(w, h, d, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.castShadow = true; b.receiveShadow = true; return b; }

// floating text tag (sprite)
function tag(text, color = '#ffffff', sub = '') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(10,10,18,.85)'; roundRect(ctx, 6, 6, 500, 148, 18); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 5; roundRect(ctx, 6, 6, 500, 148, 18); ctx.stroke();
  ctx.fillStyle = color; ctx.font = 'bold 52px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, sub ? 58 : 82);
  if (sub) { ctx.fillStyle = '#dfe7ff'; ctx.font = '36px Arial'; ctx.fillText(sub, 256, 112); }
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  spr.scale.set(2.4, 0.75, 1);
  return spr;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// Build a rectangular room with a doorway gap on the +Z (front) wall.
// Returns { group, colliders, spawn, exit }
function buildRoom(cx, cz, w, d, floorColor, wallColor, ceilColor = '#1a1a24') {
  const group = new THREE.Group();
  const colliders = [];
  const wallH = 3.4, t = 0.3;

  // Shell pieces are DoubleSided so the third-person camera never reveals the
  // "void" by seeing through a back-facing wall from just outside the room.
  const floor = box(w, 0.2, d, mat(floorColor, { rough: 0.95, side: THREE.DoubleSide }));
  floor.position.set(cx, -0.1, cz); group.add(floor);
  const ceil = box(w, 0.2, d, mat(ceilColor, { side: THREE.DoubleSide }));
  ceil.position.set(cx, wallH, cz); group.add(ceil);

  const wm = mat(wallColor, { rough: 0.97, side: THREE.DoubleSide });
  const addWall = (x, z, ww, dd) => {
    const wall = box(ww, wallH, dd, wm); wall.position.set(x, wallH / 2, z); group.add(wall);
    const bb = new THREE.Box3().setFromObject(wall); colliders.push(bb);
  };
  addWall(cx, cz - d / 2, w, t);              // back
  addWall(cx - w / 2, cz, t, d);              // left
  addWall(cx + w / 2, cz, t, d);              // right
  // front wall split into two segments leaving a 3-wide doorway in the middle
  const gap = 3;
  const segW = (w - gap) / 2;
  addWall(cx - (gap / 2 + segW / 2), cz + d / 2, segW, t);
  addWall(cx + (gap / 2 + segW / 2), cz + d / 2, segW, t);

  // ceiling lights
  for (let lx = -1; lx <= 1; lx++) {
    const pl = new THREE.PointLight('#fff4dd', 14, 24, 1.8);
    pl.position.set(cx + lx * (w / 3), wallH - 0.4, cz); group.add(pl);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 1.2),
      new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4cc', emissiveIntensity: 1.2 }));
    bulb.position.set(cx + lx * (w / 3), wallH - 0.15, cz); group.add(bulb);
  }
  group.add(tag('— EXIT —', '#ff9a9a').translateX(cx).translateY(2.6).translateZ(cz + d / 2 - 0.4));

  const spawn = new THREE.Vector3(cx, 0, cz + d / 2 - 3.4);
  const exit = new THREE.Vector3(cx, 0, cz + d / 2 - 1.0);
  return { group, colliders, spawn, exit };
}

function staticNPC(custom, x, z, ry) {
  const av = buildAvatar(custom);
  av.group.position.set(x, 0, z);
  av.group.rotation.y = ry ?? 0;
  return av;
}

function showroomCar(color, type = 'hatch') {
  return buildCar(type, color);
}

function displayCase(x, z, itemColor, iced = false) {
  const g = new THREE.Group();
  const base = box(1.2, 0.9, 0.7, mat('#15151c', { rough: 0.5 }));
  base.position.set(x, 0.45, z); g.add(base);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.7), new THREE.MeshPhysicalMaterial({
    color: '#cfe8ff', transparent: true, opacity: 0.12, roughness: 0.02, metalness: 0,
    transmission: 0.9, ior: 1.5, thickness: 0.2, clearcoat: 1, envMapIntensity: 1.4 }));
  glass.position.set(x, 1.25, z); g.add(glass);
  // a glittering item inside — physical gold + faceted gem
  const gold = new THREE.MeshPhysicalMaterial({ color: iced ? '#e8edf2' : '#f4cf5a',
    metalness: 1, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.7 });
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.032, 10, 28), gold);
  chain.rotation.x = Math.PI / 2; chain.position.set(x, 1.2, z); g.add(chain);
  if (iced) {
    const gemM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0,
      transmission: 0.9, ior: 2.4, thickness: 0.3, clearcoat: 1, envMapIntensity: 2.0,
      emissive: '#bfe3ff', emissiveIntensity: 0.15 });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), gemM);
    gem.position.set(x, 1.05, z); g.add(gem);
  }
  // soft spotlight to make the piece pop
  const spot = new THREE.PointLight(iced ? '#cfe8ff' : '#fff0c0', 6, 3, 2);
  spot.position.set(x, 1.7, z); g.add(spot);
  return g;
}

function shelf(x, z, ry, n = 4) {
  const g = new THREE.Group();
  const frame = box(3.2, 2.4, 0.4, mat('#2a2230')); frame.position.y = 1.2; g.add(frame);
  for (let i = 0; i < n; i++) {
    const boxItem = box(0.5, 0.4, 0.3, mat(['#6b6b80', '#705a4a', '#4a6b5a', '#5a4a6b'][i % 4]));
    boxItem.position.set(-1 + (i % 3) * 1, 0.5 + Math.floor(i / 3) * 0.9, 0.25); g.add(boxItem);
  }
  g.position.set(x, 0, z); g.rotation.y = ry; return g;
}

// Offsets for each interior so they never overlap or collide with the city.
const OFFS = {
  dealership: new THREE.Vector3(2000, 0, 0),
  frostbox:   new THREE.Vector3(2100, 0, 0),
  blocksupply:new THREE.Vector3(2200, 0, 0),
  chicken:    new THREE.Vector3(2300, 0, 0),
  home:       new THREE.Vector3(2400, 0, 0),
  kicks:      new THREE.Vector3(2500, 0, 0),
  gym:        new THREE.Vector3(2600, 0, 0),
  school:     new THREE.Vector3(2700, 0, 0),
  office:     new THREE.Vector3(2800, 0, 0),
  garage:     new THREE.Vector3(2900, 0, 0),
};

export const DEALER_CARS = [
  { id: 'cityhatch',  name: 'City Hatch',   price: 3500,  color: '#3a8d54', type: 'hatch', super: false, top: 120, assetSlot: 'car_starter' },
  { id: 'sportcoupe', name: 'Sport Coupe',  price: 13000, color: '#c0392b', type: 'coupe', super: false, top: 165, assetSlot: 'car_supercar_01' },
  { id: 'luxsedan',   name: 'Lux Sedan',    price: 26000, color: '#1c2433', type: 'sedan', super: false, top: 150, assetSlot: 'car_sedan' },
  { id: 'phantomgt',  name: 'Phantom GT',   price: 68000, color: '#e7c14a', type: 'super', super: true,  top: 210, assetSlot: 'car_hypercar_01' },
  { id: 'vipersx',    name: 'Viper SX',     price: 92000, color: '#1f8a6b', type: 'super', super: true,  top: 225, assetSlot: 'car_supercar_01' },
];

export const JEWELRY_STOCK = [
  { id: 'rope',   name: 'Gold Rope Chain', price: 1200,  jewelry: 'chain' },
  { id: 'cuban',  name: 'Cuban Link',      price: 4500,  jewelry: 'cuban' },
  { id: 'iced',   name: 'Iced Pendant',    price: 9500,  jewelry: 'iced' },
];

export const GEAR_STOCK = [
  { id: 'pack',    name: 'City Backpack',   price: 220,  info: 'Carry more loot around town.' },
  { id: 'radio',   name: 'Block Radio',     price: 140,  info: 'Stay in touch with the crew.' },
  { id: 'shades',  name: 'Night Shades',    price: 90,   info: 'Look cool after dark.' },
  { id: 'kneepads',name: 'Skate Pads',      price: 60,   info: 'Fewer scrapes on the grind.' },
  { id: 'toolkit', name: 'Repair Toolkit',  price: 360,  info: 'Patch up your ride at home.' },
];

// Build all interiors. Returns { group, byId }.
export function buildInteriors() {
  const root = new THREE.Group();
  root.visible = false;
  const byId = {};

  // ── DEALERSHIP ──────────────────────────────────────────────────────────
  {
    const o = OFFS.dealership;
    const r = buildRoom(o.x, o.z, 24, 18, '#3a3a46', '#22222e', '#101018');
    root.add(r.group);
    // shiny showroom floor stripe
    const stripe = box(20, 0.02, 2, mat('#1f1f2a', { metal: 0.4, rough: 0.3 }));
    stripe.position.set(o.x, 0.02, o.z); r.group.add(stripe);
    // reception desk
    const desk = box(4, 1.1, 1.4, mat('#2c3e6b', { rough: 0.5 }));
    desk.position.set(o.x + 8, 0.55, o.z - 6); r.group.add(desk);
    r.colliders.push(new THREE.Box3().setFromObject(desk));
    const npc = staticNPC({ skin: 'chestnut', face: 'square', body: 'athletic', height: 'tall',
      hair: 'taper-fade', hairColor: 'jet', top: 'jacket-tan', bottom: 'jeans-black',
      shoes: 'sneak-white', accessory: 'shades', jewelry: 'chain' }, o.x + 8, o.z - 6.9, Math.PI);
    r.group.add(npc.group);

    const stations = [];
    const carMeshes = [];
    const displayCars = [];
    DEALER_CARS.forEach((car, i) => {
      const cx = o.x - 8 + (i % 3) * 7;
      const cz = o.z - 4 + Math.floor(i / 3) * 6;
      const m = showroomCar(car.color, car.type);
      m.position.set(cx, 0, cz); m.rotation.y = Math.PI * 0.15;
      r.group.add(m); carMeshes.push(m);
      displayCars.push({ group: m, slot: car.assetSlot });
      const t = tag(car.name, '#9fe8ff', '$' + car.price.toLocaleString());
      t.position.set(cx, 2.4, cz); t.scale.set(2.8, 0.9, 1); r.group.add(t);
      stations.push({ id: 'car-' + car.id, type: 'dealer-car', pos: new THREE.Vector3(cx, 0, cz + 2.4),
        label: `View ${car.name} — $${car.price.toLocaleString()}`, data: car, mesh: m });
    });

    byId.dealership = {
      id: 'dealership', name: 'Auto Haus', offset: o,
      spawn: r.spawn, exit: r.exit, colliders: r.colliders,
      avatars: [npc], npcSlot: 'npc_basic_01', displayCars,
      npcs: [{ name: 'Reggie', role: 'salesman', pos: new THREE.Vector3(o.x + 8, 0, o.z - 5.8),
        dialogue: 'dealer' }],
      stations,
    };
  }

  // ── FROSTBOX (jewelry) ──────────────────────────────────────────────────
  {
    const o = OFFS.frostbox;
    const r = buildRoom(o.x, o.z, 16, 12, '#1c2030', '#101725', '#0a0e18');
    root.add(r.group);
    // display cases along the walls
    [[-5, -3, false], [-2, -3, true], [1, -3, false], [4, -3, true]].forEach(([dx, dz, iced]) =>
      r.group.add(displayCase(o.x + dx, o.z + dz, '#e7c14a', iced)));
    // counter
    const counter = box(5, 1.1, 1.2, mat('#15151c', { metal: 0.3, rough: 0.3 }));
    counter.position.set(o.x - 4, 0.55, o.z + 2); r.group.add(counter);
    r.colliders.push(new THREE.Box3().setFromObject(counter));
    const npc = staticNPC({ skin: 'espresso', face: 'oval', body: 'average', height: 'average',
      hair: 'locs', hairColor: 'jet', top: 'puffer-pur', bottom: 'jeans-black',
      shoes: 'sneak-black', accessory: 'earring', jewelry: 'iced' }, o.x - 4, o.z + 1.2, 0);
    r.group.add(npc.group);
    r.group.add(tag('FROSTBOX', '#9fe8ff').translateX(o.x).translateY(2.7).translateZ(o.z - 5.6));

    byId.frostbox = {
      id: 'frostbox', name: 'Frostbox', offset: o,
      spawn: r.spawn, exit: r.exit, colliders: r.colliders,
      avatars: [npc], npcSlot: 'npc_shopkeeper_frostbox',
      jewelryMounts: {
        displayCase: new THREE.Vector3(o.x + 5.4, 0, o.z - 3),
        chain:       new THREE.Vector3(o.x + 5.4, 1.35, o.z - 3),
        pendant:     new THREE.Vector3(o.x - 4, 1.2, o.z + 2),
        gem:         new THREE.Vector3(o.x + 3, 1.4, o.z + 2.6),
        // back-wall gem merchandise rack: a centred grid of gem sprites, faced
        // into the room (+z), filled in by main.js from the gem texture set.
        gemWall:     { x: o.x, y: 1.7, z: o.z - 5.7, faceZ: 1, spread: 9, rows: 2 },
      },
      npcs: [{ name: 'Ice', role: 'jeweler', pos: new THREE.Vector3(o.x - 4, 0, o.z + 1.4), dialogue: 'jeweler' }],
      stations: [
        { id: 'chain-builder', type: 'chain-builder', pos: new THREE.Vector3(o.x + 3, 0, o.z + 1.5),
          label: 'Open Custom Chain Builder' },
        { id: 'jewel-cases', type: 'jewelry-shop', pos: new THREE.Vector3(o.x, 0, o.z - 1.6),
          label: 'Browse Jewelry Cases' },
      ],
    };
    // a "builder station" pedestal
    const ped = box(1.4, 1.0, 1.4, mat('#2c3e6b', { metal: 0.4, rough: 0.3 }));
    ped.position.set(o.x + 3, 0.5, o.z + 2.6); r.group.add(ped);
  }

  // ── BLOCK SUPPLY (gear) ─────────────────────────────────────────────────
  {
    const o = OFFS.blocksupply;
    const r = buildRoom(o.x, o.z, 16, 12, '#2a2230', '#1a1422', '#120c18');
    root.add(r.group);
    r.group.add(shelf(o.x - 6, o.z - 4, 0));
    r.group.add(shelf(o.x, o.z - 4, 0));
    r.group.add(shelf(o.x + 6, o.z - 4, 0));
    const counter = box(5, 1.1, 1.2, mat('#3a2c15', { rough: 0.6 }));
    counter.position.set(o.x + 3, 0.55, o.z + 2); r.group.add(counter);
    r.colliders.push(new THREE.Box3().setFromObject(counter));
    // ── locked weapons display wall (right side) ──
    {
      const rack = box(0.4, 2.6, 5, mat('#20242c', { metal: 0.3, rough: 0.5 }));
      rack.position.set(o.x + 7.4, 1.3, o.z); r.group.add(rack);
      r.colliders.push(new THREE.Box3().setFromObject(rack));
      // silhouette weapons mounted on the wall (decorative)
      const steel = mat('#3a3f48', { metal: 0.8, rough: 0.35 });
      for (let i = 0; i < 3; i++) {
        const body = box(0.12, 0.18, 1.1 + i * 0.25, steel);
        body.position.set(o.x + 7.15, 1.9 - i * 0.55, o.z); r.group.add(body);
        const grip = box(0.12, 0.32, 0.16, steel);
        grip.position.set(o.x + 7.15, 1.72 - i * 0.55, o.z + 0.5 + i * 0.12); r.group.add(grip);
      }
      r.group.add(tag('ARMS DEALER', '#ff9f6b').translateX(o.x + 6.6).translateY(2.75).translateZ(o.z));
    }
    const npc = staticNPC({ skin: 'umber', face: 'round', body: 'heavy', height: 'average',
      hair: 'cornrows', hairColor: 'jet', top: 'jersey-grn', bottom: 'cargo-tan',
      shoes: 'boots-tan', accessory: 'none', jewelry: 'chain' }, o.x + 3, o.z + 1.2, 0);
    r.group.add(npc.group);

    byId.blocksupply = {
      id: 'blocksupply', name: 'Block Supply', offset: o,
      spawn: r.spawn, exit: r.exit, colliders: r.colliders,
      avatars: [npc], npcSlot: 'npc_basic_01',
      npcs: [{ name: 'Gov', role: 'gear', pos: new THREE.Vector3(o.x + 3, 0, o.z + 1.4), dialogue: 'gear' }],
      stations: [
        { id: 'gear-shop', type: 'gear-shop', pos: new THREE.Vector3(o.x, 0, o.z - 1.8),
          label: 'Shop Block Supply Gear' },
        { id: 'weapon-shop', type: 'weapon-shop', pos: new THREE.Vector3(o.x + 5.6, 0, o.z),
          label: 'Browse Weapons Counter' },
      ],
    };
  }

  // ── CHICKEN SPOT ──────────────────────────────────────────────────────────
  {
    const o = OFFS.chicken;
    const r = buildRoom(o.x, o.z, 16, 12, '#caa37a', '#8a5a3a', '#3a2a1a');
    root.add(r.group);
    // service counter
    const counter = box(7, 1.1, 1.3, mat('#b5302a', { rough: 0.5 }));
    counter.position.set(o.x, 0.55, o.z - 2.5); r.group.add(counter);
    r.colliders.push(new THREE.Box3().setFromObject(counter));
    // back kitchen: fryers + hood
    const hood = box(7, 0.6, 1.4, mat('#444')); hood.position.set(o.x, 2.6, o.z - 4.6); r.group.add(hood);
    for (let i = -1; i <= 1; i++) {
      const fryer = box(1.1, 1.0, 1.0, mat('#777', { metal: 0.4, rough: 0.4 }));
      fryer.position.set(o.x + i * 1.8, 0.5, o.z - 4.4); r.group.add(fryer);
    }
    // menu board
    r.group.add(tag('CHICKEN — $8', '#ffcf3f').translateX(o.x).translateY(2.7).translateZ(o.z - 5.6));
    // tables + seats
    for (let i = -1; i <= 1; i++) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.9, 14), mat('#caa', { rough: 0.6 }));
      t.position.set(o.x + i * 3, 0.45, o.z + 2.5); r.group.add(t);
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 12), mat('#8a5a3a'));
      seat.position.set(o.x + i * 3, 0.25, o.z + 3.6); r.group.add(seat);
    }
    const npc = staticNPC({ skin: 'caramel', face: 'oval', body: 'average', height: 'short',
      hair: 'twists', hairColor: 'jet', top: 'tee-white', bottom: 'jeans-black',
      shoes: 'sneak-white', accessory: 'none', jewelry: 'none' }, o.x, o.z - 3.4, 0);
    r.group.add(npc.group);

    byId.chicken = {
      id: 'chicken', name: 'Chicken Spot', offset: o,
      spawn: r.spawn, exit: r.exit, colliders: r.colliders,
      avatars: [npc], npcSlot: 'npc_basic_02',
      npcs: [{ name: 'Tasha', role: 'cashier', pos: new THREE.Vector3(o.x, 0, o.z - 1.4), dialogue: 'cashier' }],
      stations: [
        { id: 'food-buy', type: 'food-buy', pos: new THREE.Vector3(o.x + 2.5, 0, o.z - 1.4), label: 'Buy Chicken ($8)' },
        { id: 'food-eat', type: 'food-eat', pos: new THREE.Vector3(o.x + 3, 0, o.z + 2.5), label: 'Sit & Eat Chicken' },
        { id: 'work-shift', type: 'work-shift', pos: new THREE.Vector3(o.x - 3, 0, o.z + 2.5), label: 'Work a Shift (+$55)' },
      ],
    };
  }

  // ── HOME (+ bathroom) ─────────────────────────────────────────────────────
  {
    const o = OFFS.home;
    const r = buildRoom(o.x, o.z, 18, 14, '#cfc4a8', '#6b5d3a', '#2a2418');
    root.add(r.group);
    // divider wall creating a bathroom in the back-right
    const div = box(0.3, 3.4, 6, mat('#5a4d2e')); div.position.set(o.x + 3, 1.7, o.z - 4); r.group.add(div);
    r.colliders.push(new THREE.Box3().setFromObject(div));
    const div2 = box(6, 3.4, 0.3, mat('#5a4d2e')); div2.position.set(o.x + 6, 1.7, o.z - 1); r.group.add(div2);
    r.colliders.push(new THREE.Box3().setFromObject(div2));
    // living area: couch + tv
    const couch = box(3, 0.8, 1.2, mat('#3a5a8a')); couch.position.set(o.x - 5, 0.4, o.z + 3); r.group.add(couch);
    const tv = box(2.4, 1.4, 0.2, mat('#111', { emissive: '#1a3a6b', emissiveIntensity: 0.6 }));
    tv.position.set(o.x - 5, 1.6, o.z - 5.8); r.group.add(tv);
    // bed (spawn corner)
    const bed = box(2.4, 0.5, 4, mat('#5a3a6b')); bed.position.set(o.x - 6, 0.25, o.z - 3); r.group.add(bed);
    const pillow = box(2.2, 0.25, 0.9, mat('#eee')); pillow.position.set(o.x - 6, 0.55, o.z - 4.6); r.group.add(pillow);
    // closet
    const closet = box(2, 2.4, 1, mat('#7a5a32')); closet.position.set(o.x + 1, 1.2, o.z + 5.4); r.group.add(closet);
    r.colliders.push(new THREE.Box3().setFromObject(closet));
    // safe
    const safe = box(1, 1, 1, mat('#2a2a30', { metal: 0.5, rough: 0.4 })); safe.position.set(o.x - 8, 0.5, o.z + 5.4); r.group.add(safe);
    // bathroom: mirror, sink, toilet
    const mirror = box(1.6, 1.6, 0.1, new THREE.MeshStandardMaterial({ color: '#aee', metalness: 0.9, roughness: 0.05 }));
    mirror.position.set(o.x + 8.7, 1.7, o.z - 4); mirror.rotation.y = -Math.PI / 2; r.group.add(mirror);
    const sink = box(1.0, 0.2, 0.6, mat('#fff')); sink.position.set(o.x + 8, 0.95, o.z - 4); r.group.add(sink);
    const sinkLeg = box(0.3, 0.95, 0.3, mat('#ddd')); sinkLeg.position.set(o.x + 8, 0.47, o.z - 4); r.group.add(sinkLeg);
    const toilet = box(0.7, 0.7, 0.9, mat('#f2f2f2')); toilet.position.set(o.x + 5, 0.35, o.z - 5.4); r.group.add(toilet);
    r.group.add(tag('BATHROOM', '#bfe3ff').translateX(o.x + 6).translateY(2.7).translateZ(o.z - 6));

    byId.home = {
      id: 'home', name: "Zaylen's Home", offset: o,
      spawn: r.spawn, exit: r.exit, colliders: r.colliders,
      npcs: [],
      stations: [
        { id: 'rest', type: 'rest', pos: new THREE.Vector3(o.x - 6, 0, o.z - 1), label: 'Sleep & Restore Energy' },
        { id: 'wardrobe', type: 'wardrobe', pos: new THREE.Vector3(o.x + 1, 0, o.z + 4.2), label: 'Open Closet / Wardrobe' },
        { id: 'safe', type: 'safe', pos: new THREE.Vector3(o.x - 8, 0, o.z + 4.2), label: 'Check Safe / Storage' },
        { id: 'mirror-cut', type: 'mirror-cut', pos: new THREE.Vector3(o.x + 7.5, 0, o.z - 4), label: 'Use Clippers (Hairline Mini-game)' },
      ],
    };
  }

  // ── KICKS & FITS (clothing/sneakers) ──────────────────────────────────────
  {
    const o = OFFS.kicks;
    const r = buildRoom(o.x, o.z, 16, 12, '#2c3a32', '#1a2620', '#0e160f');
    root.add(r.group);
    // sneaker wall (cubbies)
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
      const shoe = box(0.7, 0.4, 0.5, mat(['#f0f0f0', '#c02626', '#161616', '#2b4fb2'][(i + j) % 4]));
      shoe.position.set(o.x - 4 + i * 2, 0.6 + j * 0.9, o.z - 5.6); r.group.add(shoe);
    }
    // clothing racks
    for (let i = -1; i <= 1; i++) {
      const rack = box(2.4, 0.1, 0.1, mat('#999')); rack.position.set(o.x + i * 3, 1.8, o.z + 1); r.group.add(rack);
      for (let k = 0; k < 4; k++) {
        const shirt = box(0.5, 0.9, 0.2, mat(['#b22b2b', '#2b4fb2', '#1f8a4c', '#5a2b8a'][k]));
        shirt.position.set(o.x + i * 3 - 0.9 + k * 0.6, 1.2, o.z + 1); r.group.add(shirt);
      }
    }
    const npc = staticNPC({ skin: 'honey', face: 'oval', body: 'slim', height: 'tall',
      hair: 'high-top-fade', hairColor: 'auburn', top: 'hoodie-blue', bottom: 'jeans-blue',
      shoes: 'sneak-red', accessory: 'shades', jewelry: 'cuban' }, o.x + 5, o.z - 2, Math.PI * 0.8);
    r.group.add(npc.group);

    byId.kicks = {
      id: 'kicks', name: 'Kicks & Fits', offset: o,
      spawn: r.spawn, exit: r.exit, colliders: r.colliders,
      avatars: [npc], npcSlot: 'npc_basic_02',
      npcs: [{ name: 'Drip', role: 'stylist', pos: new THREE.Vector3(o.x + 5, 0, o.z - 1.6), dialogue: 'stylist' }],
      stations: [
        { id: 'wardrobe-store', type: 'wardrobe', pos: new THREE.Vector3(o.x, 0, o.z + 2), label: 'Try On Fits (Wardrobe)' },
      ],
    };
  }

  // ── IRON CITY GYM ──────────────────────────────────────────────────────────
  {
    const o = OFFS.gym;
    const r = buildRoom(o.x, o.z, 18, 14, '#2a2c33', '#1a1c22', '#0f1014');
    root.add(r.group);
    // rubber-mat workout floor
    const matFloor = box(12, 0.04, 8, mat('#222630', { rough: 0.95 }));
    matFloor.position.set(o.x, 0.04, o.z); r.group.add(matFloor);
    // weight rack with dumbbells
    const rack = box(4, 1.0, 0.6, mat('#33373f', { metal: 0.4, rough: 0.4 }));
    rack.position.set(o.x - 6, 0.5, o.z - 5.4); r.group.add(rack);
    r.colliders.push(new THREE.Box3().setFromObject(rack));
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), mat('#888', { metal: 0.7, rough: 0.3 }));
      bar.rotation.z = Math.PI / 2; bar.position.set(o.x - 6 + i * 0.7, 1.05, o.z - 5.4); r.group.add(bar);
      [-0.45, 0.45].forEach(s => { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 14), mat('#15161a', { rough: 0.7 }));
        pl.rotation.z = Math.PI / 2; pl.position.set(o.x - 6 + i * 0.7 + s, 1.05, o.z - 5.4); r.group.add(pl); });
    }
    // bench press
    const bench = box(0.6, 0.5, 2.0, mat('#a02a2a', { rough: 0.6 }));
    bench.position.set(o.x - 2, 0.5, o.z + 1); r.group.add(bench);
    r.colliders.push(new THREE.Box3().setFromObject(bench));
    const benchBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), mat('#999', { metal: 0.7 }));
    benchBar.rotation.z = Math.PI / 2; benchBar.position.set(o.x - 2, 1.05, o.z + 0.4); r.group.add(benchBar);
    // treadmill
    const tread = box(1.2, 0.4, 2.2, mat('#1a1c22', { rough: 0.8 }));
    tread.position.set(o.x + 5, 0.2, o.z); r.group.add(tread);
    r.colliders.push(new THREE.Box3().setFromObject(tread));
    const treadConsole = box(1.2, 1.0, 0.2, mat('#101218', { emissive: '#1b3a5a', emissiveIntensity: 0.5 }));
    treadConsole.position.set(o.x + 5, 1.0, o.z - 1.0); r.group.add(treadConsole);
    // mirror wall
    const gmirror = box(8, 2.6, 0.1, new THREE.MeshStandardMaterial({ color: '#9fb6c9', metalness: 0.9, roughness: 0.08 }));
    gmirror.position.set(o.x, 1.5, o.z - 6.85); r.group.add(gmirror);
    r.group.add(tag('IRON CITY GYM', '#ff9f9f').translateX(o.x).translateY(2.75).translateZ(o.z - 6.6));
    const trainer = staticNPC({ skin: 'mahogany', face: 'square', body: 'athletic', height: 'tall',
      hair: 'low-fade', hairColor: 'jet', top: 'tee-black', bottom: 'sweats-gray',
      shoes: 'sneak-black', accessory: 'headband', jewelry: 'none' }, o.x + 5, o.z + 3, Math.PI);
    r.group.add(trainer.group);

    byId.gym = {
      id: 'gym', name: 'Iron City Gym', offset: o,
      spawn: r.spawn, exit: r.exit, colliders: r.colliders,
      avatars: [trainer], npcSlot: 'npc_basic_01',
      npcs: [{ name: 'Coach Mray', role: 'trainer', pos: new THREE.Vector3(o.x + 5, 0, o.z + 2.2), dialogue: 'trainer' }],
      stations: [
        { id: 'workout-weights', type: 'workout', pos: new THREE.Vector3(o.x - 2, 0, o.z + 2.6), label: 'Hit the Bench (Workout)' },
        { id: 'workout-tread', type: 'workout', pos: new THREE.Vector3(o.x + 5, 0, o.z + 1.6), label: 'Run the Treadmill (Workout)' },
      ],
    };
  }

  // ── SCHOOL ──────────────────────────────────────────────────────────────────
  {
    const o = OFFS.school;
    const r = buildRoom(o.x, o.z, 18, 14, '#cdbb94', '#7a6a4a', '#2a241a');
    root.add(r.group);
    // chalkboard
    const board = box(6, 2.0, 0.12, mat('#1e3326', { rough: 0.9 }));
    board.position.set(o.x, 1.7, o.z - 6.85); r.group.add(board);
    r.group.add(tag('ZAYLIN PREP', '#b9ffd6').translateX(o.x).translateY(2.75).translateZ(o.z - 6.6));
    // teacher desk
    const tdesk = box(2.4, 1.0, 1.0, mat('#5a4326', { rough: 0.6 }));
    tdesk.position.set(o.x, 0.5, o.z - 4.6); r.group.add(tdesk);
    r.colliders.push(new THREE.Box3().setFromObject(tdesk));
    // student desks grid
    for (let gx = -1; gx <= 1; gx++) for (let gz = 0; gz < 3; gz++) {
      const d = box(1.0, 0.7, 0.7, mat('#8a6a3a', { rough: 0.6 }));
      d.position.set(o.x + gx * 2.6, 0.35, o.z - 1.5 + gz * 2.0); r.group.add(d);
      const ch = box(0.6, 0.5, 0.6, mat('#3a3f55'));
      ch.position.set(o.x + gx * 2.6, 0.25, o.z - 0.7 + gz * 2.0); r.group.add(ch);
    }
    const teacher = staticNPC({ skin: 'chestnut', face: 'oval', body: 'average', height: 'average',
      hair: 'twists', hairColor: 'darkbr', top: 'jacket-tan', bottom: 'jeans-black',
      shoes: 'boots-tan', accessory: 'glasses', jewelry: 'none' }, o.x, o.z - 3.6, 0);
    r.group.add(teacher.group);

    byId.school = {
      id: 'school', name: 'Zaylin Prep', offset: o,
      spawn: r.spawn, exit: r.exit, colliders: r.colliders,
      avatars: [teacher], npcSlot: 'npc_basic_02',
      npcs: [{ name: 'Ms. Okafor', role: 'teacher', pos: new THREE.Vector3(o.x, 0, o.z - 2.8), dialogue: 'teacher' }],
      stations: [
        { id: 'study-desk', type: 'study', pos: new THREE.Vector3(o.x, 0, o.z + 0.5), label: 'Take a Seat & Study' },
      ],
    };
  }

  // ── OFFICE / JOB ────────────────────────────────────────────────────────────
  {
    const o = OFFS.office;
    const r = buildRoom(o.x, o.z, 18, 14, '#3a4150', '#262b36', '#14171e');
    root.add(r.group);
    // carpet
    const carpet = box(14, 0.03, 10, mat('#2b3140', { rough: 0.95 }));
    carpet.position.set(o.x, 0.03, o.z); r.group.add(carpet);
    // cubicle desks with monitors
    for (let i = 0; i < 4; i++) {
      const dx = o.x - 4.5 + (i % 2) * 9;
      const dz = o.z - 3 + Math.floor(i / 2) * 5;
      const desk = box(2.6, 0.9, 1.3, mat('#5a6172', { rough: 0.6 }));
      desk.position.set(dx, 0.45, dz); r.group.add(desk);
      r.colliders.push(new THREE.Box3().setFromObject(desk));
      const mon = box(1.0, 0.6, 0.08, mat('#0b0e14', { emissive: '#1c6acc', emissiveIntensity: 0.55 }));
      mon.position.set(dx, 1.2, dz - 0.4); r.group.add(mon);
      const chair = box(0.7, 0.9, 0.7, mat('#171a22'));
      chair.position.set(dx, 0.45, dz + 1.1); r.group.add(chair);
    }
    // job board on the wall
    const jboard = box(3, 1.6, 0.1, mat('#caa468', { rough: 0.8 }));
    jboard.position.set(o.x + 7.4, 1.6, o.z); jboard.rotation.y = -Math.PI / 2; r.group.add(jboard);
    r.group.add(tag('WORKTOWER', '#bcd8ff').translateX(o.x).translateY(2.75).translateZ(o.z - 6.6));
    const manager = staticNPC({ skin: 'umber', face: 'square', body: 'average', height: 'average',
      hair: 'taper-fade', hairColor: 'jet', top: 'jacket-tan', bottom: 'jeans-black',
      shoes: 'sneak-black', accessory: 'glasses', jewelry: 'chain' }, o.x, o.z - 4.6, 0);
    r.group.add(manager.group);

    byId.office = {
      id: 'office', name: 'WorkTower', offset: o,
      spawn: r.spawn, exit: r.exit, colliders: r.colliders,
      avatars: [manager], npcSlot: 'npc_basic_01',
      npcs: [{ name: 'Mr. Banks', role: 'manager', pos: new THREE.Vector3(o.x, 0, o.z - 3.8), dialogue: 'manager' }],
      stations: [
        { id: 'job-board', type: 'job-work', pos: new THREE.Vector3(o.x + 6, 0, o.z), label: 'Clock In (Work a Shift)' },
      ],
    };
  }

  // ── GARAGE ──────────────────────────────────────────────────────────────────
  {
    const o = OFFS.garage;
    const r = buildRoom(o.x, o.z, 18, 14, '#33363d', '#212329', '#101216');
    root.add(r.group);
    // oil-stained concrete + repair bay markings
    const bay = box(6, 0.02, 8, mat('#1b1d22', { rough: 0.98 }));
    bay.position.set(o.x - 3, 0.02, o.z); r.group.add(bay);
    // car lift platform with a car on it
    const lift = box(5, 0.4, 2.4, mat('#2a2d34', { metal: 0.4, rough: 0.5 }));
    lift.position.set(o.x - 3, 0.9, o.z); r.group.add(lift);
    const liftPost = box(0.3, 1.8, 0.3, mat('#454a55', { metal: 0.5 }));
    [-2.2, 2.2].forEach(s => { const p = liftPost.clone(); p.position.set(o.x - 3 + s, 0.9, o.z); r.group.add(p); });
    const liftCar = showroomCar('#5a6470', 'hatch');
    liftCar.position.set(o.x - 3, 1.1, o.z); liftCar.rotation.y = Math.PI / 2; r.group.add(liftCar);
    // toolboxes + workbench
    const toolbox = box(1.4, 1.0, 0.7, mat('#b5302a', { rough: 0.5 }));
    toolbox.position.set(o.x + 5, 0.5, o.z - 4); r.group.add(toolbox);
    r.colliders.push(new THREE.Box3().setFromObject(toolbox));
    const wbench = box(3, 1.0, 0.8, mat('#5a4326', { rough: 0.7 }));
    wbench.position.set(o.x + 5, 0.5, o.z + 2); r.group.add(wbench);
    r.colliders.push(new THREE.Box3().setFromObject(wbench));
    // tire stack
    for (let i = 0; i < 3; i++) {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.18, 8, 18), mat('#15161a', { rough: 0.9 }));
      tire.rotation.x = Math.PI / 2; tire.position.set(o.x + 6.5, 0.2 + i * 0.36, o.z + 5); r.group.add(tire);
    }
    r.group.add(tag('CITY GARAGE', '#cfd6e2').translateX(o.x).translateY(2.75).translateZ(o.z - 6.6));
    const mechanic = staticNPC({ skin: 'caramel', face: 'round', body: 'athletic', height: 'average',
      hair: 'waves', hairColor: 'jet', top: 'jersey-grn', bottom: 'cargo-tan',
      shoes: 'boots-tan', accessory: 'none', jewelry: 'none' }, o.x + 5, o.z + 3.4, Math.PI);
    r.group.add(mechanic.group);

    byId.garage = {
      id: 'garage', name: 'City Garage', offset: o,
      spawn: r.spawn, exit: r.exit, colliders: r.colliders,
      avatars: [mechanic], npcSlot: 'npc_basic_02',
      npcs: [{ name: 'Dro', role: 'mechanic', pos: new THREE.Vector3(o.x + 5, 0, o.z + 2.6), dialogue: 'mechanic' }],
      stations: [
        { id: 'repair-bay', type: 'repair', pos: new THREE.Vector3(o.x - 3, 0, o.z + 3), label: 'Repair / Service Vehicle' },
      ],
    };
  }

  return { group: root, byId };
}
