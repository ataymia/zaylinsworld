// ───────────────────────────────────────────────────────────────────────────
//  assetRegistry.js — semantic asset intelligence
// ───────────────────────────────────────────────────────────────────────────
//  The game ships ~565 GLB/GLTF assets indexed in
//  public/assets/models/asset-index-v2.json as:
//      { indexCategory: { pack: [ { name, path, type, tex } ] } }
//
//  Raw files have no MEANING — this registry gives every asset a purpose so the
//  town/prefab builders can place things logically instead of loading random
//  files. It is RULE-BASED so it also classifies assets uploaded in the future:
//    1. an explicit ASSET_OVERRIDES entry (gameplay-critical assets), else
//    2. the first matching CLASSIFY_RULES keyword rule, else
//    3. the INDEX_DEFAULTS fallback for the asset's index category.
//
//  classifyAsset()/buildRegistry() are PURE (no THREE, no DOM) so they run both
//  in-game and in the docs/ASSET_USAGE_REPORT.md generator.
// ───────────────────────────────────────────────────────────────────────────

// Placement strategies the town/prefab builders understand.
export const PLACEMENT = {
  BUILDING: 'building',      // a standalone structure on a lot
  INTERIOR: 'interior',      // lives inside a room
  FURNITURE: 'furniture',    // floor-standing furniture
  COUNTER_TOP: 'counter',    // sits on a counter/shelf/table
  WALL: 'wall',              // mounts on a wall (signs, racks, displays)
  GROUND_PROP: 'ground',     // street-level prop (trash, hydrant, cone)
  SIDEWALK: 'sidewalk',      // aligned along sidewalks (lights, benches)
  FORECOURT: 'forecourt',    // gas-station style, car-accessible apron
  CHARACTER: 'character',    // an NPC/player avatar skin
  VEHICLE: 'vehicle',        // a drivable / parked car
  HELD: 'held',              // held in hand (weapon / tool)
  DECOR: 'decor',            // free decorative placement
};

// Collision behavior hints.
export const COLLISION = {
  SOLID: 'solid',            // full AABB collider (buildings, big furniture)
  BLOCKER: 'blocker',        // small solid (counters, racks)
  PICKUP: 'pickup',          // walk-through, can be picked up (food, trash)
  NONE: 'none',              // purely visual, no collider
  CHARACTER: 'character',    // capsule, driven by AI/player
  VEHICLE: 'vehicle',        // vehicle collider
};

// ── The semantic taxonomy (the categories the design doc calls out) ──────────
export const SEMANTIC_CATEGORIES = {
  buildings: [
    'gas_station', 'diner', 'chicken_spot', 'mini_market', 'police_station',
    'school', 'gym', 'office', 'house_small', 'house_mid', 'house_luxury',
    'dealership', 'garage', 'jewelry_store', 'block_supply', 'clothing_store',
    'shop_generic',
  ],
  interiors: [
    'restaurant_interior', 'kitchen', 'home_bedroom', 'home_bathroom',
    'living_room', 'police_station_lobby', 'police_armory', 'classroom',
    'gym_floor', 'office_room', 'dealership_showroom', 'gas_station_store',
  ],
  furniture: [
    'couch', 'bed', 'chair', 'table', 'booth', 'counter', 'shelf', 'dresser',
    'desk', 'locker', 'cabinet', 'fridge', 'stove', 'toilet', 'sink', 'shower',
    'lamp', 'rug', 'decoration',
  ],
  food: [
    'chicken_piece', 'chicken_bone', 'plate', 'drink', 'fryer', 'basket',
    'food_tray', 'restaurant_counter', 'produce', 'packaged_food', 'cooking',
  ],
  storeProps: [
    'weapon_rack', 'ammo_box', 'display_case', 'cash_register', 'shelf', 'sign',
    'gas_pump', 'price_sign', 'clothing_rack', 'jewelry_case', 'vending',
  ],
  worldProps: [
    'trash_bag', 'trash_can', 'dumpster', 'streetlight', 'bench', 'mailbox',
    'traffic_sign', 'cone', 'hydrant', 'bus_stop', 'tree', 'rock',
  ],
  characters: [
    'player_body', 'npc_body', 'police', 'student', 'shop_worker', 'gym_worker',
    'sanitation_worker', 'monster',
  ],
  vehicles: [
    'starter_car', 'sedan', 'sports_car', 'police_car', 'truck', 'van',
    'luxury_car', 'dealership_display_car',
  ],
  weapons: [
    'pistol', 'compact', 'rifle', 'shotgun', 'precision', 'melee', 'ammo',
    'upgrade', 'scope', 'beam', 'extended_mag', 'throwable', 'projectile',
  ],
};

// Every semantic category → its domain (for grouping + scale defaults).
const CATEGORY_DOMAIN = {};
for (const [domain, cats] of Object.entries(SEMANTIC_CATEGORIES)) {
  for (const c of cats) CATEGORY_DOMAIN[c] = domain;
}

// Approx target size (metres) by domain — the placement code normalizes a GLB's
// largest bound toward this so wildly-scaled uploads still fit the world.
const DOMAIN_SCALE_TARGET = {
  buildings: 10, interiors: 2.0, furniture: 1.2, food: 0.25, storeProps: 1.4,
  worldProps: 1.2, characters: 1.8, vehicles: 4.2, weapons: 0.6,
};
// Per-category overrides where the domain default is too coarse.
const CATEGORY_SCALE_TARGET = {
  gas_station: 14, dealership: 16, police_station: 16, house_luxury: 12,
  counter: 1.6, table: 1.2, bed: 2.0, shelf: 1.8, locker: 1.9,
  gas_pump: 2.4, dumpster: 1.8, streetlight: 4.0, sign: 2.2,
  chicken_piece: 0.18, chicken_bone: 0.12, plate: 0.22, drink: 0.22,
  ammo: 0.3, melee: 1.0, projectile: 0.1, monster: 2.2,
  fryer: 1.1, cooking: 0.9,
};

// Default placement / collision / interactable per category.
const CATEGORY_BEHAVIOR = {
  // buildings
  __building: { placement: PLACEMENT.BUILDING, collision: COLLISION.SOLID, interactable: true },
  // interiors
  __interior: { placement: PLACEMENT.INTERIOR, collision: COLLISION.NONE, interactable: false },
  // furniture
  couch: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: false },
  bed: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: true },
  chair: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: false },
  table: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: false },
  booth: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: false },
  counter: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: true },
  shelf: { placement: PLACEMENT.WALL, collision: COLLISION.BLOCKER, interactable: false },
  cabinet: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: false },
  fridge: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: true },
  stove: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: true },
  fryer: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: true },
  cooking: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: true },
  locker: { placement: PLACEMENT.WALL, collision: COLLISION.BLOCKER, interactable: true },
  // food
  __food: { placement: PLACEMENT.COUNTER_TOP, collision: COLLISION.PICKUP, interactable: true },
  // store props
  weapon_rack: { placement: PLACEMENT.WALL, collision: COLLISION.BLOCKER, interactable: true },
  display_case: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: true },
  jewelry_case: { placement: PLACEMENT.FURNITURE, collision: COLLISION.BLOCKER, interactable: true },
  cash_register: { placement: PLACEMENT.COUNTER_TOP, collision: COLLISION.NONE, interactable: true },
  gas_pump: { placement: PLACEMENT.FORECOURT, collision: COLLISION.BLOCKER, interactable: true },
  sign: { placement: PLACEMENT.WALL, collision: COLLISION.NONE, interactable: false },
  price_sign: { placement: PLACEMENT.SIDEWALK, collision: COLLISION.NONE, interactable: false },
  // world props
  trash_bag: { placement: PLACEMENT.GROUND_PROP, collision: COLLISION.PICKUP, interactable: true },
  trash_can: { placement: PLACEMENT.GROUND_PROP, collision: COLLISION.BLOCKER, interactable: true },
  dumpster: { placement: PLACEMENT.GROUND_PROP, collision: COLLISION.SOLID, interactable: true },
  streetlight: { placement: PLACEMENT.SIDEWALK, collision: COLLISION.BLOCKER, interactable: false },
  bench: { placement: PLACEMENT.SIDEWALK, collision: COLLISION.BLOCKER, interactable: false },
  hydrant: { placement: PLACEMENT.SIDEWALK, collision: COLLISION.BLOCKER, interactable: false },
  cone: { placement: PLACEMENT.GROUND_PROP, collision: COLLISION.NONE, interactable: false },
  tree: { placement: PLACEMENT.SIDEWALK, collision: COLLISION.BLOCKER, interactable: false },
  rock: { placement: PLACEMENT.GROUND_PROP, collision: COLLISION.BLOCKER, interactable: false },
  // characters
  __character: { placement: PLACEMENT.CHARACTER, collision: COLLISION.CHARACTER, interactable: true },
  // vehicles
  __vehicle: { placement: PLACEMENT.VEHICLE, collision: COLLISION.VEHICLE, interactable: true },
  // weapons
  __weapon: { placement: PLACEMENT.HELD, collision: COLLISION.NONE, interactable: false },
  ammo: { placement: PLACEMENT.COUNTER_TOP, collision: COLLISION.PICKUP, interactable: true },
  projectile: { placement: PLACEMENT.DECOR, collision: COLLISION.NONE, interactable: false },
};

// Per-domain fallback category (used when a more specific match isn't found and
// also as the prefab fallback id when a preferred asset is missing).
const DOMAIN_FALLBACK = {
  buildings: 'shop_generic', interiors: 'living_room', furniture: 'table',
  food: 'packaged_food', storeProps: 'shelf', worldProps: 'trash_can',
  characters: 'npc_body', vehicles: 'sedan', weapons: 'melee',
};

// ── Keyword classification rules (first match wins) ──────────────────────────
// Matched against `${name} ${path} ${pack}` lowercased. Order matters: put the
// most specific keywords first.
const CLASSIFY_RULES = [
  // ── characters (specific roles before generic) ──
  { re: /police|officer|cop|sheriff|patrol/, category: 'police' },
  { re: /zombie|skeleton|ghost|spooky|monster|creature|demon|beast/, category: 'monster' },
  { re: /student|school-kid|pupil/, category: 'student' },
  { re: /worker|clerk|cashier|shopkeeper|staff|vendor/, category: 'shop_worker' },
  { re: /sanitation|garbage|janitor|cleaner/, category: 'sanitation_worker' },
  { re: /character|\bnpc\b|\bpeople\b|human|man-|woman-|female|male|person/, category: 'npc_body' },

  // ── vehicles ──
  { re: /police-?car|cop-?car|cruiser|patrol-?car/, category: 'police_car' },
  { re: /truck|pickup/, category: 'truck' },
  { re: /\bvan\b/, category: 'van' },
  { re: /super|sport|ferrari|lambo|exotic|race/, category: 'sports_car' },
  { re: /luxury|limo|premium/, category: 'luxury_car' },
  { re: /\bcar\b|sedan|vehicle|auto-/, category: 'sedan' },

  // ── weapons / gear ──
  { re: /ammo|bullet|mag(azine)?-|clip|round/, category: 'ammo' },
  { re: /bullet|pew|projectile|nade|grenade|flashbang|incendiary|rocket-?round|shell/, category: 'projectile' },
  { re: /scope|sight|optic/, category: 'scope' },
  { re: /awp|sniper|precision|barrett/, category: 'precision' },
  { re: /ak47|rifle|m4|ar15|carbine/, category: 'rifle' },
  { re: /mac10|smg|uzi|mp5|compact/, category: 'compact' },
  { re: /shotgun|pump|sweeper/, category: 'shotgun' },
  { re: /pistol|glock|handgun|pew\b|revolver/, category: 'pistol' },
  { re: /bat|pipe|wrench|board|plank|knife|machete|crowbar|hammer|melee/, category: 'melee' },

  // ── buildings ──
  { re: /gas-?station|fuel|petrol/, category: 'gas_station' },
  { re: /diner|restaurant-ext|eatery/, category: 'diner' },
  { re: /chicken-?spot|fried-?chicken/, category: 'chicken_spot' },
  { re: /mini-?market|market|grocery|bodega|convenience/, category: 'mini_market' },
  { re: /police-?station|precinct|safety-?hq|patrol-?station/, category: 'police_station' },
  { re: /school|academy-building/, category: 'school' },
  { re: /\bgym-ext|fitness-center/, category: 'gym' },
  { re: /office|tower|edificio/, category: 'office' },
  { re: /dealership|showroom/, category: 'dealership' },
  { re: /garage|mechanic|service-bay/, category: 'garage' },
  { re: /jewel|frostbox/, category: 'jewelry_store' },
  { re: /block-?supply|gun-?store|armory-store/, category: 'block_supply' },
  { re: /clothing|apparel|wardrobe-store/, category: 'clothing_store' },
  { re: /cabin|cabaña|caba|house|home|residential/, category: 'house_small' },
  { re: /shop|store|building|edificios/, category: 'shop_generic' },

  // ── interiors (room kits) ──
  // Chicken Spot cooking equipment: deep fryers + fryer baskets are the preferred
  // fixtures for fryer_kitchen; classify them as `fryer`/`cooking` (NOT `stove`)
  // so a fried-chicken kitchen never reads like a bakery/pizza oven.
  { re: /deep[-_ ]?fryer|fryer[-_ ]?(basket|single|double)|drain[-_ ]?rack|splash[-_ ]?guard|oil[-_ ]?(splash|guard)/, category: 'fryer' },
  { re: /heat[-_ ]?lamp|food[-_ ]?warmer|warming[-_ ]?lamp/, category: 'cooking' },
  { re: /classroom|chalkboard|whiteboard|easel|school-desk/, category: 'classroom' },
  { re: /gym|treadmill|barbell|dumbbell|bench-press|weight/, category: 'gym_floor' },
  { re: /kitchen|burner|fryer|stove-/, category: 'kitchen' },
  { re: /restaurant|booth|cafe/, category: 'restaurant_interior' },
  { re: /bedroom/, category: 'home_bedroom' },
  { re: /bathroom|toilet-room/, category: 'home_bathroom' },
  { re: /living-?room|lounge/, category: 'living_room' },

  // ── furniture ──
  { re: /sofa|couch|armchair/, category: 'couch' },
  { re: /\bbed\b|bed-(single|double|king)/, category: 'bed' },
  { re: /booth/, category: 'booth' },
  { re: /chair|stool|seat/, category: 'chair' },
  { re: /counter|register-stand/, category: 'counter' },
  { re: /\btable\b|ctable|desk-table|dining/, category: 'table' },
  { re: /desk/, category: 'desk' },
  { re: /locker/, category: 'locker' },
  { re: /shelf|bookshelf|rack-shelf|book-set|book-single/, category: 'shelf' },
  { re: /cabinet|cupboard|drawer|dresser/, category: 'cabinet' },
  { re: /fridge|refrigerator|cooler/, category: 'fridge' },
  { re: /stove|oven|burner/, category: 'stove' },
  { re: /toilet/, category: 'toilet' },
  { re: /\bsink\b/, category: 'sink' },
  { re: /shower/, category: 'shower' },
  { re: /lamp|light-fixture/, category: 'lamp' },

  // ── store props ──
  { re: /weapon-?rack|gun-?rack/, category: 'weapon_rack' },
  { re: /ammo-?box|ammobox/, category: 'ammo_box' },
  { re: /display-?case|showcase/, category: 'display_case' },
  { re: /jewel.*case|case.*jewel/, category: 'jewelry_case' },
  { re: /cash-?register|register|recipt|receipt/, category: 'cash_register' },
  { re: /gas-?pump|fuel-?pump|pump/, category: 'gas_pump' },
  { re: /price-?sign/, category: 'price_sign' },
  { re: /clothing-?rack/, category: 'clothing_rack' },
  { re: /\bsign\b|signage|billboard/, category: 'sign' },
  { re: /vending|machine|maquina/, category: 'vending' },

  // ── world props ──
  { re: /trash-?bag|garbage-?bag/, category: 'trash_bag' },
  { re: /trash-?can|garbage-?can|bin\b|trashanddebris|debris/, category: 'trash_can' },
  { re: /dumpster/, category: 'dumpster' },
  { re: /street-?light|lamp-?post|lamppost/, category: 'streetlight' },
  { re: /bench/, category: 'bench' },
  { re: /mailbox/, category: 'mailbox' },
  { re: /traffic-?sign|stop-?sign|road-?sign/, category: 'traffic_sign' },
  { re: /\bcone\b/, category: 'cone' },
  { re: /hydrant/, category: 'hydrant' },
  { re: /bus-?stop/, category: 'bus_stop' },
  { re: /tree|arbol|bush|plant/, category: 'tree' },
  { re: /rock|stone|boulder/, category: 'rock' },

  // ── food ──
  { re: /chicken-?cooking|chicken-?piece|fried/, category: 'chicken_piece' },
  { re: /chicken-?bone|bone/, category: 'chicken_bone' },
  { re: /\bplate\b/, category: 'plate' },
  { re: /bottle|juice|milk|drink|water|soda|glass-/, category: 'drink' },
  { re: /fryer|basket/, category: 'basket' },
  { re: /tray/, category: 'food_tray' },
  { re: /fruit|salad|egg|meat|soup|hummus|oatmeal|lentil|comida|food/, category: 'produce' },
];

// Index top-level category → default semantic domain when no keyword matches.
const INDEX_DEFAULTS = {
  characters: 'npc_body',
  buildings: 'shop_generic',
  interiors: 'decoration',
  props: 'decoration',
  weapons: 'melee',
  vehicles: 'sedan',
  animations: null,            // animations are clips, not placeable assets
  hair: null,
  jewelry: 'jewelry_case',
};

// ── Explicit overrides for gameplay-critical assets (authoritative) ──────────
// Keyed by asset `name` from the index. These reflect how the live game actually
// uses the asset today, so the registry/report never mis-reads a known asset.
export const ASSET_OVERRIDES = {
  'gas-station': { category: 'gas_station', tested: true, safe: true, notes: 'Live: tryGasStationGLB exterior for the city gas station.' },
  'gas-station-props': { category: 'gas_pump', tested: true, safe: true, notes: 'Pumps/props that dress the gas station forecourt.' },
  diner: { category: 'diner', tested: true, safe: true, notes: 'Chicken Spot / diner exterior.' },
  market: { category: 'mini_market', tested: false, safe: true, notes: 'Mini-market exterior (available, not all wired).' },
  shop: { category: 'shop_generic', tested: false, safe: true, notes: 'Generic storefront — reusable for Block Supply / clothing.' },
  edificios: { category: 'office', tested: false, safe: true, notes: 'Office/large building block set.' },
  'caba-as': { category: 'house_small', tested: false, safe: true, notes: 'Cabin/house exterior for residential lots.' },
  trashanddebris: { category: 'trash_can', tested: true, safe: true, notes: 'Live: real trash pile asset used by makeTrashPiece.' },
  board: { category: 'melee', tested: true, safe: true, notes: 'Live: Block Plank melee weapon (plank_bonker).' },
  ak47: { category: 'rifle', tested: true, safe: true, notes: 'Live: Blockside Rifle.' },
  ak47variant: { category: 'rifle', tested: true, safe: true, notes: 'Live: Ridge Rifle.' },
  mac10: { category: 'compact', tested: true, safe: true, notes: 'Live: Corner Compact SMG.' },
  awp: { category: 'precision', tested: true, safe: true, notes: 'Live: Precision Scope Tool (scoped).' },
  shotgun: { category: 'shotgun', tested: true, safe: true, notes: 'Live: Street Sweeper.' },
  pew: { category: 'pistol', tested: true, safe: true, notes: 'Live: Shortline Pistol view/hand model.' },
  rocketlaucher: { category: 'precision', tested: true, safe: true, notes: 'Live: Blast Tube heavy weapon (misspelled file name kept).' },
  'ammobox-low': { category: 'ammo_box', tested: false, safe: true, notes: 'Ammo box store prop for Block Supply shelves.' },
};

// ── Classification ───────────────────────────────────────────────────────────
function behaviorFor(category) {
  const domain = CATEGORY_DOMAIN[category];
  // domain-level defaults
  let base;
  if (domain === 'buildings') base = CATEGORY_BEHAVIOR.__building;
  else if (domain === 'interiors') base = CATEGORY_BEHAVIOR.__interior;
  else if (domain === 'food') base = CATEGORY_BEHAVIOR.__food;
  else if (domain === 'characters') base = CATEGORY_BEHAVIOR.__character;
  else if (domain === 'vehicles') base = CATEGORY_BEHAVIOR.__vehicle;
  else if (domain === 'weapons') base = CATEGORY_BEHAVIOR.__weapon;
  else base = { placement: PLACEMENT.DECOR, collision: COLLISION.NONE, interactable: false };
  return CATEGORY_BEHAVIOR[category] || base;
}

function scaleTargetFor(category) {
  if (CATEGORY_SCALE_TARGET[category] != null) return CATEGORY_SCALE_TARGET[category];
  const domain = CATEGORY_DOMAIN[category];
  return DOMAIN_SCALE_TARGET[domain] || 1.0;
}

export function fallbackFor(category) {
  const domain = CATEGORY_DOMAIN[category];
  return DOMAIN_FALLBACK[domain] || null;
}

// Classify a single index entry → a full semantic meta record.
//   entry = { name, path, type, tex }   indexCat = top-level index key
export function classifyAsset(entry, indexCat, pack) {
  const name = entry.name || '';
  const path = entry.path || '';
  const hay = `${name} ${path} ${pack || ''}`.toLowerCase();

  let category = null;
  let source = 'default';

  // 1) explicit override
  const ov = ASSET_OVERRIDES[name];
  if (ov && ov.category) { category = ov.category; source = 'override'; }

  // 2) keyword rule
  if (!category) {
    for (const rule of CLASSIFY_RULES) {
      if (rule.re.test(hay)) { category = rule.category; source = 'rule'; break; }
    }
  }

  // 3) index-category default
  if (!category) { category = INDEX_DEFAULTS[indexCat] || 'decoration'; source = 'index-default'; }

  const domain = CATEGORY_DOMAIN[category] || indexCat || 'misc';
  const behavior = behaviorFor(category);
  const isAnim = entry.type === 'fbx-anim' || indexCat === 'animations' || category == null;

  return {
    id: name,
    name,
    path,
    pack: pack || null,
    indexCategory: indexCat,
    domain,
    category,
    subcategory: pack || null,
    classifiedBy: source,
    use: describeUse(category),
    scaleTarget: scaleTargetFor(category),
    placement: behavior.placement,
    collision: behavior.collision,
    interactable: !!behavior.interactable,
    hasTexture: entry.tex ? true : false,
    fallback: fallbackFor(category),
    tested: ov ? !!ov.tested : false,
    safe: ov ? ov.safe !== false : true,
    isAnimation: !!isAnim,
    notes: ov ? ov.notes : '',
  };
}

function describeUse(category) {
  const domain = CATEGORY_DOMAIN[category];
  switch (domain) {
    case 'buildings': return 'Exterior structure placed on a town lot.';
    case 'interiors': return 'Room-kit piece for an interior.';
    case 'furniture': return 'Furniture placed inside an interior.';
    case 'food': return 'Food item shown/eaten in restaurants & shops.';
    case 'storeProps': return 'Store fixture (rack/case/register/pump/sign).';
    case 'worldProps': return 'Street-level world dressing prop.';
    case 'characters': return 'Character avatar skin (NPC / role / monster).';
    case 'vehicles': return 'Drivable or parked vehicle.';
    case 'weapons': return 'Weapon, gear, ammo or projectile.';
    default: return 'Decorative / uncategorized asset.';
  }
}

// Build the full registry from a loaded asset index object.
//   index = { indexCat: { pack: [ entry, ... ] } }
export function buildRegistry(index) {
  const out = [];
  if (!index) return out;
  for (const indexCat of Object.keys(index)) {
    const packs = index[indexCat];
    if (!packs || typeof packs !== 'object') continue;
    for (const pack of Object.keys(packs)) {
      const list = packs[pack];
      if (!Array.isArray(list)) continue;
      for (const entry of list) out.push(classifyAsset(entry, indexCat, pack));
    }
  }
  return out;
}

// Convenience queries over a built registry.
export function assetsInCategory(registry, category) {
  return registry.filter(a => a.category === category);
}
export function assetsInDomain(registry, domain) {
  return registry.filter(a => a.domain === domain);
}
export function getCategoryList() {
  return Object.entries(SEMANTIC_CATEGORIES).flatMap(([d, cs]) => cs.map(c => ({ domain: d, category: c })));
}
