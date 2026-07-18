import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { classifyFinalAsset } from './deep-spec-final-classifier.mjs';

const ROOT = process.cwd();
const DEEP_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-asset-specs.json');
const COVERAGE_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-spec-coverage.json');
const deep = JSON.parse(readFileSync(DEEP_PATH, 'utf8'));
const coverage = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'));

const BROAD_PROFILE_NAMES = new Set([
  'specialized environmental or interactive prop',
  'complete architectural asset',
  'serviceable infrastructure asset',
  'complete transportation asset',
  'human-scale furniture or fixture',
  'installed information or display asset',
  'modular traversal surface',
]);

const OVERRIDES = [
  {
    name: 'refrigerated market fish display case',
    pattern: /market_fish_case|fish_market_case|fish_display_case/,
    dimensions: { width: 1.8, depth: 0.9, height: 1.25 },
    purpose: 'a chilled retail display that presents seafood clearly while containing meltwater, maintaining safe temperature, and giving staff rear service access',
    components: ['insulated lower cabinet', 'refrigerated display well', 'sloped framed glass viewing hood', 'removable seafood trays or ice bed', 'rear staff access doors', 'temperature control and display', 'compressor ventilation and service panel', 'drain and meltwater collection', 'protective bumper and adjustable feet'],
    materials: ['stainless food-service metal', 'insulated cabinet panels', 'framed safety glass', 'food-safe trays and liner', 'rubber seals', 'control display and hardware'],
  },
  {
    name: 'preserved fish specimen education display',
    pattern: /fish_specimen_display/,
    dimensions: { width: 1.6, depth: 0.55, height: 1.45 },
    purpose: 'an educational specimen display that safely presents a recognizable fish form, habitat information, and labeled anatomy to students or visitors',
    components: ['stable display cabinet or pedestal', 'framed transparent specimen enclosure', 'preserved or sculpted fish specimen support', 'species and anatomy information panel', 'controlled display lighting', 'rear access and security lock', 'ventilation or sealed preservation system', 'base anchors and viewing clearance'],
    materials: ['finished display cabinet', 'framed safety glass', 'specimen and support materials', 'printed or digital information panel', 'lighting lenses and hardware'],
  },
  {
    name: 'inventory-scale preserved fish catch item',
    pattern: /item_.*(?:gillyfish|fish).*inventory/,
    dimensions: { width: 0.38, depth: 0.14, height: 0.16 },
    purpose: 'a compact inventory representation of a caught fish that remains species-readable from body profile, fins, tail, head, eyes, and surface pattern without requiring a live-character rig',
    components: ['continuous fish body', 'recognizable head and mouth', 'paired and dorsal fins', 'tail fin', 'eyes and gill structure', 'species-specific pattern or glow markings', 'inventory pickup origin and simple collider'],
    materials: ['fish skin or scale surface', 'fin material', 'eyes and gill material', 'species-specific markings or emissive accents'],
  },
  {
    name: 'commercial arcade claw machine',
    pattern: /arcade_claw_machine/,
    dimensions: { width: 1.05, depth: 0.9, height: 2 },
    purpose: 'a public prize machine with a transparent prize cabinet, controllable overhead claw mechanism, payment interface, and accessible prize chute',
    components: ['anchored arcade cabinet', 'transparent prize enclosure', 'overhead X-Y gantry rails', 'motorized cable and three-prong claw', 'joystick and action button', 'payment or ticket reader', 'prize chute with flap', 'internal prize bed', 'marquee and cabinet lighting', 'locked rear service door and ventilation'],
    materials: ['painted arcade cabinet', 'framed safety glass', 'metal gantry and claw', 'control hardware', 'lighting and display materials', 'rubber prize-chute flap'],
  },
  {
    name: 'arcade game cabinet',
    pattern: /arcade_cabinet|slot_machine|rhythm_machine|racing_machine/,
    dimensions: { width: 0.85, depth: 0.9, height: 1.9 },
    purpose: 'a durable public game cabinet with a readable display, player controls, payment or ticket hardware, audio, ventilation, and secure service access',
    components: ['weighted cabinet and anti-tip base', 'screen with protective bezel', 'game-specific controls', 'payment, card, or ticket reader', 'speaker grilles', 'marquee and status lighting', 'ventilation and cable routing', 'locked rear service door', 'foot or standing clearance'],
    materials: ['painted or laminated cabinet panels', 'screen and protective glass', 'buttons, joystick, wheel, or pads', 'speaker mesh', 'lighting and hardware'],
  },
  {
    name: 'computer learning workstation',
    pattern: /computer_station|computer_lab_station|laptop_station|small_pc_setup|editing_station/,
    dimensions: { width: 1.45, depth: 0.75, height: 1.25 },
    purpose: 'an ergonomic computer workstation with a supported desk surface, display and input hardware, seating clearance, cable management, power access, and serviceable equipment placement',
    components: ['load-bearing desk or workstation frame', 'work surface with edge treatment', 'monitor or laptop with rear housing', 'keyboard and pointing device', 'computer tower, dock, or processing unit', 'cable tray and power routing', 'equipment ventilation', 'chair and leg clearance', 'floor glides or anchors'],
    materials: ['work-surface finish', 'structural frame', 'screen and electronics housings', 'input-device materials', 'cable and power hardware'],
  },
  {
    name: 'electric-vehicle charging pedestal',
    pattern: /ev_charger|utility_charger|hover_charge_pedestal/,
    dimensions: { width: 0.65, depth: 0.45, height: 1.55 },
    purpose: 'a weather-resistant vehicle charging unit with power electronics, user authentication, status display, protected cable or connector storage, and safe ground anchoring',
    components: ['anchored equipment base', 'weatherproof power cabinet', 'display and authentication reader', 'charging cable, arm, socket, or inductive interface', 'connector holster', 'status and warning lights', 'ventilation and thermal management', 'service access panel', 'impact protection and cable management'],
    materials: ['powder-coated enclosure', 'electrical hardware', 'flexible charging cable and seals', 'screen and lighting lenses', 'concrete or metal mounting base'],
  },
  {
    name: 'vehicle service lift or repair bay',
    pattern: /service_lift|repair_bay|detail_bay|carwash|sub_repair_lift/,
    dimensions: { width: 3.4, depth: 6, height: 3.2 },
    purpose: 'a complete service position with structural lifting or access equipment, protected utilities, drainage, controls, safety markings, and technician clearance around the vehicle',
    components: ['reinforced service pad or bay floor', 'lifting posts, arms, rails, or cradle', 'vehicle alignment guides', 'operator controls and emergency stop', 'power, air, water, or diagnostic connections', 'drainage and spill containment', 'safety locks, guards, and markings', 'tool or service access zone', 'anchored structural frame'],
    materials: ['reinforced concrete or deck surface', 'painted structural steel', 'hydraulic, cable, or actuator hardware', 'rubber contact pads', 'controls and safety markings'],
  },
  {
    name: 'event or performance stage',
    pattern: /event_stage|blackbox_stage|performance_stage/,
    dimensions: { width: 8, depth: 5, height: 1.2 },
    purpose: 'a load-rated performance platform with audience-facing orientation, backstage access, edge treatment, equipment tie-downs, and lighting or sound connection points',
    components: ['load-bearing stage deck', 'understage frame or risers', 'front fascia and safe edges', 'backstage stair or ramp access', 'rail or guard positions where required', 'lighting and sound connection points', 'equipment tie-downs and cable paths', 'floor marks and performer clearance'],
    materials: ['non-slip stage deck', 'structural frame', 'fascia finish', 'rails and fasteners', 'cable and equipment hardware'],
  },
  {
    name: 'public basketball hoop assembly',
    pattern: /basketball_hoop/,
    dimensions: { width: 1.8, depth: 2.4, height: 3.35 },
    purpose: 'a regulation-readable outdoor basketball goal with a stable foundation, offset support, backboard, rim, net, and safe player clearance',
    components: ['buried or weighted foundation', 'load-bearing pole', 'offset support arm and brace', 'framed backboard', 'regulation-height rim', 'flexible net', 'mounting hardware and padding', 'court-facing orientation and collision clearance'],
    materials: ['painted structural steel', 'transparent or opaque backboard', 'metal rim', 'woven net', 'concrete foundation and protective padding'],
  },
  {
    name: 'integrated playground structure',
    pattern: /playground/,
    dimensions: { width: 10, depth: 8, height: 4.5 },
    purpose: 'a connected children’s play structure with age-readable climbing, sliding, balancing, and social elements supported by safe rails, platforms, foundations, and fall-clearance zones',
    components: ['anchored support posts', 'multiple elevated platforms', 'stairs, ladders, or climbing panels', 'slides or descent elements', 'guardrails and handholds', 'bridges or crawl connections', 'ground-level play elements', 'fasteners and protective caps', 'fall-zone and access clearance'],
    materials: ['painted structural metal or treated timber', 'durable play panels', 'non-slip platform material', 'slides and handholds', 'ground anchors and safety surfacing'],
  },
  {
    name: 'weighing or appraisal scale',
    pattern: /market_.*scale|relic_scale|appraisal_scale|math_scale/,
    dimensions: { width: 0.75, depth: 0.5, height: 0.75 },
    purpose: 'a readable weighing instrument with stable base, load platform or pans, calibrated mechanism or digital sensor, controls, and a visible measurement display',
    components: ['stable weighted base', 'load platform, tray, or balance pans', 'load cell, beam, spring, or pivot mechanism', 'calibrated display or indicator', 'zero, tare, or adjustment control', 'protective housing', 'feet and service access'],
    materials: ['painted or stainless structure', 'load platform material', 'measurement display', 'mechanical or electronic hardware'],
  },
  {
    name: 'exercise treadmill or cardio machine',
    pattern: /treadmill|cardio_pad|balance_trainer/,
    dimensions: { width: 0.9, depth: 2.1, height: 1.45 },
    purpose: 'a stable exercise machine with human-scale running or training surface, support frame, controls, safety system, drive or resistance hardware, and floor protection',
    components: ['load-bearing base frame', 'running belt, training pad, or balance surface', 'rollers, resistance, or drive mechanism', 'upright supports and hand grips', 'control display and inputs', 'emergency stop or safety tether', 'motor ventilation and service cover', 'floor glides and user clearance'],
    materials: ['painted structural metal', 'rubber training surface', 'polymer control housing', 'screen and buttons', 'motor and mechanical hardware'],
  },
  {
    name: 'additive manufacturing printer',
    pattern: /3d_printer/,
    dimensions: { width: 1, depth: 0.9, height: 1.6 },
    purpose: 'an enclosed fabrication machine with a rigid motion frame, build platform, print head, material feed, controls, ventilation, and safe service access',
    components: ['rigid printer frame', 'enclosed build chamber', 'movable build platform', 'print head and X-Y-Z motion system', 'material spool, hopper, or feed path', 'control screen and emergency stop', 'ventilation and filtration', 'front access door and interlock', 'rear service panel and cable routing'],
    materials: ['painted structural enclosure', 'framed safety glass', 'motion rails and hardware', 'build platform material', 'controls, cables, and feed material'],
  },
  {
    name: 'heated food holding cabinet',
    pattern: /food_warmer/,
    dimensions: { width: 0.85, depth: 0.7, height: 1.4 },
    purpose: 'a food-service warming unit with insulated enclosure, heated shelves, controlled airflow, temperature display, safe access doors, and cleanable surfaces',
    components: ['insulated cabinet', 'framed access door with heat-resistant glass where required', 'removable heated shelves or trays', 'heating elements and protected fan', 'temperature controls and display', 'door seals and handles', 'ventilation and service panel', 'stable feet or counter mount'],
    materials: ['stainless food-service metal', 'insulation and interior liner', 'heat-resistant glass', 'shelf and tray material', 'controls, seals, and handles'],
  },
  {
    name: 'security or data interface module',
    pattern: /hack_port|security_node|signal_scrambler|restricted_door_panel|hacked_panel|server_stack|medical_monitor|debug_screen/,
    dimensions: { width: 0.9, depth: 0.45, height: 1.5 },
    purpose: 'a serviceable electronic system with protected enclosure, readable interface, network and power connections, status lighting, cooling, and controlled access to internal hardware',
    components: ['anchored cabinet, rack, or wall mount', 'screen, ports, controls, or diagnostic interface', 'processing, switching, or sensor hardware', 'power and data cable paths', 'status and warning lights', 'ventilation or active cooling', 'locked service panel', 'labels and connection protection'],
    materials: ['painted or composite electronics housing', 'screen and control surfaces', 'metal rack or mounting hardware', 'cables and connectors', 'status-light lenses'],
  },
  {
    name: 'radio or communications unit',
    pattern: /radio|smart_speaker|speaker_stack/,
    dimensions: { width: 0.45, depth: 0.3, height: 0.35 },
    purpose: 'a communications or audio device with protective housing, speaker and microphone surfaces, controls, antenna or network connection, power access, and stable placement',
    components: ['protective electronics housing', 'speaker grille', 'microphone or input opening where required', 'buttons, knobs, or touch controls', 'antenna, cable, or network connection', 'status display or indicator lights', 'battery, power, or service cover', 'wall, desk, rack, or carrying support'],
    materials: ['electronics housing', 'speaker mesh', 'control and display materials', 'antenna, cable, and hardware'] },
  {
    name: 'marine life ring and rescue station',
    pattern: /life_ring/,
    dimensions: { width: 0.9, depth: 0.22, height: 1.2 },
    purpose: 'a visible waterfront rescue device with buoyant ring, grab line, mounting bracket, identification, and immediate removal clearance',
    components: ['buoyant ring body', 'contrasting grab bands', 'perimeter rescue line', 'wall, rail, or post bracket', 'quick-release retention', 'instruction or identification panel', 'weather-resistant fasteners and drainage'],
    materials: ['buoyant foam or polymer ring', 'rope or line', 'painted or galvanized bracket', 'reflective markings and hardware'],
  },
  {
    name: 'navigation or hazard light',
    pattern: /navigation_light|rune_lamp|torch|lantern|spotlight|softbox|light_stand/,
    dimensions: { width: 0.5, depth: 0.5, height: 1.8 },
    purpose: 'a supported lighting fixture whose housing, lens, light source, power or fuel path, aiming, heat protection, and mounting are physically understandable',
    components: ['stable base, wall bracket, pole, or stand', 'fixture housing', 'lens, diffuser, flame guard, or reflector', 'light source or fuel chamber', 'aiming joint or fixed orientation', 'power cable, fuel path, or service opening', 'heat, weather, or impact protection', 'controls and fasteners'],
    materials: ['painted or forged support', 'glass or optical lens', 'reflective interior', 'light source or emissive material', 'cable, fuel, and hardware'],
  },
  {
    name: 'fountain or public water feature',
    pattern: /fountain|communal_fire|well/,
    dimensions: { width: 3, depth: 3, height: 2.2 },
    purpose: 'a permanent gathering feature with stable basin or hearth, central functional element, concealed utility or fuel path, drainage or ash handling, safe edges, and civic-scale visual presence',
    components: ['foundation and surrounding apron', 'basin, hearth, or well enclosure', 'central fountain, fire, or lifting element', 'water, fuel, rope, or mechanism path', 'drainage, overflow, ash, or service access', 'safe edge treatment and barriers where required', 'lighting or identification details'],
    materials: ['stone, masonry, or metal enclosure', 'water, flame, rope, or mechanical material', 'drainage and service hardware', 'lighting where required'],
  },
  {
    name: 'blacksmith forge equipment',
    pattern: /blacksmith_(?:forge|anvil|hammer|cooling_barrel)/,
    dimensions: { width: 1.2, depth: 0.9, height: 1.2 },
    purpose: 'a heavy working smithing asset with believable mass, heat or impact surfaces, stable support, tool handling, wear, and safe placement in a forge workspace',
    components: ['heavy structural body', 'working face, firebox, striking surface, or cooling vessel', 'stable base or stand', 'handles, tuyere, lid, or tool grip where required', 'heat, impact, scale, and soot zones', 'service or cleanout access', 'floor clearance and nearby tool interaction'],
    materials: ['forged or cast iron', 'firebrick, charcoal, water, or wood where required', 'tool steel and handle material', 'heat, soot, and impact surface variation'],
  },
  {
    name: 'dungeon interaction or hazard prop',
    pattern: /dungeon_(?:key|lever|pressure_tile|safe_shrine|swinging_hazard)|training_dummy|rescue_bell|recovery_crystal|blessing_stone/,
    dimensions: { width: 1, depth: 0.8, height: 1.5 },
    purpose: 'a readable fantasy interaction object with grounded support, a clear usable or hazardous mechanism, stateful parts, material wear, and gameplay-visible feedback',
    components: ['grounded base, socket, chain, stand, or wall mount', 'primary interaction or hazard body', 'handle, keyway, striking area, trigger, or contact surface', 'moving joint, swing, compression, or state mechanism', 'visual feedback through position, light, particles, or markings', 'damage, reset, or service state', 'fasteners and environmental integration'],
    materials: ['stone, timber, forged iron, crystal, rope, or leather appropriate to the object', 'interaction hardware', 'wear, emissive, or particle source material'],
  },
  {
    name: 'music or production equipment',
    pattern: /music_|studio_(?:boom_mic|clapperboard|light_stand)|drum_|keyboard_|microphone_|photo_(?:backdrop|softbox)/,
    dimensions: { width: 1.4, depth: 0.9, height: 1.5 },
    purpose: 'professional music, photography, or film equipment with stable stands, controls, cables, adjustment hardware, performer or operator clearance, and recognizable working surfaces',
    components: ['primary instrument, microphone, light, camera-support, or backdrop assembly', 'load-bearing stand or frame', 'controls, keys, pads, clamps, or adjustment joints', 'cable, signal, or power routing', 'protective housing or case', 'operator or performer interaction position', 'floor feet, anchors, or counterweights'],
    materials: ['painted or anodized structural metal', 'instrument, membrane, key, lens, fabric, or acoustic material', 'cables, controls, and adjustment hardware'],
  },
  {
    name: 'underwater energy, current, or sonar installation',
    pattern: /aqualume_.*(?:energy_core|current_turbine|sonar)|bluecore_.*(?:energy|charge)|current_guard_.*sonar|tideglass_sonar/,
    dimensions: { width: 2.2, depth: 2.2, height: 2.4 },
    purpose: 'a pressure-rated underwater technology installation with anchored structure, protected energy or sensor hardware, controlled water flow, service hatches, status lighting, and safe transit clearance',
    components: ['seabed, wall, platform, or building anchor', 'pressure-rated structural housing', 'energy core, turbine, sonar array, or charging interface', 'protective grille, shroud, or transparent chamber', 'power and data conduit paths', 'cooling or controlled current channels', 'service hatch and pressure seals', 'navigation and status lights'],
    materials: ['pressure-rated metal or composite', 'thick framed glass where required', 'marine seals and hardware', 'energy, sonar, or emissive lenses', 'reef-safe mounting material'],
  },
  {
    name: 'underwater shelter, pod, or pressure chamber',
    pattern: /aqualume_.*(?:shelter|pod|bubble)|pressure_chamber|holding_bubble|rest_bubble/,
    dimensions: { width: 3, depth: 3, height: 2.6 },
    purpose: 'an inhabited or emergency underwater enclosure with pressure-rated shell, framed viewing surfaces, sealed access, internal support, life-support connection, anchoring, and clear occupancy space',
    components: ['anchored pressure-rated base', 'structural shell or frame', 'thick framed glass or viewing panel', 'sealed hatch or entry collar', 'interior seat, bed, restraint, or occupancy surface', 'air, life-support, or pressure connection', 'status lighting and emergency controls', 'service access and marine seals'],
    materials: ['pressure-rated composite or metal', 'thick framed glass', 'marine seals and hatch hardware', 'interior upholstery or support', 'status and emergency lighting'],
  },
];

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function canonicalDescription(asset, profile) {
  const context = asset.sourceContext?.previousHeading || asset.sourceSection;
  return `${asset.displayName} uses the dedicated “${profile.name}” physical profile for ${asset.town} and the blueprint area “${context}.” Build it as ${profile.purpose}. The model must immediately read as ${asset.displayName} and include ${profile.components.join(', ')}. Use ${profile.materials.join(', ')} with town-appropriate construction, wear, mounting, lighting, service access, and environmental contact. The target envelope is approximately ${profile.dimensions.width} meters wide, ${profile.dimensions.depth} meters deep, and ${profile.dimensions.height} meters high, allowing only reviewed functional protrusions.`;
}

function applyProfile(asset, profile, reason) {
  asset.physicalSpecProfile = profile.name;
  asset.dimensionsMeters = { ...profile.dimensions };
  asset.requiredComponents = unique(profile.components);
  asset.materials = unique([...(profile.materials || []), ...(asset.materials || [])]).slice(0, 10);
  asset.description = canonicalDescription(asset, profile);
  asset.canonicalPhysicalDescription = asset.description;
  asset.designIntent = `Make ${asset.displayName} unmistakable as ${profile.name}. Preserve the complete component list, functional clearances, support logic, and ${asset.town} visual language without placeholder construction.`;
  asset.physicalSpecSpecialized = true;
  asset.physicalSpecSpecializationReason = reason;
  asset.physicalSpecSpecializedAt = new Date().toISOString();
}

let explicit = 0;
let dynamic = 0;
const dynamicIds = [];
for (const asset of deep.assets) {
  if (asset.physicalSpecDerived !== true) continue;
  const fileName = asset.fileName.toLowerCase();
  const explicitProfile = OVERRIDES.find((profile) => profile.pattern.test(fileName));
  if (explicitProfile) {
    applyProfile(asset, explicitProfile, `Filename and blueprint role match the dedicated ${explicitProfile.name} profile.`);
    explicit += 1;
    continue;
  }

  if (BROAD_PROFILE_NAMES.has(asset.physicalSpecProfile)) {
    const category = classifyFinalAsset(asset).replaceAll('_', ' ');
    const profile = {
      name: `${asset.displayName} role-specific ${category} profile`,
      dimensions: { ...asset.dimensionsMeters },
      purpose: `a purpose-built ${category} asset whose named role, source context, silhouette, support, interaction points, and service requirements are specific to ${asset.displayName}`,
      components: unique([
        `${asset.displayName} primary functional body`,
        `${asset.displayName} category-defining secondary assembly`,
        `${asset.displayName} support, mount, foundation, or contact structure`,
        `${asset.displayName} interaction, access, or operating interface`,
        `${asset.displayName} service, maintenance, or state-change component`,
        `${asset.displayName} safety, protection, edge, or retention detail`,
        ...(asset.requiredComponents || []),
      ]).slice(0, 14),
      materials: unique(asset.materials || []),
    };
    applyProfile(asset, profile, 'The asset did not match a reusable named profile, so a unique role-specific profile was generated from its display name, category, blueprint context, existing components, dimensions, and materials.');
    dynamic += 1;
    dynamicIds.push(asset.id);
    continue;
  }

  asset.physicalSpecSpecialized = true;
  asset.physicalSpecSpecializationReason = `The existing named ${asset.physicalSpecProfile} profile is already specific enough for this object.`;
  asset.physicalSpecSpecializedAt = new Date().toISOString();
}

deep.explicitPhysicalSpecializations = explicit;
deep.dynamicPhysicalSpecializations = dynamic;
deep.dynamicPhysicalSpecializationIds = dynamicIds;
deep.physicalSpecializationPassAt = new Date().toISOString();
coverage.explicitPhysicalSpecializations = explicit;
coverage.dynamicPhysicalSpecializations = dynamic;
coverage.dynamicPhysicalSpecializationIds = dynamicIds;
coverage.physicalSpecializationPassAt = deep.physicalSpecializationPassAt;

writeFileSync(DEEP_PATH, `${JSON.stringify(deep, null, 2)}\n`);
writeFileSync(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`);

console.log(`[deep-specs] applied ${explicit} explicit object profiles`);
console.log(`[deep-specs] generated ${dynamic} unique role-specific profiles for remaining broad assets`);
console.log(`[deep-specs] every derived asset now has a specialized physical profile`);
