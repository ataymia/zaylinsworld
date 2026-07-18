import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = process.cwd();
const FACTORY_ROOT = join(ROOT, 'asset-factory');
const GENERATED_ROOT = join(FACTORY_ROOT, 'generated');
const MASTER_PATH = join(GENERATED_ROOT, 'master-asset-specs.json');
const POLICY_PATH = join(FACTORY_ROOT, 'quality-policy.json');
const OUTPUT_PATH = join(GENERATED_ROOT, 'deep-asset-specs.json');
const COVERAGE_PATH = join(GENERATED_ROOT, 'deep-spec-coverage.json');
const MIN_DESCRIPTION_CHARACTERS = 1800;
const MIN_GENERATION_PROMPT_CHARACTERS = 900;

if (!existsSync(MASTER_PATH)) {
  throw new Error(`Missing compiled asset library: ${relative(ROOT, MASTER_PATH)}`);
}

const MASTER = JSON.parse(readFileSync(MASTER_PATH, 'utf8'));
const POLICY = JSON.parse(readFileSync(POLICY_PATH, 'utf8'));

const CLASS_DOCTRINES = {
  architecture: {
    identity: 'a complete architectural asset with a readable public face, believable secondary and service elevations, and construction logic appropriate to its use',
    silhouette: 'Establish the building category from massing before signage is visible. Roof profile, entrance hierarchy, structural bays, window rhythm, loading or service access, and ground contact must create a recognizable outline at neighborhood distance.',
    construction: 'Model a coherent foundation or plinth, load-bearing wall or frame logic, layered facade depth, roof drainage or parapet treatment, human-scale entrances, glazing with frames and mullions, utility penetrations, service access, and believable transitions where different materials meet.',
    interaction: 'Doors, windows, awnings, loading zones, stairs, ramps, counters, signs, and rooftop equipment should remain separable whenever gameplay, animation, damage states, lighting, or interior access may need them.',
    optimization: 'Preserve the silhouette and entrance readability in lower LODs. Repeating windows, trim, vents, panels, and railings should use instancing or shared geometry. Hidden interior faces and inaccessible roof undersides should not consume unnecessary geometry.',
  },
  vehicle: {
    identity: 'a mechanically plausible vehicle whose passenger, cargo, propulsion, cooling, lighting, access, and service systems are visually understandable',
    silhouette: 'The body must read as its vehicle class from front, side, rear, and three-quarter views before color or decals. Wheelbase or lift-pod spacing, cabin placement, overhangs, crash volumes, roofline, glazing, and stance must support believable operation.',
    construction: 'Include a load-bearing chassis, passenger or operator compartment, doors or access panels, windshield and side glazing, front and rear lighting, intake and cooling paths, propulsion hardware, service hatches, charging or fueling access, registration or fleet identification area, and protected underbody systems.',
    interaction: 'Keep doors, lights, propulsion units, steering or control surfaces, cargo access, service panels, and emissive systems as separately named parts for future animation, customization, damage, maintenance, and gameplay state changes.',
    optimization: 'Use smooth silhouette geometry where reflections expose faceting, but keep hidden underbody detail economical. Reuse repeated nacelles, wheels, seats, vents, lights, and fasteners. LOD reductions must not collapse the cabin, stance, propulsion layout, or lighting signature.',
  },
  character: {
    identity: 'a production character or creature requiring credible anatomy, purposeful design, deformation-ready topology, and a complete animation-ready hierarchy',
    silhouette: 'The species, age range, body type, role, clothing or armor category, and emotional tone must read from the outline. Head, torso, pelvis, limbs, hands or paws, feet, appendages, and carried equipment must relate through believable anatomy rather than disconnected primitives.',
    construction: 'Build continuous forms with clear skeletal landmarks, functional joints, usable hands or paws, grounded feet, face structure, eyes, mouth, clothing thickness, seams, fastening, and equipment attachment points. Organic surfaces require sculpting and retopology rather than stacked spheres or cylinders.',
    interaction: 'Provide a named skeleton, facial or expression controls where relevant, attachment sockets, collision capsules, root-motion conventions, and deformation tests for walking, running, sitting, reaching, turning, and the asset-specific action set.',
    optimization: 'Use deformation-focused edge flow, mirrored or shared materials where safe, controlled facial density, and LODs that preserve hands, face readability, joint volume, and signature appendages. This asset must remain quarantined until a dedicated anatomy and rigging pipeline exists.',
  },
  furniture: {
    identity: 'a human-scale furniture or interior asset with credible ergonomics, load paths, joinery, upholstery or surface construction, and a clear use case',
    silhouette: 'Seat height, work-surface height, depth, back angle, leg clearance, storage volume, and support placement must immediately communicate how a person uses the object.',
    construction: 'Model weight-bearing frames, legs or pedestals, brackets, seams, cushions, panels, drawers, hinges, glides, cable routing, fasteners, wall anchors, or floor anchors as appropriate. Thin materials need believable thickness and edge treatment.',
    interaction: 'Preserve seats, drawers, doors, screens, lamps, cushions, controls, and storage components as distinct objects when gameplay can sit, open, use, move, customize, or damage them.',
    optimization: 'Keep the ergonomic silhouette and contact points at all LODs. Repeated slats, legs, buttons, cushions, and fasteners should share meshes or instances. Small hardware may move to normal or trim detail only after the close-range model is approved.',
  },
  infrastructure: {
    identity: 'a serviceable civic, industrial, utility, transportation, or public-realm asset whose installation and maintenance logic are visible',
    silhouette: 'The asset must be recognizable from its functional outline: support, enclosure, access point, operating surface, protected hardware, and ground or wall connection.',
    construction: 'Include mounting plates, foundations, anchors, structural members, weather protection, hinges, latches, vents, conduit or cable paths, drainage, access doors, warning or identification surfaces, and hardware appropriate to the asset.',
    interaction: 'Separate controls, displays, doors, lenses, lights, handles, hoses, nozzles, gates, movable arms, covers, and service components so systems can animate or change state without replacing the whole model.',
    optimization: 'Preserve the functional outline, mounting, and operating surface. Repeated bolts, louvers, bars, slats, lenses, and posts should use instancing. Collision should follow the major blocking volume rather than every fastener.',
  },
  road_surface: {
    identity: 'a modular road, sidewalk, bridge, platform, curb, path, or traversal surface designed to tile cleanly and support movement without visible seams or implausible floating geometry',
    silhouette: 'The edge profile, grade, curb, shoulder, support, barrier, and connection geometry must explain how the surface carries traffic or pedestrians and connects to adjacent modules.',
    construction: 'Provide surface thickness, engineered edges, curbs or retaining structure, joints, drainage, markings, wear zones, supports, barriers, and transition pieces. Elevated modules require believable columns, beams, cables, brackets, or rock anchoring.',
    interaction: 'Define driving, walking, climbing, jumping, grinding, hazard, checkpoint, and fall boundaries through named surfaces or sockets. Markings and edge treatments must remain separate where gameplay changes them.',
    optimization: 'Use modular dimensions and shared materials. Keep collision simple, continuous, and free of micro-ledges. Distant LODs may reduce cracks and small hardware but cannot change grades, gaps, lane widths, edge safety, or traversal timing.',
  },
  signage: {
    identity: 'a permanently installed sign, marker, billboard, menu, route panel, or information display with readable hierarchy and credible support hardware',
    silhouette: 'The sign category must read from panel shape, scale, placement, support, and viewing angle. Text cannot be the only feature distinguishing a stop sign, district marker, storefront sign, transit panel, or digital display.',
    construction: 'Model panel thickness, border or bezel, posts or wall brackets, fasteners, electrical or lighting access, cable routing, rear structure, weather protection, and foundations where applicable.',
    interaction: 'Keep lettering, logos, display surfaces, indicator lights, changeable panels, and emissive layers separate so localization, state changes, damage, and nighttime lighting can occur without rebuilding the asset.',
    optimization: 'Close-range lettering may be mesh or high-resolution texture according to performance needs. Distant LODs should preserve panel shape, color block, mounting, and primary wordmark readability without excessive text geometry.',
  },
  food: {
    identity: 'a recognizable food, beverage, ingredient, serving, packaging, or kitchen-preparation asset with believable volume, portioning, surface response, and handling context',
    silhouette: 'The food type must read from shape, layering, cut, container, garnish, and portion before relying on a label. Avoid amorphous blobs when the dish has identifiable pieces or preparation structure.',
    construction: 'Model containers with thickness, lids, seams, handles, utensils, wrappers, trays, plates, cups, liquid levels, cut surfaces, toppings, crusts, bones, stems, or packaging closures as required by the item.',
    interaction: 'Separate edible portions, containers, lids, utensils, steam, liquid, toppings, and packaging when the item can be served, consumed, opened, poured, carried, stacked, or discarded.',
    optimization: 'Use material variation and normal detail for microtexture rather than excessive geometry. Preserve the food silhouette, main layers, container, and signature garnish in LODs. Collision should match the carried or placed container.',
  },
  vegetation: {
    identity: 'a botanically coherent tree, shrub, flower, crop, coral, fungus, or planted landscape asset with believable growth pattern, anchoring, branching, and material variation',
    silhouette: 'Species category and maturity must read from trunk or stem proportion, branch rhythm, crown shape, leaf massing, roots, fronds, petals, coral arms, or fungal caps.',
    construction: 'Build a clear growth hierarchy from roots or anchor through trunk, branches, stems, leaves, flowers, fruit, coral polyps, or other species structures. Avoid green spheres, random cards, or disconnected branch piles.',
    interaction: 'Provide wind groups, harvest points, breakable branches, climbable trunks, collision trunks, canopy fade settings, seasonal variants, and placement sockets where gameplay requires them.',
    optimization: 'Use cards, clusters, geometry nodes, instancing, and LOD billboards strategically while preserving the species silhouette and branching logic. Dense foliage must not produce opaque walls or excessive overdraw at gameplay distance.',
  },
  creature_prop: {
    identity: 'a specialized fantasy, marine, dungeon, decorative-organic, or creature-adjacent asset that needs coherent anatomy or growth logic even when it is static',
    silhouette: 'The category must read through a deliberate primary mass and meaningful secondary appendages, not repeated blobs, stacked circles, or disconnected primitive piles.',
    construction: 'Establish structural anatomy or growth hierarchy, attachment points, surface transitions, weight support, joints or roots, mouth or opening logic, protective structures, and material changes that explain function.',
    interaction: 'Define sockets, collision zones, damage or harvest regions, animation-ready appendages, emissive organs, particle emitters, and environmental attachment points where relevant.',
    optimization: 'Preserve the signature outline and functional appendages. Hide or simplify underside anatomy only where it cannot affect interaction. Organic hero assets remain unsupported until a suitable sculpting, retopology, and rigging workflow exists.',
  },
  generic_prop: {
    identity: 'a production-ready environmental or interactive prop with a recognizable purpose, coherent construction, correct scale, and town-specific materials',
    silhouette: 'The object must be identifiable from its primary body and functional secondary parts before labels or color. Handles, supports, openings, controls, edges, and contact points should explain use.',
    construction: 'Model the load-bearing body, panels, seams, hinges, fasteners, supports, handles, vents, feet, brackets, openings, service access, and internal or external functional hardware appropriate to the object.',
    interaction: 'Separate every part that may open, rotate, light, display information, receive an item, emit particles, take damage, change material, or connect to another system.',
    optimization: 'Preserve the silhouette and interaction points. Repeated hardware should share geometry. Small seams and surface texture may move to materials at lower LODs, but required functional parts cannot disappear.',
  },
};

const MATERIAL_BEHAVIOR = {
  metal: 'Metal surfaces need distinct painted, powder-coated, galvanized, brushed, cast, polished, oxidized, or heat-affected responses rather than one universal gray material.',
  glass: 'Glass requires thickness, framing, tint appropriate to the town, controlled transparency, believable roughness, and an interior or backing surface so it does not read as an empty blue plane.',
  masonry: 'Stone, brick, concrete, plaster, stucco, tile, and asphalt should show scale-correct joints, aggregate or surface breakup, edge wear, drainage staining, and construction transitions without noisy procedural speckling.',
  wood: 'Wood needs believable board direction, grain scale, end grain, joinery, sealing, wear, and moisture response appropriate to indoor, residential, marine, fantasy, or industrial use.',
  fabric: 'Fabric, upholstery, leather, rubber, and flexible polymers require thickness, seams, compression or tension cues, stitching where visible, and roughness variation tied to handling.',
  emissive: 'Emissive accents must arise from a lens, strip, screen, projector, fixture, biological organ, or energy component. Do not paint unexplained neon lines across ordinary structure.',
};

const CATEGORY_RULES = [
  ['character', /character|npc|humanoid|citizen|student|teacher|worker|guard|police|vendor|player|monster|creature|animal|wildlife|fish|shark|whale|dolphin|octopus|crab|bird|dog|cat|horse|dragon|golem|skeleton|zombie|boss/i],
  ['vehicle', /vehicle|car|sedan|coupe|truck|van|bus|taxi|bike|bicycle|motorcycle|boat|ship|ferry|submarine|train|tram|hover|aircraft|helicopter|forklift|cart|wagon/i],
  ['architecture', /^building_|house|apartment|hotel|casino|school|hospital|station|shop|store|restaurant|cafe|office|warehouse|factory|garage|theater|studio|mansion|villa|tower|temple|guild|dungeon_gate|facade|interior_shell/i],
  ['road_surface', /^road_|^sidewalk_|^crosswalk_|bridge|platform|path_|walkway|ramp|stairs|track|curb|tunnel|dock_module|pier_module|runway|checkpoint_course/i],
  ['signage', /sign|billboard|marquee|menu_board|route_panel|nameplate|plaque|poster|banner|wayfinding|advert|display_board/i],
  ['food', /^food_|meal|drink|beverage|cup|bottle|can_|plate|tray|burger|pizza|taco|sandwich|fries|cake|bread|fruit|vegetable|meat|fish_dish|coffee|soda|candy|snack|ingredient/i],
  ['vegetation', /tree|shrub|bush|flower|grass|plant|planter|crop|vine|coral|kelp|seaweed|mushroom|fungus|cactus|palm|garden|hedge/i],
  ['furniture', /furniture|chair|bench|desk|table|bed|sofa|couch|shelf|cabinet|locker|counter|booth|stool|wardrobe|dresser|nightstand|lamp|rug|monitor_station/i],
  ['infrastructure', /streetlight|traffic_light|hydrant|utility|bollard|guardrail|drain|shelter|charging|fuel_pump|terminal|kiosk|generator|transformer|antenna|vent|pipe|valve|gate|fence|railing|crane|winch|pump|service|equipment|machine|conveyor|dumpster|trash|mailbox/i],
  ['creature_prop', /egg|nest|bone|skull|tentacle|claw|shell|organic|crystal_growth|monster_part|statue_creature|fossil/i],
];

function cleanText(value) {
  return String(value ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentence(value) {
  const text = cleanText(value);
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function humanize(value) {
  return String(value ?? '')
    .replace(/\.glb$/i, '')
    .replace(/^([a-z]+)_/, '')
    .replace(/_v\d+$/i, '')
    .replace(/_[a-z]$/i, '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => {
      if (/^(ui|ev|npc|led|hvac|atm|vr|ar|ai|3d)$/i.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function classify(spec) {
  const haystack = `${spec.fileName} ${spec.displayName} ${spec.family} ${spec.sourceSection}`;
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(haystack)) return category;
  }
  if (spec.family === 'building_shell') return 'architecture';
  if (spec.family === 'road_module') return 'road_surface';
  if (spec.family === 'unsupported_character') return 'character';
  return 'generic_prop';
}

function readSourceContext(spec) {
  const sourcePath = join(ROOT, spec.sourceDoc);
  if (!existsSync(sourcePath)) {
    return {
      excerpt: sentence(`The asset was added through ${spec.sourceDoc} under ${spec.sourceSection}`),
      previousHeading: spec.sourceSection,
      nextHeading: null,
    };
  }

  const source = readFileSync(sourcePath, 'utf8');
  const index = source.indexOf(spec.fileName);
  if (index < 0) {
    return {
      excerpt: sentence(`The source document places this asset under ${spec.sourceSection}`),
      previousHeading: spec.sourceSection,
      nextHeading: null,
    };
  }

  const before = source.slice(0, index);
  const after = source.slice(index + spec.fileName.length);
  const previousHeadings = [...before.matchAll(/^#{1,6}\s+(.+)$/gm)];
  const nextHeadingMatch = after.match(/^#{1,6}\s+(.+)$/m);
  const previousHeading = previousHeadings.at(-1)?.[1]?.trim() || spec.sourceSection;
  const previousBoundary = Math.max(
    before.lastIndexOf('\n\n', Math.max(0, before.length - 1200)),
    before.lastIndexOf('\n#', Math.max(0, before.length - 1200)),
  );
  const nextParagraph = after.indexOf('\n\n');
  const nextBoundary = nextParagraph >= 0 ? Math.min(nextParagraph + spec.fileName.length, 1200) : 900;
  const raw = source.slice(Math.max(0, previousBoundary), Math.min(source.length, index + nextBoundary));
  const excerpt = cleanText(raw).slice(0, 1400);
  return {
    excerpt: excerpt || sentence(`The source document places this asset under ${spec.sourceSection}`),
    previousHeading,
    nextHeading: nextHeadingMatch?.[1]?.trim() || null,
  };
}

function inferPlacement(spec, category) {
  const name = spec.fileName.toLowerCase();
  if (category === 'architecture') return 'Place it on a level, intentionally graded parcel with entrances aligned to walkable routes, service access facing a plausible alley or back-of-house zone, and facade orientation supporting the district composition.';
  if (category === 'road_surface') return 'Snap it to the applicable road, path, bridge, platform, or traversal grid with exact edge continuity, matching elevation, consistent lane or walkway width, and no gaps, overlaps, floating supports, or collision lips.';
  if (category === 'vehicle') return 'Spawn it on a road, parking, dock, rail, air, water, or charging socket appropriate to its propulsion system. Ground or hover clearance, forward axis, turning envelope, passenger access, and camera framing must remain consistent.';
  if (category === 'character') return 'Spawn it from a named ground socket with a stable root, clear facing direction, navigation clearance, interaction radius, and animation-safe separation from walls, furniture, crowds, and props.';
  if (/wall|poster|screen|sign|panel|plaque/.test(name)) return 'Mount it to a named wall, post, facade, or support socket at a readable viewing height and angle, with no floating gap, z-fighting, or hidden service hardware.';
  if (/ceiling|hanging|chandelier|pendant/.test(name)) return 'Suspend it from a named ceiling or structural socket with visible support, believable cable or chain length, and clearance from players, doors, and nearby fixtures.';
  if (/dock|harbor|marine|boat|pier/.test(name)) return 'Place it relative to a defined dock, shoreline, vessel, or marine-service socket with correct waterline, mooring clearance, wet-zone material behavior, and corrosion exposure.';
  return 'Place it on a named ground, counter, shelf, wall, vehicle, interior, or gameplay socket appropriate to the object. Contact points must sit flush, orientation must be deliberate, and surrounding clearance must support use and navigation.';
}

function inferWear(spec, category) {
  const town = spec.town;
  if (town === 'techtown') return 'Keep primary surfaces maintained and precision-fitted, but add restrained evidence of real use at touch points, lower edges, service fasteners, vents, charging contacts, floor interfaces, and exposed mechanical assemblies. Lighting remains controlled rather than uniformly glowing.';
  if (town === 'fishing-harbor') return 'Use salt exposure, sun fading, wet-darkened surfaces, rope polish, chipped marine paint, galvanized hardware, algae or water staining near the tide line, and practical repairs without turning every object into a derelict wreck.';
  if (town === 'rich-hills') return 'Maintain clean premium surfaces and landscaping discipline. Wear should be subtle and concentrated at tires, door handles, drainage paths, outdoor furniture contact points, service access, and concealed back-of-house zones.';
  if (town === 'dungeon-outskirts') return 'Use age, soot, mineral deposits, tool wear, damp staining, patched timber, rubbed leather, hammer marks, and repaired iron where the asset’s use supports them. Fantasy age cannot replace structural logic.';
  if (town === 'aqualume') return 'Show pressure-rated seals, marine growth only where maintenance permits it, mineral haze, current-polished edges, condensation or water response, and service wear at hatches, anchors, joints, and transit interfaces.';
  if (category === 'food') return 'Use preparation-specific variation such as browning, moisture, crumbs, condensation, sauce pooling, cut surfaces, wrapper creases, fingerprints on packaging, or temperature cues without making the item dirty or spoiled unless explicitly required.';
  return 'Apply restrained lived-in wear at contact points, lower edges, hinges, handles, feet, fasteners, drainage paths, service openings, tires, or exposed corners. Keep the asset maintained enough for its district and role rather than uniformly pristine or uniformly damaged.';
}

function inferMaterialPlan(spec, townProfile) {
  const supplied = (spec.materials || []).map(cleanText).filter(Boolean);
  const palette = (townProfile?.palette || []).map(cleanText).filter(Boolean);
  const materials = [...new Set([...supplied, ...palette])];
  return {
    namedMaterials: materials,
    metalRule: MATERIAL_BEHAVIOR.metal,
    glassRule: MATERIAL_BEHAVIOR.glass,
    masonryRule: MATERIAL_BEHAVIOR.masonry,
    woodRule: MATERIAL_BEHAVIOR.wood,
    flexibleRule: MATERIAL_BEHAVIOR.fabric,
    emissiveRule: MATERIAL_BEHAVIOR.emissive,
  };
}

function inferAnimationHooks(spec, category) {
  const hooks = [];
  const lower = `${spec.fileName} ${spec.requiredComponents?.join(' ')}`.toLowerCase();
  if (/door|gate|lid|hatch|cabinet|locker|drawer|hood|trunk/.test(lower)) hooks.push('hinged or sliding access state');
  if (/screen|monitor|display|sign|billboard|kiosk|terminal|menu/.test(lower)) hooks.push('changeable display or emissive state');
  if (/light|lamp|signal|headlight|taillight|emissive|neon/.test(lower)) hooks.push('day, night, powered, warning, and damaged light states');
  if (/wheel|hover|fan|propeller|rotor|conveyor|crane|pump|machine|vehicle/.test(lower)) hooks.push('moving mechanical or propulsion component');
  if (/seat|chair|bench|bed|booth|vehicle|character/.test(lower)) hooks.push('interaction or seating sockets');
  if (/food|drink|bottle|cup|container|crate|box|package/.test(lower)) hooks.push('pickup, open, consume, empty, stack, or discard state');
  if (category === 'character') hooks.push('root, locomotion, interaction, facial, and attachment animation sets');
  if (!hooks.length) hooks.push('transform, material-state, damage, pickup, or placement hook only where gameplay needs it');
  return [...new Set(hooks)];
}

function inferCollision(spec, category) {
  if (category === 'road_surface') return 'Use a continuous simplified traversal collider matching grades, gaps, curbs, and fall boundaries. Decorative cracks, bolts, grates, trim, and surface noise must not create snagging micro-collision.';
  if (category === 'architecture') return 'Use modular wall, floor, roof, stair, rail, counter, and doorway collision. Keep walkable interiors and entrances accurate while simplifying inaccessible facade ornament and rooftop equipment.';
  if (category === 'vehicle') return 'Use a stable chassis hull plus optional cabin, propulsion, or cargo colliders. Do not trace every vent, light, mirror, nacelle, wheel, or fastener. Entry sockets and clearance volumes must align with the visible body.';
  if (category === 'character') return 'Use a root capsule or species-appropriate locomotion hull plus optional hit regions. Render topology must never be used directly as navigation collision.';
  if (category === 'vegetation') return 'Use trunk, major branch, root, planter, or coral-anchor collision only where gameplay needs blocking, climbing, harvesting, or damage. Foliage cards and small leaves remain nonblocking.';
  return 'Use one or more primitive or low-complexity hulls matching the major blocking volume and interaction surface. Handles, fasteners, cables, slats, trim, foliage, and decorative detail should not become snagging collision.';
}

function inferLod(spec, category) {
  const baseTriangles = Number(spec.quality?.maximumTriangles || 30000);
  const close = Math.max(500, Math.round(baseTriangles * 0.78));
  const medium = Math.max(250, Math.round(baseTriangles * 0.36));
  const far = Math.max(80, Math.round(baseTriangles * 0.12));
  return {
    lod0: `Close-range model may use up to the approved asset maximum, with a practical target near ${close.toLocaleString()} triangles when the silhouette and required components justify it.`,
    lod1: `Medium-range model should target roughly ${medium.toLocaleString()} triangles while preserving the primary silhouette, interaction components, material blocks, and major openings.`,
    lod2: `Far model should target roughly ${far.toLocaleString()} triangles or an equivalent impostor while retaining the recognizable outline, support relationship, and essential color or light signature.`,
    neverCollapse: CLASS_DOCTRINES[category].silhouette,
  };
}

function inferOrientation(spec, category) {
  if (category === 'vehicle') return 'Use positive Z as forward, positive Y as up after export conversion, and place the origin at the ground or hover-plane center below the chassis. Preserve a separate transform for animated propulsion hardware.';
  if (category === 'architecture') return 'Use positive Z as the principal public-facing or entrance direction, positive Y as up after export conversion, and place the origin at ground level near the parcel or modular footprint center.';
  if (category === 'road_surface') return 'Use positive Z as the direction of travel or module continuation, positive Y as up after export conversion, and place the origin on the module connection plane or geometric center defined by the blueprint grid.';
  if (category === 'character') return 'Use positive Z as forward, positive Y as up after export conversion, and place the origin at the ground projection of the root or pelvis control according to the character pipeline.';
  return 'Use positive Z as the front or primary viewing direction, positive Y as up after export conversion, and place the origin at the ground contact, wall mount, suspension point, or logical placement center described by the asset role.';
}

function buildQaChecklist(spec, category, doctrine, context) {
  const required = (spec.requiredComponents || []).map((item) => `Required component is visibly modeled and separately identifiable: ${item}.`);
  return [
    `The asset is immediately recognizable as ${spec.displayName} from front, side, rear, and three-quarter views without relying only on labels or color.`,
    `The result matches the ${spec.town} direction and does not borrow unrelated town materials or decorative language.`,
    `The primary proportions remain within the approved target of approximately ${spec.dimensionsMeters.width} m wide, ${spec.dimensionsMeters.depth} m deep, and ${spec.dimensionsMeters.height} m high unless a reviewed override documents protruding hardware.`,
    'The object has a coherent load path, support, anatomy, growth hierarchy, or mechanical structure appropriate to its category.',
    'Every opening, door, support, handle, control, propulsion unit, joint, root, or contact point has enough geometry to explain its function.',
    'Material boundaries correspond to actual construction, not arbitrary color blocking.',
    'Glass, fabric, wood, masonry, metal, food, vegetation, and emissive surfaces use category-appropriate thickness and response.',
    'The origin, forward direction, ground or mount contact, scale, naming, and hierarchy are export-ready.',
    'Collision follows major blocking and interaction volumes without tracing decorative detail.',
    'LOD plans preserve silhouette, interaction points, support logic, and the town-specific visual signature.',
    'Four-angle previews show no disconnected parts, accidental intersections, floating supports, open backs, inverted faces, or hidden required components.',
    `The asset supports the blueprint context “${context.previousHeading || spec.sourceSection}” rather than acting as context-free filler.`,
    ...required,
  ];
}

function buildRejectionCriteria(spec, category) {
  const global = POLICY.prohibitedShortcuts || [];
  const specific = spec.forbiddenShortcuts || [];
  const categoryRules = {
    architecture: ['reject flat undecorated boxes presented as finished buildings', 'reject doors or windows that are decals without frames, depth, or usable scale', 'reject facades with no service, roof, drainage, foundation, or back-of-house logic'],
    vehicle: ['reject floating boxes, flying saucers, wheel-less shells, or decorative rings without mounted propulsion structure', 'reject cabins that cannot plausibly contain the required occupants', 'reject vehicles lacking access, lighting, cooling, crash volume, service, and energy interfaces'],
    character: ['reject cylinder-and-sphere anatomy, stacked blobs, mitten hands, peg feet, disconnected limbs, and unriggable topology', 'reject faces without usable eyes, mouth, skull, jaw, and expression structure', 'reject clothing painted onto anatomy when thickness, seams, or equipment attachment are required'],
    furniture: ['reject furniture made from two or three unsupported boxes', 'reject impossible seat heights, depths, back angles, or leg clearance', 'reject surfaces with no frame, joinery, fasteners, wall support, or floor support'],
    infrastructure: ['reject plain cubes, poles, or barrels when the object requires access, controls, mounting, weatherproofing, and service hardware', 'reject painted-on vents, handles, grilles, bolts, doors, or operating surfaces at close range'],
    road_surface: ['reject floating traversal pieces without structural support', 'reject visible seams, inconsistent grades, mismatched widths, micro-ledges, or collision gaps', 'reject markings used to hide missing curb, drainage, barrier, or connection geometry'],
    signage: ['reject blank panels whose identity depends entirely on a floating text object', 'reject signs without backs, brackets, posts, fasteners, power, foundations, or weather protection'],
    food: ['reject amorphous blobs for foods with recognizable pieces or layers', 'reject containers without thickness, closures, liquid levels, handles, or serving context'],
    vegetation: ['reject green spheres, random cards, disconnected branches, or coral piles without growth hierarchy', 'reject foliage scale, density, or overdraw that blocks navigation and visibility'],
    creature_prop: ['reject stacked circles, repeated blobs, disconnected appendages, and arbitrary spikes without anatomy or growth logic'],
    generic_prop: ['reject generic primitive substitutes that omit the object’s defining functional parts', 'reject one-material outputs when the object clearly uses separate structural, flexible, transparent, emissive, or service materials'],
  };
  return [...new Set([...global, ...specific, ...(categoryRules[category] || categoryRules.generic_prop)])];
}

function buildGenerationPrompt(spec, category, doctrine, townProfile, context, materialPlan) {
  const components = (spec.requiredComponents || []).join(', ');
  const materials = materialPlan.namedMaterials.join(', ');
  const prompt = [
    `Create ${spec.displayName}, asset ID ${spec.id}, as ${doctrine.identity}.`,
    sentence(spec.description),
    `The asset belongs to ${spec.town}. Follow this town direction: ${townProfile.style}`,
    `Blueprint placement and narrative evidence: ${context.excerpt}`,
    `Use a target envelope near ${spec.dimensionsMeters.width} meters wide, ${spec.dimensionsMeters.depth} meters deep, and ${spec.dimensionsMeters.height} meters high.`,
    doctrine.silhouette,
    doctrine.construction,
    `Required visible components: ${components}.`,
    `Material plan: ${materials}. ${materialPlan.metalRule} ${materialPlan.glassRule} ${materialPlan.masonryRule} ${materialPlan.woodRule} ${materialPlan.flexibleRule} ${materialPlan.emissiveRule}`,
    inferWear(spec, category),
    doctrine.interaction,
    inferPlacement(spec, category),
    inferOrientation(spec, category),
    doctrine.optimization,
    'Deliver a clean production GLB with named parts, correct scale, no hidden placeholder geometry, no floating pieces, and no decorative element that replaces missing functional structure.',
  ].join(' ');
  return prompt.length >= MIN_GENERATION_PROMPT_CHARACTERS
    ? prompt
    : `${prompt} Every visible decision must reinforce object identity, physical plausibility, gameplay readability, and the approved town atmosphere.`;
}

function buildDeepDescription(spec, category, doctrine, townProfile, context, materialPlan, placement, wear, collision, orientation, lod) {
  const assetName = spec.displayName || humanize(spec.fileName);
  const components = (spec.requiredComponents || []).join(', ');
  const materials = materialPlan.namedMaterials.join(', ');
  const paragraphs = [
    `${assetName} is the production interpretation of ${spec.fileName} for ${spec.town}, sourced from ${spec.sourceDoc} under “${context.previousHeading || spec.sourceSection}.” ${sentence(spec.description)} Its job is not merely to occupy space. It must support the world-building, navigation, gameplay, or service role implied by the blueprint context: ${context.excerpt}`,
    `Identity and silhouette: Treat this as ${doctrine.identity}. ${doctrine.silhouette} Keep the target envelope near ${spec.dimensionsMeters.width} meters wide, ${spec.dimensionsMeters.depth} meters deep, and ${spec.dimensionsMeters.height} meters high, while allowing only reviewed protrusions such as arms, signs, mirrors, doors, roots, lighting, hoses, railings, propulsion units, or service hardware. The silhouette must remain readable in neutral clay material, because paint, text, and glow are secondary confirmation rather than a substitute for form.`,
    `Construction and functional anatomy: ${doctrine.construction} The mandatory visible component set is: ${components}. Each component must connect to the rest of the object through credible brackets, frames, joints, seams, foundations, roots, supports, hinges, cables, ducts, fasteners, or structural transitions. Empty decorative shells, disconnected parts, and details painted onto surfaces are unacceptable when those details explain how the object operates, carries weight, contains people, grows, opens, moves, drains, receives power, or is serviced.`,
    `Materials, color, and lighting: The approved material vocabulary includes ${materials}. ${townProfile.style} ${materialPlan.metalRule} ${materialPlan.glassRule} ${materialPlan.masonryRule} ${materialPlan.woodRule} ${materialPlan.flexibleRule} ${materialPlan.emissiveRule} The object should use controlled variation in roughness, edge response, tint, wear, and contact shading so it reads as assembled from real materials rather than colored geometry. Avoid the town-specific failures: ${(townProfile.avoid || []).join(', ')}.`,
    `Condition and environmental integration: ${wear} ${placement} The asset must share the ground plane, wall plane, waterline, parcel logic, road grid, dock system, room layout, or gameplay socket of its environment. Add contact shadows, foundations, feet, roots, brackets, anchor bolts, seals, trim, drainage, or transitions where needed so it never appears pasted into the scene.`,
    `Interaction, animation, and state design: ${doctrine.interaction} Expected hooks include ${inferAnimationHooks(spec, category).join(', ')}. Name those parts semantically. Do not merge a potentially animated door, screen, light, wheel, lift pod, drawer, lid, gate, control, character appendage, or service cover into an anonymous mesh if separating it preserves future options at reasonable cost.`,
    `Collision, orientation, and export: ${collision} ${orientation} Use a clean hierarchy with one asset root, consistently named render meshes, separate stateful or animated parts, simplified collision, and metadata for source, license, town, family, dimensions, and builder status. Remove cameras, preview lights, unused materials, duplicate hidden geometry, and accidental helper objects before export.`,
    `Performance and LOD: ${doctrine.optimization} ${lod.lod0} ${lod.lod1} ${lod.lod2} The reduction process must never destroy this recognition requirement: ${lod.neverCollapse}`,
    `Acceptance standard: the final asset must look intentional from all four inspection angles, satisfy every required component, fit the approved dimensional envelope, use at least the required number of meaningful materials and mesh objects, stay inside the triangle budget, sit correctly on its placement plane, and export as a verified nonempty GLB. A technically valid file that looks generic, toy-like, structurally impossible, context-free, or unlike ${assetName} is a failure and must be retried or quarantined rather than published.`,
  ];
  let description = paragraphs.join('\n\n');
  if (description.length < MIN_DESCRIPTION_CHARACTERS) {
    description += `\n\nFinal specificity rule: every modeling choice must be traceable to the asset name, the blueprint section, the required component list, the town palette, the interaction role, or a real structural requirement. Decorative complexity that cannot be explained by one of those sources should be removed, while missing functional detail should be added before approval.`;
  }
  return description;
}

function hashBrief(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function enrichSpec(spec) {
  const category = classify(spec);
  const doctrine = CLASS_DOCTRINES[category];
  const townProfile = POLICY.townProfiles?.[spec.town] || POLICY.townProfiles?.['shared-world'];
  const context = readSourceContext(spec);
  const materialPlan = inferMaterialPlan(spec, townProfile);
  const placement = inferPlacement(spec, category);
  const wear = inferWear(spec, category);
  const collision = inferCollision(spec, category);
  const orientation = inferOrientation(spec, category);
  const lod = inferLod(spec, category);
  const rejectionCriteria = buildRejectionCriteria(spec, category);
  const qaChecklist = buildQaChecklist(spec, category, doctrine, context);
  const deepDescription = buildDeepDescription(
    spec,
    category,
    doctrine,
    townProfile,
    context,
    materialPlan,
    placement,
    wear,
    collision,
    orientation,
    lod,
  );
  const generationPrompt = buildGenerationPrompt(spec, category, doctrine, townProfile, context, materialPlan);
  const negativePrompt = rejectionCriteria.join('; ');

  const productionBrief = {
    identity: doctrine.identity,
    blueprintEvidence: context,
    gameplayAndWorldRole: sentence(`${spec.displayName} supports ${spec.sourceSection} in ${spec.town}`),
    placement,
    silhouetteAndProportion: doctrine.silhouette,
    targetDimensionsMeters: spec.dimensionsMeters,
    structuralConstruction: doctrine.construction,
    requiredComponents: spec.requiredComponents,
    materialPlan,
    townArtDirection: townProfile,
    conditionAndWear: wear,
    interactionAndAnimation: {
      guidance: doctrine.interaction,
      hooks: inferAnimationHooks(spec, category),
    },
    collision,
    orientationAndPivot: orientation,
    optimization: doctrine.optimization,
    lod,
    exportHierarchy: [
      'one named asset root',
      'named render meshes grouped by functional component',
      'separate animated or stateful parts',
      'simplified collision objects or documented generated collision',
      'material names tied to real construction categories',
      'metadata for asset ID, town, family, source document, license, dimensions, and specification version',
    ],
    qualityBudget: spec.quality,
    qaChecklist,
    rejectionCriteria,
    licensingAndProvenance: {
      declaredLicense: spec.license,
      generatedBy: spec.generatedBy,
      sourceDocument: spec.sourceDoc,
      sourceSection: spec.sourceSection,
      referenceRule: 'Do not copy protected characters, logos, vehicles, architecture, or artwork from outside references. Use references only for broad material, proportion, function, and atmosphere unless a documented license permits direct use.',
    },
  };

  const enriched = {
    ...spec,
    specLayer: 'deep-production-brief',
    specVersion: 2,
    semanticCategory: category,
    sourceContext: context,
    deepDescription,
    generationPrompt,
    negativePrompt,
    productionBrief,
  };
  enriched.briefHash = hashBrief({
    id: enriched.id,
    deepDescription,
    generationPrompt,
    productionBrief,
  });
  return enriched;
}

const enrichedAssets = MASTER.assets.map(enrichSpec);
const townCounts = {};
const categoryCounts = {};
const familyCounts = {};
for (const asset of enrichedAssets) {
  townCounts[asset.town] = (townCounts[asset.town] || 0) + 1;
  categoryCounts[asset.semanticCategory] = (categoryCounts[asset.semanticCategory] || 0) + 1;
  familyCounts[asset.family] = (familyCounts[asset.family] || 0) + 1;
}

const output = {
  version: 2,
  generatedAt: new Date().toISOString(),
  sourceMaster: relative(ROOT, MASTER_PATH).replaceAll('\\', '/'),
  sourceMasterGeneratedAt: MASTER.generatedAt,
  policy: relative(ROOT, POLICY_PATH).replaceAll('\\', '/'),
  descriptionMinimumCharacters: MIN_DESCRIPTION_CHARACTERS,
  generationPromptMinimumCharacters: MIN_GENERATION_PROMPT_CHARACTERS,
  counts: {
    total: enrichedAssets.length,
    towns: townCounts,
    categories: categoryCounts,
    families: familyCounts,
  },
  assets: enrichedAssets,
};

const coverage = {
  version: 1,
  generatedAt: output.generatedAt,
  expectedFromMaster: MASTER.assets.length,
  produced: enrichedAssets.length,
  descriptionsAtOrAboveMinimum: enrichedAssets.filter((asset) => asset.deepDescription.length >= MIN_DESCRIPTION_CHARACTERS).length,
  promptsAtOrAboveMinimum: enrichedAssets.filter((asset) => asset.generationPrompt.length >= MIN_GENERATION_PROMPT_CHARACTERS).length,
  assetsWithBlueprintContext: enrichedAssets.filter((asset) => asset.sourceContext?.excerpt?.length >= 40).length,
  assetsWithQaChecklists: enrichedAssets.filter((asset) => asset.productionBrief.qaChecklist.length >= 12).length,
  assetsWithRejectionCriteria: enrichedAssets.filter((asset) => asset.productionBrief.rejectionCriteria.length >= 8).length,
  uniqueBriefHashes: new Set(enrichedAssets.map((asset) => asset.briefHash)).size,
  townCounts,
  categoryCounts,
  familyCounts,
};

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
writeFileSync(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`);

console.log(`[deep-specs] enriched ${enrichedAssets.length} assets`);
console.log(`[deep-specs] descriptions >= ${MIN_DESCRIPTION_CHARACTERS} chars: ${coverage.descriptionsAtOrAboveMinimum}`);
console.log(`[deep-specs] generation prompts >= ${MIN_GENERATION_PROMPT_CHARACTERS} chars: ${coverage.promptsAtOrAboveMinimum}`);
console.log(`[deep-specs] unique brief hashes: ${coverage.uniqueBriefHashes}`);
console.log(`[deep-specs] wrote ${relative(ROOT, OUTPUT_PATH)} and ${relative(ROOT, COVERAGE_PATH)}`);
