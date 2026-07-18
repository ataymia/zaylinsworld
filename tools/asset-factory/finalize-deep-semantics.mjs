import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORY_DOCTRINES } from './deep-spec-semantics.mjs';
import { classifyFinalAsset, semanticCategoryReason } from './deep-spec-final-classifier.mjs';

const ROOT = process.cwd();
const FACTORY_ROOT = join(ROOT, 'asset-factory');
const DEEP_PATH = join(FACTORY_ROOT, 'generated', 'deep-asset-specs.json');
const COVERAGE_PATH = join(FACTORY_ROOT, 'generated', 'deep-spec-coverage.json');
const POLICY_PATH = join(FACTORY_ROOT, 'quality-policy.json');
const deep = JSON.parse(readFileSync(DEEP_PATH, 'utf8'));
const coverage = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'));
const policy = JSON.parse(readFileSync(POLICY_PATH, 'utf8'));

const CATEGORY_REJECTIONS = {
  architecture: [
    'reject a primitive building box with no entrance hierarchy, facade depth, roof, foundation, drainage, openings, or service logic',
    'reject doors, windows, porches, vents, chimneys, shutters, and signs represented only by color patches where geometry is required',
    'reject human-scale access, structural support, or environmental connection that contradicts the building use',
  ],
  vehicle: [
    'reject a floating box, toy saucer, wheel-less shell, open platform, or decorative propulsion effect without mounted mechanical structure',
    'reject cabins, hulls, decks, or cargo volumes that cannot plausibly hold their occupants or load',
    'reject transportation without access, controls, lighting, propulsion, cooling, energy, protection, and service interfaces',
  ],
  character: [
    'reject stacked primitives, disconnected limbs, mitten hands, peg feet, false joints, and topology that cannot deform',
    'reject anatomy without coherent skeletal, facial, locomotion, sensory, clothing, or attachment structure',
    'reject a character or creature that reads as a prop pile rather than one continuous living form',
  ],
  furniture: [
    'reject unsupported slabs or boxes without frames, joinery, anchors, legs, brackets, plumbing, storage access, or ergonomic logic',
    'reject impossible seat height, depth, reach, back angle, leg clearance, work height, or user access',
    'reject doors, drawers, cushions, controls, and fixtures painted onto the surface where interaction needs real parts',
  ],
  infrastructure: [
    'reject plain poles, cubes, barrels, pads, or arches when installation, operation, protection, controls, access, and maintenance hardware are required',
    'reject painted-on vents, doors, scanners, cameras, lenses, hoses, handles, grilles, bolts, and operating surfaces at close range',
    'reject equipment floating without foundations, brackets, conduits, piles, anchors, road or dock connection, pressure seals, or service clearance',
  ],
  road_surface: [
    'reject floating traversal modules, unsupported spans, mismatched grades, inconsistent widths, or unclear connection direction',
    'reject seams, overlaps, collision gaps, snagging ledges, missing curbs, missing barriers, and unsafe fall boundaries',
    'reject markings or textures used to disguise missing support, drainage, docking, transition, or edge geometry',
  ],
  signage: [
    'reject a blank panel whose category depends only on floating text, a decal, or a generic glowing rectangle',
    'reject signs without panel thickness, backing, supports, brackets, fasteners, foundations, weather protection, or power where required',
    'reject unreadable hierarchy, incorrect viewing height, unrelated decoration, or excessive glow that overwhelms information',
  ],
  food: [
    'reject an amorphous blob for food with recognizable pieces, cuts, layers, toppings, packaging, utensils, or serving structure',
    'reject containers without thickness, closures, liquid levels, handles, seams, wrappers, or believable contact with the food',
    'reject random procedural noise instead of preparation-specific browning, moisture, crust, garnish, condensation, and cut surfaces',
  ],
  vegetation: [
    'reject green spheres, random cards, disconnected branches, coral piles, or mushrooms without coherent growth hierarchy',
    'reject roots, trunks, stems, branches, leaves, fronds, or anchors that cannot physically support the visible mass',
    'reject foliage density, scale, and overdraw that create opaque navigation walls or unreadable silhouettes',
  ],
  creature_prop: [
    'reject repeated blobs, stacked circles, arbitrary spikes, disconnected appendages, and biological pieces without anatomy or growth logic',
    'reject bones, nests, eggs, fossils, shells, webs, or organic structures without attachment, weight support, opening, layering, or environmental integration',
  ],
  generic_prop: [
    'reject a generic primitive substitute that omits the named object’s defining functional parts',
    'reject one undifferentiated material when structural, flexible, transparent, emissive, organic, liquid, food, or service materials are visibly distinct',
    'reject decorative complexity that does not explain use while handles, supports, openings, controls, fasteners, and contact points remain missing',
  ],
};

function sentence(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function dimensionsText(asset) {
  return `${asset.dimensionsMeters.width} meters wide, ${asset.dimensionsMeters.depth} meters deep, and ${asset.dimensionsMeters.height} meters high`;
}

function placementFor(asset, category) {
  if (category === 'architecture') return 'Place it on the parcel, terrain shelf, dock edge, modular foundation, or interior footprint named by the blueprint. Public access faces navigation and social space; service access faces the alley, utility corridor, backstage zone, waterfront service edge, or maintenance route. Foundation, stairs, ramps, porches, piles, retaining walls, and terrain transitions must meet the environment without floating gaps.';
  if (category === 'vehicle') return 'Spawn it on a road, parking bay, rail, waterline, dock, garage, flight socket, or hover pad appropriate to the propulsion system. Preserve forward direction, idle stance, occupant entry, cargo or passenger clearance, turning or docking envelope, camera framing, and surrounding safety space.';
  if (category === 'character') return 'Spawn it from a named root socket with stable ground, water, flight, wall, or locomotion contact, a clear forward direction, navigation clearance, interaction radius, and animation-safe distance from walls, crowds, furniture, props, and hazards.';
  if (category === 'furniture') return 'Place it on a named floor, wall, counter, workstation, classroom, bedroom, shop, restaurant, sanitary, storage, or service socket. Feet, wall brackets, plumbing, cable routes, backs, and user clearance must align with the room and nearby interaction positions.';
  if (category === 'infrastructure') return 'Install it on the named ground, curb, wall, road, dock, roof, utility corridor, platform, shoreline, or service foundation. Show anchors, brackets, conduits, piles, seals, drainage, clearance, and maintenance access so the device belongs to a real network rather than floating as decoration.';
  if (category === 'road_surface') return 'Snap it to the road, path, bridge, dock, rail, platform, course, or terrain grid with exact edge continuity, matching elevation, consistent width, correct travel direction, believable support spacing, and continuous simplified collision. No gaps, overlaps, floating ends, or invisible ledges are allowed.';
  if (category === 'signage') return 'Mount it to the named wall, post, facade, roadside foundation, kiosk base, ceiling support, menu stand, scoreboard frame, or portable base at a deliberate viewing height and angle. Backing, supports, power, weather protection, and service access may not disappear into or float away from the mounting surface.';
  if (category === 'food') return 'Place it in a hand, tray, plate, bowl, cup, package, counter, shelf, kitchen station, market display, vending slot, or serving socket appropriate to its portion and container. Pickup orientation, stacking, loose pieces, utensils, liquid level, and contact with the serving surface must be believable.';
  if (category === 'vegetation') return 'Anchor it in soil, rock, a planter, cultivated bed, roof garden, seabed, coral substrate, wall pocket, or shoreline appropriate to the species. Root or attachment structure, growth direction, density, wind or current response, and navigation clearance must fit the environment.';
  return 'Place it on a named ground, wall, ceiling, counter, shelf, dock, room, vehicle, terrain, water, or gameplay socket appropriate to its use. Every foot, base, root, bracket, anchor, contact edge, and suspension point must sit flush or visibly explain how it is supported.';
}

function collisionFor(category) {
  if (category === 'architecture') return 'Use modular floor, wall, roof, stair, rail, counter, doorway, foundation, and major structural collision. Walkable areas, entrances, windows used for gameplay, and service openings must match the visible model, while trim, roof equipment, cables, fasteners, and inaccessible facade detail remain simplified or nonblocking.';
  if (category === 'vehicle') return 'Use a stable chassis or hull collider with optional cabin, cargo, propulsion, or hit-region hulls. Do not trace every light, mirror, vent, wheel, pod, railing, rope, or fastener. Entry sockets and clearance volumes must align with the visible body.';
  if (category === 'character') return 'Use a root capsule or species-appropriate locomotion hull with optional head, torso, limb, appendage, or hit-region volumes. Render topology may not serve directly as navigation collision.';
  if (category === 'road_surface') return 'Use continuous simplified traversal collision matching grades, gaps, curbs, rails, docking edges, fall boundaries, and platform surfaces. Decorative cracks, bolts, grates, trim, and surface noise must not create snagging micro-collision.';
  if (category === 'vegetation') return 'Use trunk, major branch, root, planter, coral-anchor, or harvest collision only where gameplay needs blocking, climbing, damage, or collection. Leaves, petals, grass blades, and small fronds remain nonblocking.';
  if (category === 'food') return 'Use a simple collider matching the plate, package, cup, bottle, tray, bowl, or carried portion. Small toppings, crumbs, wrappers, utensils, steam, and liquid surfaces do not receive independent collision unless interaction specifically requires it.';
  return 'Use one or more primitive or low-complexity hulls matching the major blocking volume and interaction surface. Decorative handles, cables, slats, fasteners, trim, lenses, foliage, and surface detail must not create snagging collision.';
}

function orientationFor(category) {
  if (category === 'architecture') return 'Use positive Z as the principal entrance, public face, or module-forward direction and positive Y as up after export conversion. Place the origin at ground level or the documented connection plane near the footprint center.';
  if (category === 'vehicle') return 'Use positive Z as forward and positive Y as up after export conversion. Place the origin at the ground, waterline, rail, or hover-plane center below the chassis or hull, with separate transforms for propulsion and steering hardware.';
  if (category === 'character') return 'Use positive Z as forward and positive Y as up after export conversion. Place the origin at the ground projection of the root or locomotion control according to the character pipeline.';
  if (category === 'road_surface') return 'Use positive Z as the travel or module-continuation direction and positive Y as up after export conversion. Place the origin at the documented grid center, connection edge, spline point, or docking plane.';
  if (category === 'signage') return 'Use positive Z as the primary viewing face and positive Y as up after export conversion. Place the origin at the ground support, wall-mount center, hanging point, or portable base.';
  return 'Use positive Z as the front or primary use direction and positive Y as up after export conversion. Place the origin at the ground contact, wall mount, suspension point, waterline, or logical placement center.';
}

function conditionFor(asset, category) {
  if (asset.town === 'techtown') return 'Keep primary surfaces precision-made and maintained, with restrained use at handles, service fasteners, floor interfaces, vents, charging contacts, propulsion hardware, and controls. Emissive accents originate from real lenses, screens, fixtures, or energy systems and remain controlled.';
  if (asset.town === 'fishing-harbor') return 'Use salt exposure, sun fading, wet-darkened surfaces, rope polish, chipped marine paint, galvanized hardware, water staining near tide or wash zones, and practical repairs without turning every working asset into a wreck.';
  if (asset.town === 'rich-hills') return 'Keep premium public surfaces clean and maintained. Wear remains subtle at tires, drainage paths, handles, outdoor contact points, service access, staff-only areas, and concealed back-of-house zones.';
  if (asset.town === 'dungeon-outskirts') return 'Use soot, mineral deposits, damp staining, tool wear, patched timber, rubbed leather, hammer marks, repaired iron, and age only where construction and use justify them.';
  if (asset.town === 'aqualume') return 'Show pressure-rated seals, mineral haze, current-polished edges, controlled marine growth, condensation or water response, and service wear at hatches, anchors, joints, and transit interfaces.';
  if (category === 'food') return 'Use preparation-specific variation such as browning, moisture, crumbs, condensation, sauce pooling, cut surfaces, wrapper creases, garnish, and temperature cues without making the item spoiled unless explicitly required.';
  return 'Apply restrained lived-in wear at contact points, lower edges, hinges, handles, feet, fasteners, drainage paths, service openings, tires, exposed corners, or frequently cleaned surfaces. Match the district’s maintenance level rather than using uniform dirt or uniform perfection.';
}

function hooksFor(asset, category) {
  const text = `${asset.fileName} ${(asset.requiredComponents || []).join(' ')}`.toLowerCase();
  const hooks = [];
  if (/door|gate|lid|hatch|cabinet|locker|drawer|hood|trunk|shutter/.test(text)) hooks.push('hinged, sliding, folding, or removable access state');
  if (/screen|monitor|display|sign|billboard|kiosk|terminal|menu|scoreboard|board/.test(text)) hooks.push('changeable display, content, or emissive state');
  if (/light|lamp|signal|headlight|taillight|emissive|neon|beacon/.test(text)) hooks.push('day, night, powered, warning, and damaged light states');
  if (/wheel|hover|fan|propeller|rotor|conveyor|crane|pump|machine|vehicle|train|boat|tram/.test(text)) hooks.push('moving propulsion, steering, mechanism, or operating component');
  if (/seat|chair|bench|bed|booth|vehicle|character|saddle/.test(text)) hooks.push('seating, occupancy, or interaction sockets');
  if (/food|drink|bottle|cup|container|crate|box|package|tray/.test(text)) hooks.push('pickup, open, consume, empty, stack, carry, or discard state');
  if (category === 'character') hooks.push('root, locomotion, interaction, expression, hit-reaction, and attachment animation sets');
  if (category === 'vegetation') hooks.push('wind, current, harvest, damage, growth, season, or placement-variation groups');
  if (!hooks.length) hooks.push('transform, material-state, damage, pickup, or placement hook only where gameplay requires it');
  return [...new Set(hooks)];
}

function materialSummary(asset) {
  const plan = asset.productionBrief?.materialPlan || {};
  const names = plan.namedMaterials || asset.materials || [];
  const rules = [plan.metalRule, plan.glassRule, plan.masonryRule, plan.woodRule, plan.flexibleRule, plan.emissiveRule].filter(Boolean).join(' ');
  return { names, rules };
}

function lodFor(asset, doctrine) {
  const maximum = Number(asset.quality?.maximumTriangles || 30000);
  const close = Math.max(500, Math.round(maximum * 0.78));
  const medium = Math.max(250, Math.round(maximum * 0.36));
  const far = Math.max(80, Math.round(maximum * 0.12));
  return {
    lod0: `Close-range output may use up to the reviewed maximum, with a practical target near ${close.toLocaleString()} triangles when silhouette and required components justify it.`,
    lod1: `Medium-range output should target roughly ${medium.toLocaleString()} triangles while preserving primary form, supports, interaction components, openings, material blocks, and essential lights.`,
    lod2: `Far output should target roughly ${far.toLocaleString()} triangles or a suitable impostor while retaining the recognizable outline, mounting or ground relationship, and major color or emissive signature.`,
    neverCollapse: doctrine.silhouette,
  };
}

function rejectionCriteria(asset, category) {
  return [...new Set([
    ...(policy.prohibitedShortcuts || []),
    ...(asset.forbiddenShortcuts || []),
    ...(CATEGORY_REJECTIONS[category] || CATEGORY_REJECTIONS.generic_prop),
  ])];
}

function qaChecklist(asset, category, reason, context, doctrine) {
  const required = (asset.requiredComponents || []).map((component) => `Required component is visibly modeled and separately identifiable: ${component}.`);
  return [
    `${asset.displayName} is recognizable from front, side, rear, and three-quarter views without relying only on text, decals, color, or glow.`,
    `The resolved semantic category is ${category} because ${reason}; profession, species, customer, district, and narrative words do not override the physical object.`,
    `The result follows the ${asset.town} art direction and does not borrow an unrelated town palette, technology level, weathering language, or decorative motif.`,
    `The overall envelope remains near ${dimensionsText(asset)} unless a reviewed override documents protruding hardware.`,
    'The asset has a coherent load path, support, mechanical system, anatomy, growth hierarchy, serving structure, or assembly logic appropriate to the resolved category.',
    'Openings, access, supports, handles, controls, propulsion, joints, roots, containers, mounting, and contact points contain enough geometry to explain function.',
    'Material boundaries follow real construction, growth, preparation, packaging, or manufacturing and do not act as arbitrary color blocking.',
    'Transparent, flexible, organic, masonry, food, metal, wood, liquid, and emissive materials use believable thickness and response where present.',
    'Placement, pivot, forward direction, scale, naming, hierarchy, and source metadata are export-ready.',
    'Collision follows major blocking and interaction volumes without tracing decorative microdetail.',
    'LOD plans preserve silhouette, support, interaction points, occupancy, openings, and the town-specific visual signature.',
    'Four-angle previews contain no disconnected parts, accidental intersections, floating supports, inverted faces, open backs, hidden required components, or missing contact relationships.',
    `The asset visibly supports the blueprint context “${context.previousHeading || asset.sourceSection}” rather than acting as context-free filler.`,
    doctrine.silhouette,
    ...required,
  ];
}

function buildDescription(asset, category, reason, doctrine, context, placement, condition, collision, orientation, materials, hooks, lod) {
  const townProfile = asset.productionBrief?.townArtDirection || policy.townProfiles?.[asset.town] || policy.townProfiles?.['shared-world'];
  const required = (asset.requiredComponents || []).join(', ');
  const materialNames = materials.names.join(', ');
  return [
    `${asset.displayName} is the definitive production specification for ${asset.fileName} in ${asset.town}. It originates from ${asset.sourceDoc} under “${context.previousHeading || asset.sourceSection}.” ${sentence(asset.description)} The blueprint evidence is: ${context.excerpt}`,
    `Physical identity and semantic decision: the final category is ${category} because ${reason}. Model it as ${doctrine.identity}. Words describing an animal, profession, customer, owner, district, collection, or story function may not force character or creature anatomy onto an object such as a cottage, boat, crate, display, station, rack, board, feeder, machine, sign, or piece of equipment. The named object must be identifiable in neutral clay material before labels, color, and glow are applied.`,
    `Silhouette and proportion: ${doctrine.silhouette} Keep the working envelope near ${dimensionsText(asset)}. Only reviewed protrusions such as signs, arms, doors, mirrors, roots, branches, railings, hoses, lighting, propulsion, awnings, stairs, or service hardware may extend beyond it. Every major and secondary form must reinforce ${asset.displayName}; unrelated decorative mass should be removed.` ,
    `Construction and functional anatomy: ${doctrine.construction} Required visible components are ${required}. Each one must connect through credible frames, joints, seams, foundations, roots, brackets, fasteners, cables, pipes, glazing frames, hinges, biological attachment, serving structure, packaging, or material transitions. Flat paint, decals, and emission may not replace a component that explains operation, weight support, access, occupancy, growth, containment, drainage, power, preparation, protection, or maintenance.`,
    `Materials, color, and lighting: use the named material vocabulary ${materialNames}. ${sentence(townProfile.style)} ${materials.rules} Avoid the town-specific failures: ${(townProfile.avoid || []).join(', ')}. Surface variation should follow manufacturing, age, handling, weather, moisture, heat, pressure, preparation, cleaning, or maintenance rather than random noise. Emissive areas must originate from a real lens, screen, fixture, projector, biological organ, or energy system.`,
    `Condition and environmental integration: ${condition} ${placement} Add contact shadows, foundations, feet, brackets, roots, piles, seals, trim, drainage, terrain blending, waterline response, or wall transitions where the object meets its environment. It may not appear pasted into the scene or suspended by invisible support unless the design explicitly includes a justified force, mount, cable, lift field, or suspension system.`,
    `Interaction and state design: ${doctrine.interaction} Expected hooks include ${hooks.join(', ')}. Separate and name parts that can open, slide, rotate, illuminate, display content, receive an item, carry an occupant, change material, emit particles, take damage, be repaired, be harvested, or connect to another system. Static detail should remain efficient, but useful gameplay state boundaries may not be merged away.`,
    `Collision, orientation, and export: ${collision} ${orientation} Use one named asset root, semantically named render meshes, separate animated or stateful parts, simplified collision, and metadata for asset ID, town, family, source document, license, dimensions, final semantic category, and specification version. Remove preview cameras, lights, helpers, unused materials, duplicates, hidden placeholders, and accidental geometry before GLB export.`,
    `Performance and LOD: ${doctrine.optimization} ${lod.lod0} ${lod.lod1} ${lod.lod2} Reduction may never destroy this recognition requirement: ${lod.neverCollapse}`,
    `Acceptance standard: the final model must look intentional from every inspection angle, satisfy every required component, fit the reviewed scale, use meaningful material separation, remain inside geometry budgets, sit correctly on its placement plane, and export as a verified nonempty GLB. A technically valid file that looks generic, toy-like, structurally impossible, context-free, semantically misclassified, or unlike ${asset.displayName} is a failure. Correct it, retry it, or quarantine it instead of publishing it.`,
  ].join('\n\n');
}

function buildPrompt(asset, category, reason, doctrine, context, placement, condition, materials, hooks) {
  return [
    `Create ${asset.displayName}, asset ID ${asset.id}, for ${asset.town}.`,
    `Final physical category: ${category}, because ${reason}.`,
    `Build it as ${doctrine.identity}.`,
    sentence(asset.description),
    `Blueprint evidence: ${context.excerpt}`,
    `Target dimensions are approximately ${dimensionsText(asset)}.`,
    doctrine.silhouette,
    doctrine.construction,
    `Required visible components: ${(asset.requiredComponents || []).join(', ')}.`,
    `Named materials: ${materials.names.join(', ')}. ${materials.rules}`,
    condition,
    placement,
    doctrine.interaction,
    `State and animation hooks: ${hooks.join(', ')}.`,
    doctrine.optimization,
    'Deliver one clean production GLB with correct scale, semantic part names, an appropriate pivot, simplified collision guidance, no floating pieces, no hidden placeholder geometry, and no decorative element substituting for missing physical function.',
  ].join(' ');
}

function hashAsset(asset) {
  return createHash('sha256').update(JSON.stringify({
    id: asset.id,
    semanticCategory: asset.semanticCategory,
    semanticCategoryReason: asset.semanticCategoryReason,
    deepDescription: asset.deepDescription,
    generationPrompt: asset.generationPrompt,
    productionBrief: asset.productionBrief,
  })).digest('hex');
}

let corrections = 0;
const correctedIds = [];
for (const asset of deep.assets) {
  const previousCategory = asset.semanticCategory;
  const category = classifyFinalAsset(asset);
  const reason = semanticCategoryReason(asset);
  const doctrine = CATEGORY_DOCTRINES[category];
  const context = asset.sourceContext;
  const placement = placementFor(asset, category);
  const condition = conditionFor(asset, category);
  const collision = collisionFor(category);
  const orientation = orientationFor(category);
  const materials = materialSummary(asset);
  const hooks = hooksFor(asset, category);
  const lod = lodFor(asset, doctrine);
  const rejections = rejectionCriteria(asset, category);
  const checks = qaChecklist(asset, category, reason, context, doctrine);

  asset.semanticCategory = category;
  asset.semanticCategoryReason = reason;
  asset.deepDescription = buildDescription(asset, category, reason, doctrine, context, placement, condition, collision, orientation, materials, hooks, lod);
  asset.generationPrompt = buildPrompt(asset, category, reason, doctrine, context, placement, condition, materials, hooks);
  asset.negativePrompt = rejections.join('; ');
  asset.productionBrief = {
    ...asset.productionBrief,
    identity: doctrine.identity,
    blueprintEvidence: context,
    gameplayAndWorldRole: `${asset.displayName} supports ${asset.sourceSection} in ${asset.town} and must visibly serve that blueprint role as a ${category} asset.`,
    placement,
    silhouetteAndProportion: doctrine.silhouette,
    targetDimensionsMeters: asset.dimensionsMeters,
    structuralConstruction: doctrine.construction,
    requiredComponents: asset.requiredComponents,
    conditionAndWear: condition,
    interactionAndAnimation: { guidance: doctrine.interaction, hooks },
    collision,
    orientationAndPivot: orientation,
    optimization: doctrine.optimization,
    lod,
    qaChecklist: checks,
    rejectionCriteria: rejections,
    semanticCategoryDecision: { category, reason },
  };
  asset.semanticFinalizedAt = new Date().toISOString();
  asset.briefHash = hashAsset(asset);
  if (previousCategory !== category) {
    corrections += 1;
    correctedIds.push(asset.id);
  }
}

const categoryCounts = {};
for (const asset of deep.assets) categoryCounts[asset.semanticCategory] = (categoryCounts[asset.semanticCategory] || 0) + 1;
deep.counts.categories = categoryCounts;
deep.finalSemanticCorrections = corrections;
deep.finalSemanticCorrectedIds = correctedIds;
deep.finalSemanticPassAt = new Date().toISOString();
coverage.categoryCounts = categoryCounts;
coverage.finalSemanticCorrections = corrections;
coverage.finalSemanticCorrectedIds = correctedIds;
coverage.finalSemanticPassAt = deep.finalSemanticPassAt;
coverage.assetsWithBlueprintContext = deep.assets.filter((asset) => asset.sourceContext?.excerpt?.length >= 40).length;
coverage.assetsWithQaChecklists = deep.assets.filter((asset) => asset.productionBrief?.qaChecklist?.length >= 12).length;
coverage.assetsWithRejectionCriteria = deep.assets.filter((asset) => asset.productionBrief?.rejectionCriteria?.length >= 8).length;
coverage.descriptionsAtOrAboveMinimum = deep.assets.filter((asset) => asset.deepDescription.length >= deep.descriptionMinimumCharacters).length;
coverage.promptsAtOrAboveMinimum = deep.assets.filter((asset) => asset.generationPrompt.length >= deep.generationPromptMinimumCharacters).length;
coverage.uniqueBriefHashes = new Set(deep.assets.map((asset) => asset.briefHash)).size;

writeFileSync(DEEP_PATH, `${JSON.stringify(deep, null, 2)}\n`);
writeFileSync(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`);

console.log(`[deep-specs] final physical-object semantic pass rebuilt ${deep.assets.length} briefs`);
console.log(`[deep-specs] corrected ${corrections} category assignment(s): ${correctedIds.join(', ') || 'none'}`);
console.log(`[deep-specs] final categories: ${Object.entries(categoryCounts).map(([name, count]) => `${name}=${count}`).join(', ')}`);
