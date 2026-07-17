import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

const ROOT = process.cwd();
const DOCS_ROOT = join(ROOT, 'docs');
const FACTORY_ROOT = join(ROOT, 'asset-factory');
const GENERATED_DIR = join(FACTORY_ROOT, 'generated');
const STATE_DIR = join(FACTORY_ROOT, 'state');
const MASTER_PATH = join(GENERATED_DIR, 'master-asset-specs.json');
const QUEUE_PATH = join(STATE_DIR, 'queue.json');
const POLICY = JSON.parse(readFileSync(join(FACTORY_ROOT, 'quality-policy.json'), 'utf8'));
const MANUAL = JSON.parse(readFileSync(join(FACTORY_ROOT, 'manual-overrides.json'), 'utf8'));
const GLB_PATTERN = /\b([a-z][a-z0-9_]*(?:\.glb))\b/g;

const SUPPORTED_BUILDERS = new Set([
  'streetlight',
  'traffic_light',
  'road_sign',
  'district_sign',
  'fire_hydrant',
  'utility_box',
  'municipal_bench',
  'municipal_trash_can',
  'bollard',
  'planter',
  'mailbox',
  'guardrail',
  'storm_drain',
  'picnic_table',
  'pallet_stack',
  'loading_crate',
  'bus_shelter',
  'charging_pad',
  'fuel_pump',
  'digital_kiosk',
  'hologram_billboard',
  'office_desk',
  'multi_monitor',
  'restaurant_booth',
  'classroom_desk',
  'modern_bed',
  'wall_screen',
  'hover_vehicle'
]);

const FAMILY_LIBRARY = {
  building_shell: {
    noun: 'architectural exterior shell',
    components: ['primary massing', 'roof line', 'entrance', 'window system', 'facade material breaks', 'service side', 'foundation'],
    dimensions: { width: 18, depth: 14, height: 9 },
    quality: { minimumMeshObjects: 18, minimumTriangles: 6000, maximumTriangles: 50000, minimumMaterials: 5 },
    guidance: 'Use believable structural bays, facade depth, doors at human scale, roof drainage or parapet logic, service access, and a recognizable public-facing silhouette.'
  },
  road_module: {
    noun: 'modular road or pedestrian surface',
    components: ['surface slab', 'curbs or edges', 'lane or path markings', 'connection seams', 'drainage detail'],
    dimensions: { width: 10, depth: 10, height: 0.3 },
    quality: { minimumMeshObjects: 5, minimumTriangles: 500, maximumTriangles: 10000, minimumMaterials: 3 },
    guidance: 'Geometry must tile cleanly, keep consistent elevation, show engineered edge and drainage treatment, and avoid becoming a featureless plane.'
  },
  streetlight: {
    noun: 'municipal streetlight',
    components: ['base flange', 'anchor bolts', 'pole', 'maintenance access', 'support arm', 'luminaire housing', 'lens'],
    dimensions: { width: 2.2, depth: 0.6, height: 6.5 },
    quality: { minimumMeshObjects: 10, minimumTriangles: 1500, maximumTriangles: 14000, minimumMaterials: 4 },
    guidance: 'Include weatherproof mounting, service access, a credible support arm, proper luminaire housing, and enough segment resolution for round metal parts.'
  },
  traffic_light: {
    noun: 'traffic signal assembly',
    components: ['base flange', 'vertical support', 'mast arm', 'signal heads', 'visibility visors', 'red lens', 'amber lens', 'green lens'],
    dimensions: { width: 7.5, depth: 0.9, height: 6.2 },
    quality: { minimumMeshObjects: 18, minimumTriangles: 3000, maximumTriangles: 24000, minimumMaterials: 6 },
    guidance: 'Signal heads must be separate engineered housings with lenses and visors, not colored discs attached directly to a pole.'
  },
  road_sign: {
    noun: 'municipal road sign',
    components: ['sign face', 'border or lettering', 'support post', 'mounting brackets', 'fasteners'],
    dimensions: { width: 1.1, depth: 0.2, height: 2.8 },
    quality: { minimumMeshObjects: 7, minimumTriangles: 700, maximumTriangles: 10000, minimumMaterials: 3 },
    guidance: 'Use a thin metal sign face, readable modeled lettering where named, rear brackets, and correctly scaled roadside support hardware.'
  },
  district_sign: {
    noun: 'district identity marker',
    components: ['structural base', 'sign panel', 'border trim', 'lettering', 'lighting or mounting detail'],
    dimensions: { width: 3.4, depth: 0.7, height: 2.0 },
    quality: { minimumMeshObjects: 10, minimumTriangles: 1800, maximumTriangles: 18000, minimumMaterials: 4 },
    guidance: 'Create permanent civic wayfinding with layered masonry or metal construction, not a floating billboard.'
  },
  fire_hydrant: {
    noun: 'municipal fire hydrant',
    components: ['base flange', 'base bolts', 'main barrel', 'body collars', 'bonnet', 'operating nut', 'side outlets', 'hose caps'],
    dimensions: { width: 0.7, depth: 0.7, height: 1.05 },
    quality: { minimumMeshObjects: 18, minimumTriangles: 3800, maximumTriangles: 22000, minimumMaterials: 4 },
    guidance: 'The casting, flange, outlets, caps, wrench lugs, operating nut, and fasteners must communicate real hydrant mechanics from every angle.'
  },
  utility_box: {
    noun: 'serviceable utility cabinet',
    components: ['equipment pad', 'cabinet enclosure', 'service door', 'hinge', 'latch', 'ventilation', 'conduit entry', 'anchor hardware'],
    dimensions: { width: 1.0, depth: 0.65, height: 1.5 },
    quality: { minimumMeshObjects: 12, minimumTriangles: 1400, maximumTriangles: 14000, minimumMaterials: 4 },
    guidance: 'Include service access, weather protection, vents, mounting, and conduit logic so the cabinet is more than a beveled cube.'
  },
  municipal_bench: {
    noun: 'public seating bench',
    components: ['seat structure', 'back structure', 'side frames', 'supports', 'armrests', 'anchored feet'],
    dimensions: { width: 1.85, depth: 0.72, height: 0.9 },
    quality: { minimumMeshObjects: 14, minimumTriangles: 2000, maximumTriangles: 18000, minimumMaterials: 3 },
    guidance: 'Respect adult seating dimensions, back angle, load-bearing frames, fasteners, and ground anchors.'
  },
  municipal_trash_can: {
    noun: 'public trash receptacle',
    components: ['liner', 'outer enclosure', 'support rings', 'disposal opening', 'rain cover', 'service access', 'base anchors'],
    dimensions: { width: 0.72, depth: 0.72, height: 1.15 },
    quality: { minimumMeshObjects: 14, minimumTriangles: 2400, maximumTriangles: 20000, minimumMaterials: 3 },
    guidance: 'Show how waste enters, how sanitation workers empty it, and how the receptacle remains stable outdoors.'
  },
  bollard: {
    noun: 'protective traffic bollard',
    components: ['anchored base', 'main post', 'cap', 'reflective band', 'mounting hardware'],
    dimensions: { width: 0.18, depth: 0.18, height: 0.95 },
    quality: { minimumMeshObjects: 5, minimumTriangles: 600, maximumTriangles: 6000, minimumMaterials: 3 },
    guidance: 'Use credible steel thickness, cap treatment, reflective marking, and ground anchoring.'
  },
  planter: {
    noun: 'city planter',
    components: ['outer planter body', 'inner soil volume', 'rim', 'drainage detail', 'planting'],
    dimensions: { width: 1.0, depth: 1.0, height: 0.75 },
    quality: { minimumMeshObjects: 8, minimumTriangles: 1300, maximumTriangles: 16000, minimumMaterials: 4 },
    guidance: 'The container needs wall thickness, rim depth, soil, drainage logic, and believable planting rather than a cube with a green sphere.'
  },
  mailbox: {
    noun: 'curbside residential mailbox',
    components: ['post', 'cross support', 'mailbox body', 'curved roof', 'front door', 'handle', 'signal flag'],
    dimensions: { width: 0.45, depth: 0.75, height: 1.25 },
    quality: { minimumMeshObjects: 9, minimumTriangles: 1100, maximumTriangles: 10000, minimumMaterials: 3 },
    guidance: 'Use believable sheet-metal thickness, a functional front door and flag, and a post that can physically support the box.'
  },
  guardrail: {
    noun: 'roadside guardrail module',
    components: ['rail beam', 'support posts', 'spacers', 'end treatment', 'fasteners'],
    dimensions: { width: 4.0, depth: 0.45, height: 0.8 },
    quality: { minimumMeshObjects: 10, minimumTriangles: 1200, maximumTriangles: 12000, minimumMaterials: 2 },
    guidance: 'Show corrugated beam structure, post spacing, bolt heads, and a safe end treatment; do not use one flat bar.'
  },
  storm_drain: {
    noun: 'curb and storm-drain assembly',
    components: ['curb section', 'drain opening', 'metal grate', 'frame', 'gutter channel'],
    dimensions: { width: 1.2, depth: 0.65, height: 0.3 },
    quality: { minimumMeshObjects: 6, minimumTriangles: 900, maximumTriangles: 10000, minimumMaterials: 3 },
    guidance: 'Provide a recessed drain, framed grate, gutter slope, and curb relationship instead of a painted rectangle.'
  },
  picnic_table: {
    noun: 'outdoor picnic table',
    components: ['tabletop boards', 'seat boards', 'load-bearing frame', 'cross braces', 'fasteners', 'feet'],
    dimensions: { width: 1.85, depth: 1.55, height: 0.78 },
    quality: { minimumMeshObjects: 14, minimumTriangles: 1700, maximumTriangles: 15000, minimumMaterials: 3 },
    guidance: 'Use human-scale seat spacing, structural bracing, separate boards, and visible fastening.'
  },
  pallet_stack: {
    noun: 'stacked industrial pallets',
    components: ['top deck boards', 'bottom deck boards', 'stringers', 'spacing gaps', 'stack offsets'],
    dimensions: { width: 1.2, depth: 1.0, height: 0.65 },
    quality: { minimumMeshObjects: 18, minimumTriangles: 900, maximumTriangles: 12000, minimumMaterials: 2 },
    guidance: 'Build real pallet layers and stringers with usable fork gaps; avoid solid wooden slabs.'
  },
  loading_crate: {
    noun: 'industrial loading crate',
    components: ['crate panels', 'corner frame', 'base skids', 'fasteners', 'handling markings'],
    dimensions: { width: 1.1, depth: 0.9, height: 0.95 },
    quality: { minimumMeshObjects: 10, minimumTriangles: 900, maximumTriangles: 12000, minimumMaterials: 3 },
    guidance: 'Show panel thickness, structural corner framing, lifting skids, and believable assembly.'
  },
  bus_shelter: {
    noun: 'municipal bus shelter',
    components: ['foundation pads', 'structural frame', 'roof', 'weather panels', 'bench', 'route panel', 'lighting'],
    dimensions: { width: 3.2, depth: 1.6, height: 2.5 },
    quality: { minimumMeshObjects: 16, minimumTriangles: 2600, maximumTriangles: 24000, minimumMaterials: 5 },
    guidance: 'Create a physically supported weather shelter with safe glass thickness, seating, drainage, route information, and pedestrian clearance.'
  },
  charging_pad: {
    noun: 'vehicle or hover charging installation',
    components: ['ground pad', 'alignment markings', 'power module', 'connector or induction array', 'status lights', 'protective edging'],
    dimensions: { width: 2.8, depth: 5.2, height: 0.35 },
    quality: { minimumMeshObjects: 10, minimumTriangles: 1800, maximumTriangles: 18000, minimumMaterials: 5 },
    guidance: 'Treat it as real energy infrastructure with serviceable power hardware, protected edges, drainage, and clear vehicle alignment.'
  },
  fuel_pump: {
    noun: 'fuel or multi-energy dispenser',
    components: ['anchored pedestal', 'cabinet', 'display', 'payment terminal', 'hose', 'nozzle', 'protective trim', 'service panel'],
    dimensions: { width: 0.9, depth: 0.62, height: 2.1 },
    quality: { minimumMeshObjects: 15, minimumTriangles: 2600, maximumTriangles: 22000, minimumMaterials: 5 },
    guidance: 'Include payment, metering, hose routing, nozzle storage, service access, ventilation, and protective base structure.'
  },
  digital_kiosk: {
    noun: 'public digital kiosk',
    components: ['anchored base', 'structural body', 'screen', 'protective bezel', 'input area', 'service panel', 'ventilation'],
    dimensions: { width: 0.75, depth: 0.55, height: 1.85 },
    quality: { minimumMeshObjects: 10, minimumTriangles: 1700, maximumTriangles: 17000, minimumMaterials: 5 },
    guidance: 'Use readable human ergonomics, screen protection, service access, ventilation, and a stable anti-tip base.'
  },
  hologram_billboard: {
    noun: 'digital or holographic billboard',
    components: ['foundation or wall mount', 'support frame', 'display plane', 'projector or emitter hardware', 'service access', 'cable routing'],
    dimensions: { width: 3.6, depth: 0.65, height: 3.0 },
    quality: { minimumMeshObjects: 12, minimumTriangles: 2000, maximumTriangles: 20000, minimumMaterials: 5 },
    guidance: 'The display needs a credible support and emitter system. Do not float a glowing rectangle in space.'
  },
  office_desk: {
    noun: 'professional office desk',
    components: ['work surface', 'load-bearing legs or pedestal', 'cable management', 'storage', 'edge trim', 'equipment clearance'],
    dimensions: { width: 1.65, depth: 0.78, height: 0.76 },
    quality: { minimumMeshObjects: 10, minimumTriangles: 1800, maximumTriangles: 18000, minimumMaterials: 4 },
    guidance: 'Use ergonomic dimensions, credible support, cable routing, drawer or service access, and layered material construction.'
  },
  multi_monitor: {
    noun: 'multi-monitor workstation',
    components: ['desk or mounting base', 'monitor arms', 'multiple displays', 'bezels', 'rear housings', 'cables', 'input devices'],
    dimensions: { width: 1.5, depth: 0.55, height: 0.95 },
    quality: { minimumMeshObjects: 16, minimumTriangles: 2300, maximumTriangles: 20000, minimumMaterials: 5 },
    guidance: 'Displays require rear housings, mounts, bezels, and cable routing; avoid floating screen planes.'
  },
  restaurant_booth: {
    noun: 'commercial restaurant booth',
    components: ['seat bases', 'upholstered cushions', 'backrests', 'tabletop', 'table pedestal', 'floor glides', 'seams'],
    dimensions: { width: 2.0, depth: 1.8, height: 1.15 },
    quality: { minimumMeshObjects: 12, minimumTriangles: 2400, maximumTriangles: 22000, minimumMaterials: 4 },
    guidance: 'Respect human seating dimensions, cushion construction, table clearance, seams, and stable commercial support.'
  },
  classroom_desk: {
    noun: 'student classroom desk',
    components: ['work surface', 'frame', 'legs', 'storage shelf or modesty panel', 'feet', 'fasteners'],
    dimensions: { width: 0.72, depth: 0.52, height: 0.74 },
    quality: { minimumMeshObjects: 9, minimumTriangles: 1100, maximumTriangles: 12000, minimumMaterials: 3 },
    guidance: 'Use student-scale ergonomics, stable legs, edge treatment, floor glides, and storage or equipment integration appropriate to the town.'
  },
  modern_bed: {
    noun: 'residential bed',
    components: ['bed frame', 'support legs', 'mattress', 'headboard', 'pillows', 'blanket or duvet'],
    dimensions: { width: 1.65, depth: 2.15, height: 1.05 },
    quality: { minimumMeshObjects: 10, minimumTriangles: 2600, maximumTriangles: 24000, minimumMaterials: 5 },
    guidance: 'Create layered bedding, a plausible support frame, human-scale mattress thickness, pillow forms, seams, and a clear head/foot orientation.'
  },
  wall_screen: {
    noun: 'wall-mounted display system',
    components: ['mounting bracket', 'rear housing', 'screen panel', 'protective bezel', 'status light', 'cable or power channel'],
    dimensions: { width: 1.2, depth: 0.12, height: 0.72 },
    quality: { minimumMeshObjects: 7, minimumTriangles: 1100, maximumTriangles: 12000, minimumMaterials: 4 },
    guidance: 'Include wall mounting, housing depth, bezel, power or data routing, and a controllable display material rather than a bare emissive plane.'
  },
  hover_vehicle: {
    noun: 'practical hover vehicle',
    components: ['load-bearing chassis', 'passenger cabin', 'windshield', 'doors', 'hover pods', 'lift emitters', 'service panels', 'front lights', 'rear lights', 'intakes'],
    dimensions: { width: 2.05, depth: 4.55, height: 1.45 },
    quality: { minimumMeshObjects: 34, minimumTriangles: 9000, maximumTriangles: 50000, minimumMaterials: 6 },
    guidance: 'Package real passengers, cargo or power volume, crash structure, service access, cooling, lighting, and independently mounted lift hardware. Never generate a floating box, saucer, or wheel-less shell.'
  },
  unsupported_character: {
    noun: 'rigged character or creature requiring a dedicated anatomy pipeline',
    components: ['credible anatomy', 'surface form', 'hands or paws', 'feet', 'face', 'rig', 'deformation-ready topology'],
    dimensions: { width: 0.8, depth: 0.55, height: 1.8 },
    quality: { minimumMeshObjects: 1, minimumTriangles: 8000, maximumTriangles: 50000, minimumMaterials: 3 },
    guidance: 'Do not generate with the prop factory. This family is quarantined until a dedicated anatomy, sculpting, retopology, and rigging builder exists.'
  },
  unsupported_generic: {
    noun: 'specialized asset awaiting a dedicated family builder',
    components: ['recognizable primary structure', 'functional secondary components', 'appropriate materials'],
    dimensions: { width: 1.5, depth: 1.5, height: 1.5 },
    quality: { minimumMeshObjects: 8, minimumTriangles: 1200, maximumTriangles: 30000, minimumMaterials: 3 },
    guidance: 'Do not create a generic primitive substitute. Keep the item queued as unsupported until a purpose-built family generator exists.'
  }
};

const MATERIAL_WORDS = {
  starter: ['painted metal', 'concrete', 'ordinary glass', 'galvanized hardware'],
  tech: ['dark brushed metal', 'black composite', 'tinted glass', 'controlled emissive accents'],
  fishing: ['weathered wood', 'painted marine metal', 'rope', 'galvanized hardware'],
  rich: ['stone', 'stucco', 'glass', 'bronze or dark metal'],
  casino: ['architectural metal', 'glass', 'controlled illuminated trim', 'service-grade structure'],
  dungeon: ['weathered stone', 'aged timber', 'dark iron', 'leather or cloth where appropriate'],
  obby: ['engineered steel', 'sandstone', 'safety paint', 'weather-resistant hardware'],
  starline: ['painted architectural metal', 'glass', 'marquee lighting', 'backstage industrial hardware'],
  aqualume: ['pressure-rated metal', 'curved glass', 'coral-safe composite', 'bioluminescent accents']
};

function listMarkdownFiles(root) {
  const out = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listMarkdownFiles(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

function inferTown(sourcePath, assetName) {
  const text = `${sourcePath} ${assetName}`.toLowerCase();
  if (text.includes('starter')) return 'starter-town';
  if (text.includes('fishing') || text.includes('harbor') || text.includes('dock') || text.includes('marina')) return 'fishing-harbor';
  if (text.includes('rich_hills') || text.includes('rich-hills')) return 'rich-hills';
  if (text.includes('tech_town') || text.includes('techtown') || text.includes('volt') || text.includes('cyber') || text.includes('neon') || text.includes('future')) return 'techtown';
  if (text.includes('casino')) return 'casino-strip';
  if (text.includes('dungeon')) return 'dungeon-outskirts';
  if (text.includes('obby')) return 'obby-canyon';
  if (text.includes('starline')) return 'starline-city';
  if (text.includes('aqualume') || text.includes('underwater')) return 'aqualume';
  return 'shared-world';
}

function inferFamily(assetName) {
  const n = assetName.toLowerCase();
  if (/character|npc|monster|creature|animal|fish|wildlife|humanoid/.test(n)) return { family: 'unsupported_character', builder: null };
  if (/hover.*(car|vehicle)|vehicle.*hover/.test(n)) return { family: 'hover_vehicle', builder: 'hover_vehicle' };
  if (/streetlight/.test(n)) return { family: 'streetlight', builder: 'streetlight' };
  if (/traffic_light|traffic_signal/.test(n)) return { family: 'traffic_light', builder: 'traffic_light' };
  if (/district_sign|gateway_sign/.test(n)) return { family: 'district_sign', builder: 'district_sign' };
  if (/stop_sign|street_name_sign|crossing_guard_sign|wayfinding_sign|road_sign/.test(n)) return { family: 'road_sign', builder: 'road_sign' };
  if (/hydrant/.test(n)) return { family: 'fire_hydrant', builder: 'fire_hydrant' };
  if (/utility_box|electrical_box|service_cabinet/.test(n)) return { family: 'utility_box', builder: 'utility_box' };
  if (/bench/.test(n) && !/weight_bench/.test(n)) return { family: 'municipal_bench', builder: 'municipal_bench' };
  if (/trash_can|receptacle|industrial_dumpster|dumpster/.test(n)) return { family: 'municipal_trash_can', builder: 'municipal_trash_can' };
  if (/bollard/.test(n)) return { family: 'bollard', builder: 'bollard' };
  if (/planter|garden_bed/.test(n)) return { family: 'planter', builder: 'planter' };
  if (/mailbox/.test(n)) return { family: 'mailbox', builder: 'mailbox' };
  if (/guardrail/.test(n)) return { family: 'guardrail', builder: 'guardrail' };
  if (/storm_drain|drain_grate/.test(n)) return { family: 'storm_drain', builder: 'storm_drain' };
  if (/picnic_table/.test(n)) return { family: 'picnic_table', builder: 'picnic_table' };
  if (/pallet/.test(n)) return { family: 'pallet_stack', builder: 'pallet_stack' };
  if (/loading_crate|shipping_crate|data_drive_crate/.test(n)) return { family: 'loading_crate', builder: 'loading_crate' };
  if (/bus_shelter|bus_stop/.test(n)) return { family: 'bus_shelter', builder: 'bus_shelter' };
  if (/charge_pad|charging_bay|hover_parking_pad|charging_station/.test(n)) return { family: 'charging_pad', builder: 'charging_pad' };
  if (/fuel_pump|pay_kiosk_fuel|service_terminal_future/.test(n)) return { family: 'fuel_pump', builder: 'fuel_pump' };
  if (/digital_ad_kiosk|public_screen_stand|ticket_terminal|order_kiosk|customer_kiosk|health_terminal|data_terminal|code_terminal/.test(n)) return { family: 'digital_kiosk', builder: 'digital_kiosk' };
  if (/hologram_billboard|digital_billboard|menu_board_digital/.test(n)) return { family: 'hologram_billboard', builder: 'hologram_billboard' };
  if (/office_desk|reception_desk_futuristic|property_desk|health_desk/.test(n)) return { family: 'office_desk', builder: 'office_desk' };
  if (/multi_monitor|monitor_station|wall_screen_dashboard|security_monitor_wall/.test(n)) return { family: 'multi_monitor', builder: 'multi_monitor' };
  if (/restaurant_booth/.test(n)) return { family: 'restaurant_booth', builder: 'restaurant_booth' };
  if (/classroom_desk/.test(n)) return { family: 'classroom_desk', builder: 'classroom_desk' };
  if (/bed_modern|furniture_bed/.test(n)) return { family: 'modern_bed', builder: 'modern_bed' };
  if (/wall_screen_home|wall_fitness_screen|digital_board_classroom/.test(n)) return { family: 'wall_screen', builder: 'wall_screen' };
  if (/^building_/.test(n)) return { family: 'building_shell', builder: null };
  if (/^road_|^sidewalk_|^crosswalk_/.test(n)) return { family: 'road_module', builder: null };
  return { family: 'unsupported_generic', builder: null };
}

function titleCase(value) {
  return value.split(/[_-]+/).filter(Boolean).map((part) => {
    if (/^v\d+$/.test(part)) return part.toUpperCase();
    if (['ui', 'ev', 'pc', '3d'].includes(part)) return part.toUpperCase();
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(' ');
}

function displayName(assetName) {
  return titleCase(assetName.replace(/\.glb$/, '').replace(/_v\d+$/, '').replace(/_[a-z]$/, '').replace(/^(building|prop|furniture|equipment|interior|road|sidewalk|crosswalk|arch|vehicle|food|classroom|chair)_/, ''));
}

function getSectionHeading(content, index) {
  const before = content.slice(0, index);
  const matches = [...before.matchAll(/^#{2,5}\s+(.+)$/gm)];
  return matches.length ? matches.at(-1)[1].trim() : 'Uncategorized asset list';
}

function materialHint(town) {
  if (town === 'starter-town') return MATERIAL_WORDS.starter;
  if (town === 'techtown') return MATERIAL_WORDS.tech;
  if (town === 'fishing-harbor') return MATERIAL_WORDS.fishing;
  if (town === 'rich-hills') return MATERIAL_WORDS.rich;
  if (town === 'casino-strip') return MATERIAL_WORDS.casino;
  if (town === 'dungeon-outskirts') return MATERIAL_WORDS.dungeon;
  if (town === 'obby-canyon') return MATERIAL_WORDS.obby;
  if (town === 'starline-city') return MATERIAL_WORDS.starline;
  if (town === 'aqualume') return MATERIAL_WORDS.aqualume;
  return ['context-appropriate structural material', 'hardware', 'surface finish'];
}

function buildGeneratedDescription({ assetName, town, section, family }) {
  const profile = POLICY.townProfiles[town] || POLICY.townProfiles['shared-world'];
  const template = FAMILY_LIBRARY[family] || FAMILY_LIBRARY.unsupported_generic;
  const name = displayName(assetName);
  return `A production-ready ${name}, designed as a ${template.noun} for ${titleCase(town)}. `
    + `${template.guidance} The object must remain immediately recognizable from silhouette and required components, use physically coherent construction and human or vehicle scale, and follow the town direction: ${profile.style}. `
    + `This asset appears under the blueprint section “${section}” and should visibly support that gameplay or environmental role rather than acting as generic filler.`;
}

function mergeQuality(templateQuality, overrideQuality = {}) {
  return {
    ...POLICY.globalGeometry,
    ...templateQuality,
    ...overrideQuality
  };
}

function makeSpec(assetName, sourceDoc, section, manual = {}) {
  const inferredTown = inferTown(sourceDoc, assetName);
  const inferred = inferFamily(assetName);
  const family = manual.family || inferred.family;
  const template = FAMILY_LIBRARY[family] || FAMILY_LIBRARY.unsupported_generic;
  const builder = manual.builder ?? inferred.builder;
  const town = manual.town || inferredTown;
  const supported = Boolean(builder && SUPPORTED_BUILDERS.has(builder));
  const generatedDescription = buildGeneratedDescription({ assetName, town, section, family });

  return {
    id: assetName.replace(/\.glb$/, ''),
    fileName: assetName,
    displayName: manual.displayName || displayName(assetName),
    town,
    sourceDoc,
    sourceSection: section,
    family,
    builder,
    builderStatus: supported ? 'supported' : 'unsupported',
    priority: Number.isFinite(manual.priority) ? manual.priority : 10000,
    variant: manual.variant || null,
    description: manual.description || generatedDescription,
    designIntent: manual.designIntent || template.guidance,
    dimensionsMeters: manual.dimensionsMeters || template.dimensions,
    requiredComponents: manual.requiredComponents || template.components,
    materials: manual.materials || materialHint(town),
    quality: mergeQuality(template.quality, manual.quality),
    functionalNotes: manual.functionalNotes || ['ground-centered pivot', 'positive Z forward where direction matters', 'optimized GLB export'],
    forbiddenShortcuts: [
      ...POLICY.prohibitedShortcuts,
      ...(manual.forbiddenShortcuts || [])
    ],
    license: 'Original ZTA procedural geometry',
    generatedBy: 'ZTA Free Asset Factory',
    status: supported ? 'queued' : 'unsupported'
  };
}

function loadExistingQueue() {
  if (!existsSync(QUEUE_PATH)) return { version: 1, assets: {} };
  try {
    return JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
  } catch {
    return { version: 1, assets: {} };
  }
}

mkdirSync(GENERATED_DIR, { recursive: true });
mkdirSync(STATE_DIR, { recursive: true });

const discovered = new Map();
for (const filePath of listMarkdownFiles(DOCS_ROOT)) {
  const content = readFileSync(filePath, 'utf8');
  const sourceDoc = relative(ROOT, filePath).replaceAll('\\', '/');
  for (const match of content.matchAll(GLB_PATTERN)) {
    const assetName = match[1];
    if (!discovered.has(assetName)) {
      discovered.set(assetName, { sourceDoc, section: getSectionHeading(content, match.index || 0) });
    }
  }
}

for (const [assetName, manual] of Object.entries(MANUAL.assets || {})) {
  if (manual.include && !discovered.has(assetName)) {
    discovered.set(assetName, { sourceDoc: 'asset-factory/manual-overrides.json', section: 'Manual canonical additions' });
  }
}

const specs = [];
for (const [assetName, source] of discovered.entries()) {
  specs.push(makeSpec(assetName, source.sourceDoc, source.section, MANUAL.assets?.[assetName] || {}));
}

const townRank = new Map([
  ['starter-town', 0],
  ['fishing-harbor', 1],
  ['rich-hills', 2],
  ['techtown', 3],
  ['casino-strip', 4],
  ['dungeon-outskirts', 5],
  ['obby-canyon', 6],
  ['starline-city', 7],
  ['aqualume', 8],
  ['shared-world', 9]
]);

specs.sort((a, b) => {
  if (a.priority !== b.priority) return a.priority - b.priority;
  const townDiff = (townRank.get(a.town) ?? 99) - (townRank.get(b.town) ?? 99);
  if (townDiff) return townDiff;
  if (a.builderStatus !== b.builderStatus) return a.builderStatus === 'supported' ? -1 : 1;
  return a.fileName.localeCompare(b.fileName);
});

const existingQueue = loadExistingQueue();
const queueAssets = {};
for (const spec of specs) {
  const previous = existingQueue.assets?.[spec.id];
  const resetUnsupported = previous?.status === 'unsupported' && spec.builderStatus === 'supported';
  queueAssets[spec.id] = {
    id: spec.id,
    fileName: spec.fileName,
    town: spec.town,
    family: spec.family,
    builder: spec.builder,
    priority: spec.priority,
    status: resetUnsupported ? 'queued' : (previous?.status || spec.status),
    attempts: previous?.attempts || 0,
    lastError: previous?.lastError || null,
    lastReport: previous?.lastReport || null,
    generatedPath: previous?.generatedPath || null,
    updatedAt: new Date().toISOString()
  };
}

const counts = specs.reduce((acc, spec) => {
  acc.total += 1;
  acc[spec.builderStatus] += 1;
  acc.towns[spec.town] = (acc.towns[spec.town] || 0) + 1;
  acc.families[spec.family] = (acc.families[spec.family] || 0) + 1;
  return acc;
}, { total: 0, supported: 0, unsupported: 0, towns: {}, families: {} });

const master = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: 'All .glb names harvested from docs/**/*.md plus explicit manual canonical additions.',
  policy: 'asset-factory/quality-policy.json',
  counts,
  assets: specs
};

const queue = {
  version: 1,
  generatedAt: new Date().toISOString(),
  batchSize: POLICY.batchSize,
  assets: queueAssets
};

writeFileSync(MASTER_PATH, `${JSON.stringify(master, null, 2)}\n`);
writeFileSync(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`);

console.log(`[asset-factory] compiled ${counts.total} asset specifications`);
console.log(`[asset-factory] supported now: ${counts.supported}; safely quarantined until a family builder exists: ${counts.unsupported}`);
console.log(`[asset-factory] wrote ${relative(ROOT, MASTER_PATH)} and ${relative(ROOT, QUEUE_PATH)}`);
