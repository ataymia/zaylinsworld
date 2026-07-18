import { assetTokens } from './deep-spec-semantics.mjs';

const DEDICATED_FAMILY_CATEGORY = new Map([
  ['building_shell', 'architecture'],
  ['road_module', 'road_surface'],
  ['hover_vehicle', 'vehicle'],
  ['hover-vehicle', 'vehicle'],
  ['modern_bed', 'furniture'],
  ['office_desk', 'furniture'],
  ['multi_monitor', 'furniture'],
  ['restaurant_booth', 'furniture'],
  ['classroom_desk', 'furniture'],
  ['municipal_bench', 'furniture'],
  ['bench', 'furniture'],
  ['picnic_table', 'furniture'],
  ['streetlight', 'infrastructure'],
  ['traffic-light', 'infrastructure'],
  ['traffic_light', 'infrastructure'],
  ['fire-hydrant', 'infrastructure'],
  ['fire_hydrant', 'infrastructure'],
  ['utility-box', 'infrastructure'],
  ['utility_box', 'infrastructure'],
  ['trash-can', 'infrastructure'],
  ['municipal_trash_can', 'infrastructure'],
  ['bus_shelter', 'infrastructure'],
  ['charging_pad', 'infrastructure'],
  ['fuel_pump', 'infrastructure'],
  ['digital_kiosk', 'infrastructure'],
  ['guardrail', 'infrastructure'],
  ['storm_drain', 'infrastructure'],
  ['mailbox', 'infrastructure'],
  ['bollard', 'infrastructure'],
  ['planter', 'vegetation'],
  ['road-sign', 'signage'],
  ['road_sign', 'signage'],
  ['district-sign', 'signage'],
  ['district_sign', 'signage'],
  ['hologram_billboard', 'signage'],
  ['wall_screen', 'signage'],
  ['loading_crate', 'generic_prop'],
  ['pallet_stack', 'generic_prop'],
]);

const PREFIX_CATEGORY = [
  [/^building_/, 'architecture'],
  [/^arch_/, 'architecture'],
  [/^(?:road|sidewalk|crosswalk)_/, 'road_surface'],
  [/^food_/, 'food'],
  [/^(?:furniture|chair|classroom)_/, 'furniture'],
  [/^vehicle_/, 'vehicle'],
  [/^(?:character|npc|creature)_/, 'character'],
  [/^item_/, 'generic_prop'],
];

const TOKEN_GROUPS = {
  furniture: new Set([
    'chair', 'bench', 'desk', 'table', 'bed', 'sofa', 'couch', 'shelf',
    'cabinet', 'locker', 'counter', 'booth', 'stool', 'wardrobe', 'dresser',
    'nightstand', 'bookcase', 'workbench', 'podium', 'mattress', 'vanity',
    'rack', 'fridge', 'freezer', 'sink', 'toilet', 'shower', 'cushion',
  ]),
  signage: new Set([
    'sign', 'billboard', 'marquee', 'plaque', 'poster', 'banner', 'wayfinding',
    'nameplate', 'menu', 'advert', 'advertisement', 'directory', 'scoreboard',
    'leaderboard', 'display', 'board', 'whiteboard', 'noticeboard', 'placard',
    'mapboard', 'priceboard', 'signalboard',
  ]),
  vehicle: new Set([
    'vehicle', 'car', 'sedan', 'coupe', 'truck', 'van', 'bus', 'taxi', 'bike',
    'bicycle', 'motorcycle', 'boat', 'ship', 'ferry', 'submarine', 'train',
    'tram', 'hover', 'aircraft', 'helicopter', 'forklift', 'cart', 'wagon',
    'scooter', 'skiff', 'ambulance', 'firetruck', 'racecar', 'shuttle', 'yacht',
    'canoe', 'kayak', 'trawler', 'dinghy', 'barge',
  ]),
  road_surface: new Set([
    'bridge', 'platform', 'path', 'walkway', 'ramp', 'stairs', 'stair', 'track',
    'curb', 'tunnel', 'runway', 'lane', 'median', 'pavement', 'plaza',
    'checkpoint', 'course', 'boardwalk', 'pier', 'seawall', 'breakwater',
    'skybridge', 'balcony', 'causeway', 'catwalk',
  ]),
  infrastructure: new Set([
    'streetlight', 'hydrant', 'utility', 'bollard', 'guardrail', 'drain',
    'shelter', 'charging', 'charger', 'fuel', 'kiosk', 'generator', 'transformer',
    'antenna', 'vent', 'pipe', 'valve', 'gate', 'fence', 'railing', 'crane',
    'winch', 'pump', 'terminal', 'scanner', 'camera', 'barrier', 'turnstile',
    'beacon', 'substation', 'power', 'pedestal', 'divider', 'marker', 'dock',
    'post', 'elevator', 'escalator', 'conveyor', 'dumpster', 'trash', 'bin',
    'airlock', 'seal', 'hatch', 'reader', 'machine', 'station', 'feeder',
    'trap', 'net', 'bucket', 'rig', 'console', 'gantry', 'hoist', 'turret',
    'sensor', 'apparatus', 'equipment', 'compressor', 'filter',
  ]),
  food: new Set([
    'food', 'meal', 'drink', 'beverage', 'cup', 'bottle', 'plate', 'tray',
    'burger', 'pizza', 'taco', 'sandwich', 'fries', 'cake', 'bread', 'fruit',
    'vegetable', 'meat', 'coffee', 'soda', 'candy', 'snack', 'ingredient',
    'dish', 'bowl', 'pastry', 'donut', 'cookie', 'noodle', 'softdrink',
  ]),
  vegetation: new Set([
    'tree', 'shrub', 'bush', 'flower', 'grass', 'plant', 'planter', 'crop',
    'vine', 'coral', 'kelp', 'seaweed', 'mushroom', 'fungus', 'cactus', 'palm',
    'garden', 'hedge', 'root', 'log', 'stump', 'moss', 'reed', 'fern', 'algae',
  ]),
  container_prop: new Set([
    'crate', 'case', 'chest', 'package', 'pouch', 'container', 'box', 'barrel',
    'basket', 'sack', 'bag', 'cooler', 'tote', 'parcel', 'canister', 'jar',
  ]),
  character: new Set([
    'character', 'npc', 'humanoid', 'monster', 'creature', 'animal', 'wildlife',
    'shark', 'whale', 'dolphin', 'octopus', 'crab', 'bird', 'dog', 'cat',
    'horse', 'dragon', 'golem', 'skeleton', 'zombie', 'boss', 'person',
    'merfolk', 'robot', 'android', 'fish', 'eel', 'ray', 'turtle', 'jellyfish',
  ]),
  creature_prop: new Set([
    'egg', 'nest', 'bone', 'skull', 'tentacle', 'claw', 'fossil', 'organic',
    'carapace', 'cocoon', 'web', 'shell',
  ]),
};

function hasAny(tokens, group) {
  const words = TOKEN_GROUPS[group];
  return tokens.some((token) => words.has(token));
}

function physicalTokenCategory(tokens) {
  // These categories describe the physical object itself and therefore outrank
  // words naming a profession, animal, customer, district, vehicle type, or
  // gameplay location. Service infrastructure wins before contextual words such
  // as hover, vehicle, road, and checkpoint.
  if (hasAny(tokens, 'furniture')) return 'furniture';
  if (hasAny(tokens, 'signage')) return 'signage';
  if (hasAny(tokens, 'infrastructure')) return 'infrastructure';
  if (hasAny(tokens, 'vehicle')) return 'vehicle';
  if (hasAny(tokens, 'road_surface')) return 'road_surface';
  if (hasAny(tokens, 'food')) return 'food';
  if (hasAny(tokens, 'vegetation')) return 'vegetation';
  if (hasAny(tokens, 'container_prop')) return 'generic_prop';
  return null;
}

export function classifyFinalAsset(asset) {
  const fileName = String(asset.fileName || '').toLowerCase();

  for (const [pattern, category] of PREFIX_CATEGORY) {
    if (pattern.test(fileName)) return category;
  }

  const familyCategory = DEDICATED_FAMILY_CATEGORY.get(asset.family);
  if (familyCategory) return familyCategory;

  const tokens = assetTokens(fileName);
  const physical = physicalTokenCategory(tokens);
  if (physical) return physical;

  // Only after all physical-object evidence is exhausted may character or
  // creature words classify the asset. This keeps "fish crate", "robot display",
  // and "creature signal board" from inheriting anatomy rules.
  if (hasAny(tokens, 'character')) return 'character';
  if (hasAny(tokens, 'creature_prop')) return 'creature_prop';

  if (asset.family === 'unsupported_character') return 'character';
  return 'generic_prop';
}

export function semanticCategoryReason(asset) {
  const fileName = String(asset.fileName || '').toLowerCase();
  for (const [pattern, category] of PREFIX_CATEGORY) {
    if (pattern.test(fileName)) return `strong filename prefix resolves the physical object as ${category}`;
  }
  if (DEDICATED_FAMILY_CATEGORY.has(asset.family)) {
    return `dedicated family ${asset.family} resolves the physical object as ${DEDICATED_FAMILY_CATEGORY.get(asset.family)}`;
  }
  const tokens = assetTokens(fileName);
  const physical = physicalTokenCategory(tokens);
  if (physical) return `whole physical-object token resolves the asset as ${physical}`;
  if (hasAny(tokens, 'character')) return 'whole species or character token resolves the asset as character';
  if (hasAny(tokens, 'creature_prop')) return 'whole biological-object token resolves the asset as creature_prop';
  if (asset.family === 'unsupported_character') return 'unsupported character family is used only because no stronger physical-object evidence exists';
  return 'no stronger physical category was found, so the asset remains a generic prop';
}
