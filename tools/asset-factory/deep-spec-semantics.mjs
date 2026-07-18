const FAMILY_CATEGORY = new Map([
  ['building_shell', 'architecture'],
  ['road_module', 'road_surface'],
  ['unsupported_character', 'character'],
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

const TOKEN_CATEGORIES = {
  signage: new Set([
    'sign', 'billboard', 'marquee', 'plaque', 'poster', 'banner', 'wayfinding',
    'nameplate', 'menu', 'advert', 'advertisement', 'directory', 'scoreboard',
  ]),
  food: new Set([
    'food', 'meal', 'drink', 'beverage', 'cup', 'bottle', 'plate', 'tray',
    'burger', 'pizza', 'taco', 'sandwich', 'fries', 'cake', 'bread', 'fruit',
    'vegetable', 'meat', 'coffee', 'soda', 'candy', 'snack', 'ingredient',
    'dish', 'bowl', 'pastry', 'donut', 'cookie', 'noodle', 'softdrink',
  ]),
  furniture: new Set([
    'furniture', 'chair', 'bench', 'desk', 'table', 'bed', 'sofa', 'couch',
    'shelf', 'cabinet', 'locker', 'counter', 'booth', 'stool', 'wardrobe',
    'dresser', 'nightstand', 'rug', 'workbench', 'podium', 'reception',
    'bookcase', 'cushion', 'mattress', 'sink', 'toilet', 'shower', 'vanity',
  ]),
  vehicle: new Set([
    'vehicle', 'car', 'sedan', 'coupe', 'truck', 'van', 'bus', 'taxi', 'bike',
    'bicycle', 'motorcycle', 'boat', 'ship', 'ferry', 'submarine', 'train',
    'tram', 'hover', 'aircraft', 'helicopter', 'forklift', 'cart', 'wagon',
    'scooter', 'skiff', 'ambulance', 'firetruck', 'racecar', 'shuttle',
  ]),
  road_surface: new Set([
    'bridge', 'platform', 'path', 'walkway', 'ramp', 'stairs', 'stair', 'track',
    'curb', 'tunnel', 'runway', 'lane', 'median', 'pavement', 'plaza',
    'checkpoint', 'course', 'boardwalk', 'pier', 'seawall', 'breakwater',
    'skybridge', 'balcony',
  ]),
  infrastructure: new Set([
    'streetlight', 'hydrant', 'utility', 'bollard', 'guardrail', 'drain',
    'shelter', 'charging', 'fuel', 'kiosk', 'generator', 'transformer',
    'antenna', 'vent', 'pipe', 'valve', 'gate', 'fence', 'railing', 'crane',
    'winch', 'pump', 'terminal', 'scanner', 'camera', 'barrier', 'turnstile',
    'beacon', 'substation', 'power', 'pedestal', 'divider', 'marker', 'dock',
    'post', 'elevator', 'escalator', 'conveyor', 'dumpster', 'trash', 'bin',
    'airlock', 'seal', 'hatch', 'reader',
  ]),
  vegetation: new Set([
    'tree', 'shrub', 'bush', 'flower', 'grass', 'plant', 'planter', 'crop',
    'vine', 'coral', 'kelp', 'seaweed', 'mushroom', 'fungus', 'cactus', 'palm',
    'garden', 'hedge', 'root', 'log', 'stump', 'moss', 'reed', 'fern', 'algae',
  ]),
  character: new Set([
    'character', 'npc', 'humanoid', 'monster', 'creature', 'animal', 'wildlife',
    'shark', 'whale', 'dolphin', 'octopus', 'crab', 'bird', 'dog', 'cat',
    'horse', 'dragon', 'golem', 'skeleton', 'zombie', 'boss', 'person',
    'merfolk', 'robot', 'android',
  ]),
  creature_prop: new Set([
    'egg', 'nest', 'bone', 'skull', 'tentacle', 'claw', 'fossil', 'organic',
    'carapace', 'cocoon', 'web',
  ]),
};

const PREFIX_CATEGORY = [
  [/^building_/, 'architecture'],
  [/^arch_/, 'architecture'],
  [/^(?:road|sidewalk|crosswalk)_/, 'road_surface'],
  [/^food_/, 'food'],
  [/^(?:furniture|chair|classroom)_/, 'furniture'],
  [/^vehicle_/, 'vehicle'],
  [/^(?:character|npc|creature|animal)_/, 'character'],
];

export function assetTokens(fileName) {
  return String(fileName || '')
    .toLowerCase()
    .replace(/\.glb$/, '')
    .split(/[_-]+/)
    .filter(Boolean)
    .filter((token) => !/^(?:prop|building|furniture|equipment|interior|road|sidewalk|crosswalk|arch|vehicle|food|classroom|chair|v\d+|[abc])$/.test(token));
}

function containsAny(tokens, category) {
  const vocabulary = TOKEN_CATEGORIES[category];
  return tokens.some((token) => vocabulary.has(token));
}

export function classifyDeepAsset(asset) {
  const familyCategory = FAMILY_CATEGORY.get(asset.family);
  if (familyCategory) return familyCategory;

  const fileName = String(asset.fileName || '').toLowerCase();
  for (const [pattern, category] of PREFIX_CATEGORY) {
    if (pattern.test(fileName)) return category;
  }

  const tokens = assetTokens(fileName);

  // A prop's physical object type outranks words describing the room, owner,
  // profession, district, or story context around it.
  if (containsAny(tokens, 'signage')) return 'signage';
  if (containsAny(tokens, 'food')) return 'food';
  if (containsAny(tokens, 'furniture')) return 'furniture';
  if (containsAny(tokens, 'vehicle')) return 'vehicle';
  if (containsAny(tokens, 'road_surface')) return 'road_surface';
  if (containsAny(tokens, 'infrastructure')) return 'infrastructure';
  if (containsAny(tokens, 'vegetation')) return 'vegetation';
  if (containsAny(tokens, 'character')) return 'character';
  if (containsAny(tokens, 'creature_prop')) return 'creature_prop';

  return 'generic_prop';
}

export const CATEGORY_DOCTRINES = {
  architecture: {
    identity: 'a complete architectural asset with a legible public face, believable side and service elevations, and construction logic appropriate to its use',
    silhouette: 'Establish the building or structural-module category from massing, roof or overhead profile, entrance or connection hierarchy, structural bays, openings, and ground or support relationship before signage and color are visible.',
    construction: 'Model a coherent foundation, frame or load-bearing wall system, layered facade or structural depth, human-scale access, glazing or openings with frames, weather and drainage treatment, service access, and credible transitions between materials.',
    interaction: 'Keep entrances, shutters, gates, windows, awnings, stairs, ramps, elevators, signs, lighting, roof equipment, and service components separable whenever gameplay or state changes may need them.',
    optimization: 'Preserve massing, entrances, openings, supports, and skyline in every LOD. Repeating windows, panels, rails, trim, and structural members should use shared geometry or instancing.',
  },
  vehicle: {
    identity: 'a mechanically plausible transportation asset whose occupancy, cargo, propulsion, cooling, lighting, access, protection, and service systems are visually understandable',
    silhouette: 'The transportation class must read from front, side, rear, and three-quarter views through stance, cabin or operator placement, overhangs, propulsion spacing, body volumes, glazing, and travel direction before decals or glow are considered.',
    construction: 'Include a load-bearing chassis or hull, occupant or cargo volume, access, controls, lighting, propulsion hardware, cooling or intake paths, service panels, energy connection, protected underside, and environment-specific safety systems.',
    interaction: 'Keep access panels, doors, lights, propulsion units, controls, cargo areas, steering surfaces, lift hardware, and service interfaces separately named for animation, customization, damage, maintenance, and gameplay states.',
    optimization: 'Use sufficient geometry for reflective silhouette surfaces while economizing hidden undersides. Reuse repeated seats, lights, vents, wheels, pods, rails, and fasteners. LODs must preserve occupancy and propulsion logic.',
  },
  character: {
    identity: 'a production character or creature requiring coherent anatomy, purposeful role design, deformation-ready topology, and an animation-ready hierarchy',
    silhouette: 'Species, body type, age or maturity, role, clothing or protective structure, and emotional tone must read from the outline. Head, torso, pelvis, limbs, extremities, appendages, and equipment must form one believable anatomy.',
    construction: 'Build continuous organic forms with clear skeletal or biological landmarks, functional joints, grounded feet or locomotion surfaces, usable hands or species equivalents, face or sensory structures, surface thickness, and attachment points.',
    interaction: 'Provide a named root and skeleton, locomotion and interaction controls, attachment sockets, expression or facial systems where relevant, hit regions, and tested deformation for the required action set.',
    optimization: 'Use deformation-focused edge flow and LODs that preserve face, hands, feet, joints, signature appendages, and readable species identity. Keep unsupported organic assets quarantined until a dedicated anatomy pipeline exists.',
  },
  furniture: {
    identity: 'a human-scale furniture, fixture, workstation, storage, sanitary, or interior-use asset with credible ergonomics, supports, joinery, and a clear use case',
    silhouette: 'Seat or work height, depth, back angle, leg clearance, storage volume, support placement, and reachable controls must immediately explain how a person uses the object.',
    construction: 'Model load-bearing frames, legs, pedestals, brackets, seams, cushions, panels, drawers, hinges, plumbing, glides, cable routing, fasteners, wall anchors, or floor anchors appropriate to the item.',
    interaction: 'Preserve seats, drawers, doors, screens, lamps, cushions, controls, storage, plumbing fixtures, and movable surfaces as distinct objects when gameplay can sit, open, use, move, customize, or damage them.',
    optimization: 'Keep ergonomic silhouette and contact points at every LOD. Repeated slats, legs, buttons, cushions, shelves, and fasteners should share meshes or instances.',
  },
  infrastructure: {
    identity: 'a serviceable civic, industrial, marine, utility, transit, security, or public-realm asset whose installation, operation, protection, and maintenance logic are visible',
    silhouette: 'Recognition must come from the relationship between support, enclosure, operating surface, access point, protected hardware, and ground, wall, dock, road, or network connection.',
    construction: 'Include mounting, foundations or brackets, structural members, weather or pressure protection, access, hinges, latches, vents, conduit or cable paths, drainage, warnings, controls, and maintenance hardware as appropriate.',
    interaction: 'Separate controls, doors, lenses, lights, handles, hoses, nozzles, movable arms, covers, gates, scanners, cameras, and service components so systems can animate or change state.',
    optimization: 'Preserve functional outline, installation, and operating surfaces. Repeated bolts, louvers, bars, lenses, posts, and rails should use instancing, while collision follows major volumes.',
  },
  road_surface: {
    identity: 'a modular traversal, road, sidewalk, bridge, dock, platform, path, rail, or course asset designed to connect cleanly and support movement without floating or snagging geometry',
    silhouette: 'Edge profile, grade, lane or path width, curb or barrier, structural support, connection points, and travel direction must explain how the surface carries players or vehicles.',
    construction: 'Provide surface thickness, engineered edges, joints, drainage, markings, supports, retaining structure, barriers, and transition pieces. Elevated or marine modules require believable beams, columns, cables, piles, brackets, or anchors.',
    interaction: 'Define walk, drive, climb, jump, grind, checkpoint, hazard, fall, docking, and connection boundaries through named surfaces and sockets.',
    optimization: 'Use modular dimensions, shared materials, and continuous simplified collision. Distant LODs may reduce cracks and hardware but cannot change grade, gaps, width, edge safety, or traversal timing.',
  },
  signage: {
    identity: 'a permanently installed or portable information, identification, advertising, route, menu, score, warning, or display asset with readable hierarchy and credible support',
    silhouette: 'Panel shape, scale, mounting, viewing angle, border or bezel, and support must identify the sign category before text is read. Lettering cannot be the sole distinction.',
    construction: 'Model panel thickness, border, bezel, backing, posts or wall brackets, fasteners, electrical access, cable routing, weather protection, and foundations where applicable.',
    interaction: 'Keep lettering, logos, display surfaces, indicator lights, changeable panels, and emissive layers separate for localization, state changes, damage, content updates, and nighttime use.',
    optimization: 'Use mesh or texture lettering according to viewing distance. LODs must preserve panel shape, color block, mounting, primary wordmark, and display state without excessive geometry.',
  },
  food: {
    identity: 'a recognizable food, beverage, ingredient, serving, package, or preparation asset with believable portion, layering, container, and surface response',
    silhouette: 'The item must read through shape, cut, layers, container, garnish, and portion before a label is needed. Identifiable pieces may not collapse into an amorphous blob.',
    construction: 'Model container thickness, lids, seams, handles, utensils, wrappers, trays, liquid levels, cut surfaces, toppings, crusts, stems, closures, and serving context as required.',
    interaction: 'Separate edible portions, containers, lids, utensils, steam, liquid, toppings, and packaging when the item can be served, consumed, opened, poured, carried, stacked, or discarded.',
    optimization: 'Use materials and normal detail for microtexture. Preserve the food silhouette, main layers, container, and signature garnish in LODs, with collision matching the carried or placed item.',
  },
  vegetation: {
    identity: 'a botanically or ecologically coherent plant, tree, crop, coral, fungus, or landscaped growth asset with believable anchoring and growth hierarchy',
    silhouette: 'Species category and maturity must read from trunk, stem, branch rhythm, crown, leaf massing, roots, fronds, petals, coral arms, fungal caps, or planting container.',
    construction: 'Build a clear hierarchy from roots or anchor through trunk, branches, stems, leaves, flowers, fruit, coral polyps, or other species structures rather than spheres or disconnected cards.',
    interaction: 'Provide wind groups, harvest points, breakable regions, climbable trunks, collision roots, seasonal variants, and placement sockets where gameplay requires them.',
    optimization: 'Use clusters, cards, instances, and impostors strategically while preserving species silhouette and branching logic and controlling overdraw.',
  },
  creature_prop: {
    identity: 'a static or semi-animated creature-adjacent, fossil, nest, bone, organic, or biological environment asset with coherent anatomy or growth logic',
    silhouette: 'Use a deliberate primary structure and meaningful appendages or layers rather than repeated blobs, stacked circles, or disconnected primitive piles.',
    construction: 'Establish anatomy or growth hierarchy, attachment points, weight support, joints or roots, openings, protective structures, and material transitions that explain function.',
    interaction: 'Define sockets, collision zones, damage or harvest regions, movable appendages, particles, emissive organs, and environmental attachment where relevant.',
    optimization: 'Preserve signature outline and functional appendages, simplifying only hidden detail that does not affect interaction or recognition.',
  },
  generic_prop: {
    identity: 'a production-ready environmental or interactive prop with a recognizable purpose, coherent assembly, correct scale, and town-specific materials',
    silhouette: 'The primary body and functional secondary parts must identify the object before labels or color. Handles, supports, openings, controls, edges, and contact points should explain use.',
    construction: 'Model the load-bearing body, panels, seams, hinges, fasteners, supports, handles, vents, feet, brackets, openings, service access, and functional hardware appropriate to the object.',
    interaction: 'Separate parts that may open, rotate, light, display, receive an item, emit particles, take damage, change material, or connect to another system.',
    optimization: 'Preserve silhouette and interaction points, sharing repeated hardware and moving only microdetail into materials at lower LODs.',
  },
};
