import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORY_DOCTRINES, classifyDeepAsset } from './deep-spec-semantics.mjs';

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
    'reject undecorated boxes presented as completed architecture',
    'reject doors, windows, vents, or service openings represented only by flat color without frames, depth, or usable scale',
    'reject structures with no foundation, support, roof, drainage, connection, or back-of-house logic',
  ],
  vehicle: [
    'reject floating boxes, toy saucers, wheel-less shells, or decorative rings without mounted propulsion structure',
    'reject cabins, decks, cockpits, or cargo areas that cannot plausibly contain the intended occupants or load',
    'reject transportation assets lacking access, lighting, cooling, protection, energy, and service interfaces',
  ],
  character: [
    'reject cylinder-and-sphere anatomy, stacked blobs, disconnected limbs, mitten hands, peg feet, and topology that cannot deform',
    'reject faces without coherent skull, eyes, mouth, jaw, sensory structure, and expression potential',
    'reject clothing, armor, fur, scales, or equipment painted onto anatomy when thickness and attachment are required',
  ],
  furniture: [
    'reject furniture built from unsupported slabs or boxes without load-bearing frames, joinery, wall support, or floor support',
    'reject impossible seat height, work height, reach, leg clearance, depth, back angle, plumbing, or storage access',
    'reject cushions, doors, drawers, controls, and fixtures that are painted onto the surface instead of modeled where interaction requires them',
  ],
  infrastructure: [
    'reject plain poles, cubes, barrels, pads, or arches when installation, access, controls, weatherproofing, and service hardware are required',
    'reject painted-on vents, handles, grilles, bolts, doors, scanners, lenses, hoses, and operating surfaces at close range',
    'reject devices that float without foundations, brackets, conduits, anchors, piles, road connections, wall mounts, or network logic',
  ],
  road_surface: [
    'reject floating traversal pieces without structural or terrain support',
    'reject seams, inconsistent grades, mismatched widths, collision gaps, snagging ledges, or unclear travel direction',
    'reject markings used to disguise missing curb, drainage, barrier, support, docking, or module-connection geometry',
  ],
  signage: [
    'reject blank panels whose identity depends only on floating text or a texture label',
    'reject signs without backs, brackets, posts, bezels, fasteners, foundations, power, or weather protection where required',
    'reject unreadable hierarchy, incorrect viewing angle, excessive glow, and unrelated decorative lettering',
  ],
  food: [
    'reject amorphous blobs for foods with recognizable pieces, layers, cuts, containers, or preparation structure',
    'reject containers without thickness, closures, liquid levels, handles, utensils, wrappers, or serving context',
    'reject random noise used as food texture instead of preparation-specific browning, moisture, crust, garnish, and cut surfaces',
  ],
  vegetation: [
    'reject green spheres, random cards, disconnected branches, coral piles, or mushrooms without growth hierarchy',
    'reject foliage scale, density, or overdraw that creates opaque walls or blocks navigation and sightlines',
    'reject roots, trunks, stems, fronds, and anchors that do not support the visible mass',
  ],
  creature_prop: [
    'reject stacked circles, repeated blobs, disconnected appendages, and arbitrary spikes without anatomy or growth logic',
    'reject biological surfaces with no attachment, weight support, opening, root, joint, shell, or protective structure',
  ],
  generic_prop: [
    'reject generic primitive substitutes that omit the defining functional parts of the named object',
    'reject one-material outputs when structural, flexible, transparent, emissive, food, organic, or service materials are visibly distinct',
    'reject details that add decorative complexity while leaving the object’s actual use unexplained',
  ],
};

function sentence(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function correctedSourceContext(asset) {
  const current = asset.sourceContext || {};
  if (String(asset.sourceDoc || '').endsWith('.json')) {
    const excerpt = `Manual canonical specification for ${asset.displayName}. ${sentence(asset.description)} ${sentence(asset.designIntent)} This entry was intentionally added outside the town blueprint inventory because it is a hero or proof asset requiring explicit dimensions, components, materials, and rejection criteria.`;
    return {
      ...current,
      excerpt,
      previousHeading: current.previousHeading || 'Manual canonical additions',
    };
  }
  return current;
}

function placementFor(asset, category) {
  if (category === 'architecture') return 'Place the asset on its intended parcel, module connection, terrain shelf, pier, wall line, or interior footprint. Entrances and usable faces align to navigation routes; service faces align to alleys, backstage areas, utility corridors, water access, or maintenance zones. Contact with terrain and adjacent modules must be continuous.';
  if (category === 'road_surface') return 'Snap the asset to the applicable traversal grid, road spline, dock grid, rail alignment, platform system, course socket, or terrain connection. Match elevation, width, grade, edge treatment, support spacing, collision, and markings with neighboring modules. No gaps, overlaps, floating ends, or invisible collision lips are permitted.';
  if (category === 'vehicle') return 'Spawn the asset on a road, parking bay, lift pad, rail, dock, waterline, flight socket, or garage position appropriate to its propulsion. Forward direction, clearance, entry side, turning or docking envelope, camera framing, occupant access, and idle stance must remain consistent.';
  if (category === 'character') return 'Spawn from a named root socket with stable ground or locomotion contact, a clear forward direction, navigation clearance, interaction radius, and separation from walls, crowds, furniture, water boundaries, and traversal hazards.';
  if (category === 'signage') return 'Mount the asset to a named wall, post, facade, kiosk base, roadside foundation, ceiling support, or portable stand at a deliberate viewing height and angle. The rear support, power, and service side may not float or disappear into the mounting surface.';
  if (category === 'vegetation') return 'Anchor the asset through soil, rock, planter, seabed, wall, roof, coral substrate, or cultivated bed appropriate to the species. Root or attachment structure, growth direction, wind exposure, navigation clearance, and density must fit the environment.';
  if (category === 'food') return 'Place the item in a hand, tray, counter, shelf, plate, cup holder, kitchen station, market display, package, or serving socket appropriate to its portion and container. Contact points, stacking, pickup orientation, and liquid or loose-piece behavior must remain believable.';
  return 'Place the asset on a named ground, wall, ceiling, counter, shelf, dock, vehicle, room, terrain, or gameplay socket appropriate to its use. Every foot, bracket, root, anchor, base, or contact edge must sit flush and surrounding clearance must support interaction and navigation.';
}

function collisionFor(category) {
  if (category === 'architecture') return 'Use modular floor, wall, roof, stair, rail, counter, doorway, and structural collision. Walkable areas and entrances must match the visible model, while inaccessible facade detail, trim, roof equipment, cables, and fasteners use simplified blocking or no collision.';
  if (category === 'road_surface') return 'Use continuous simplified traversal collision matching grades, gaps, curbs, rails, docking edges, fall boundaries, and platform surfaces. Decorative cracks, bolts, grates, trim, and surface noise must not create snagging micro-collision.';
  if (category === 'vehicle') return 'Use a stable chassis or hull collider with optional cabin, cargo, propulsion, or hit-region hulls. Do not trace every light, mirror, vent, wheel, pod, rail, or fastener. Entry sockets and clearance volumes must align to the visible body.';
  if (category === 'character') return 'Use a root capsule or species-appropriate locomotion hull with optional hit regions. Render topology may not be used directly as navigation collision, and appendage collision should exist only where gameplay requires it.';
  if (category === 'vegetation') return 'Use trunk, major branch, root, planter, coral-anchor, or harvest collision only where gameplay requires blocking, climbing, damage, or collection. Leaves, petals, grass blades, and small fronds remain nonblocking.';
  if (category === 'food') return 'Use a simple collider matching the plate, package, bottle, cup, tray, or carried portion. Small toppings, crumbs, utensils, wrappers, and liquid surfaces do not receive independent collision unless interaction requires them.';
  return 'Use one or more primitive or low-complexity hulls matching the major blocking volume and interaction surface. Decorative handles, cables, slats, fasteners, trim, foliage, and surface detail must not create snagging collision.';
}

function orientationFor(category) {
  if (category === 'vehicle') return 'Use positive Z as forward and positive Y as up after export conversion. Place the origin at the ground, waterline, rail, or hover-plane center below the chassis or hull, with separate transforms for animated propulsion and steering hardware.';
  if (category === 'architecture') return 'Use positive Z as the principal entrance, public face, or module-forward direction and positive Y as up after export conversion. Place the origin at ground level or the documented module connection plane near the footprint center.';
  if (category === 'road_surface') return 'Use positive Z as the travel or module-continuation direction and positive Y as up after export conversion. Place the origin at the documented grid center, connection edge, spline point, or docking plane.';
  if (category === 'character') return 'Use positive Z as forward and positive Y as up after export conversion. Place the origin at the ground projection of the root or locomotion control according to the character pipeline.';
  if (category === 'signage') return 'Use positive Z as the primary viewing face and positive Y as up after export conversion. Place the origin at the ground support, wall-mount center, hanging point, or portable base.';
  return 'Use positive Z as the front or primary use direction and positive Y as up after export conversion. Place the origin at the ground contact, wall mount, suspension point, waterline, or logical placement center.';
}

function animationHooks(asset, category) {
  const text = `${asset.fileName} ${(asset.requiredComponents || []).join(' ')}`.toLowerCase();
  const hooks = [];
  if (/door|gate|lid|hatch|cabinet|locker|drawer|hood|trunk|shutter/.test(text)) hooks.push('hinged, sliding, folding, or removable access state');
  if (/screen|monitor|display|sign|billboard|kiosk|terminal|menu|scoreboard/.test(text)) hooks.push('changeable display, content, or emissive state');
  if (/light|lamp|signal|headlight|taillight|emissive|neon|beacon/.test(text)) hooks.push('day, night, powered, warning, and damaged light states');
  if (/wheel|hover|fan|propeller|rotor|conveyor|crane|pump|machine|vehicle|train|boat|tram/.test(text)) hooks.push('moving propulsion, steering, mechanism, or operating component');
  if (/seat|chair|bench|bed|booth|vehicle|character|saddle/.test(text)) hooks.push('seating, occupancy, or interaction sockets');
  if (/food|drink|bottle|cup|container|crate|box|package|tray/.test(text)) hooks.push('pickup, open, consume, empty, stack, carry, or discard state');
  if (category === 'character') hooks.push('root, locomotion, interaction, expression, hit-reaction, and attachment animation sets');
  if (category === 'vegetation') hooks.push('wind, harvest, damage, growth, season, or current-response groups');
  if (!hooks.length) hooks.push('transform, material-state, damage, pickup, or placement hook only where gameplay requires it');
  return [...new Set(hooks)];
}

function conditionFor(asset, category) {
  if (asset.town === 'techtown') return 'Primary surfaces should look precision-made and maintained, with restrained use at handles, service fasteners, floor interfaces, vents, charging contacts, propulsion hardware, and frequently touched controls. Emissive accents originate from real fixtures and remain controlled.';
  if (asset.town === 'fishing-harbor') return 'Use salt exposure, sun fading, wet-darkened surfaces, rope polish, chipped marine paint, galvanized hardware, water staining near tide or wash zones, and practical repairs without turning every asset into a wreck.';
  if (asset.town === 'rich-hills') return 'Keep premium public surfaces clean and maintained. Wear remains subtle at tires, drainage paths, handles, outdoor contact points, service access, staff-only areas, and concealed back-of-house zones.';
  if (asset.town === 'dungeon-outskirts') return 'Use soot, mineral deposits, damp staining, tool wear, patched timber, rubbed leather, hammer marks, repaired iron, and age only where the asset’s construction and use justify them.';
  if (asset.town === 'aqualume') return 'Show pressure-rated seals, mineral haze, current-polished edges, controlled marine growth, condensation or water response, and service wear at hatches, anchors, joints, and transit interfaces.';
  if (category === 'food') return 'Use preparation-specific variation such as browning, moisture, crumbs, condensation, sauce pooling, cut surfaces, wrapper creases, garnish, and temperature cues without making the item spoiled unless explicitly required.';
  return 'Apply restrained lived-in wear at contact points, lower edges, hinges, handles, feet, fasteners, drainage paths, service openings, tires, exposed corners, or frequently cleaned surfaces. Match the district’s maintenance level rather than using uniform dirt or uniform perfection.';
}

function lodPlan(asset, doctrine) {
  const maximum = Number(asset.quality?.maximumTriangles || 30000);
  const close = Math.max(500, Math.round(maximum * 0.78));
  const medium = Math.max(250, Math.round(maximum * 0.36));
  const far = Math.max(80, Math.round(maximum * 0.12));
  return {
    lod0: `Close-range output may use up to the reviewed maximum, with a practical target near ${close.toLocaleString()} triangles when silhouette and required components justify it.`,
    lod1: `Medium-range output should target roughly ${medium.toLocaleString()} triangles while preserving primary form, support, interaction components, openings, material blocks, and essential lights.`,
    lod2: `Far output should target roughly ${far.toLocaleString()} triangles or a suitable impostor while retaining the recognizable outline, mounting or ground relationship, and major color or emissive signature.`,
    neverCollapse: doctrine.silhouette,
  };
}

function materialText(asset) {
  const plan = asset.productionBrief?.materialPlan || {};
  const names = plan.namedMaterials || asset.materials || [];
  return {
    names,
    rules: [plan.metalRule, plan.glassRule, plan.masonryRule, plan.woodRule, plan.flexibleRule, plan.emissiveRule].filter(Boolean).join(' '),
  };
}

function rejectionCriteria(asset, category) {
  return [...new Set([
    ...(policy.prohibitedShortcuts || []),
    ...(asset.forbiddenShortcuts || []),
    ...(CATEGORY_REJECTIONS[category] || CATEGORY_REJECTIONS.generic_prop),
  ])];
}

function qaChecklist(asset, category, context, doctrine) {
  const required = (asset.requiredComponents || []).map((component) => `Required component is visibly modeled and identifiable: ${component}.`);
  return [
    `${asset.displayName} is recognizable from front, side, rear, and three-quarter views without relying only on text, decals, color, or glow.`,
    `The semantic category is correctly resolved as ${category}; role words, district names, and substrings do not override the physical object type.`,
    `The result follows the ${asset.town} art direction and does not borrow an unrelated town palette, technology level, weathering language, or decorative motif.`,
    `The overall envelope remains near ${asset.dimensionsMeters.width} m wide, ${asset.dimensionsMeters.depth} m deep, and ${asset.dimensionsMeters.height} m high unless a reviewed override documents protruding hardware.`,
    'The asset has a coherent load path, support, mechanical system, anatomy, growth hierarchy, serving structure, or assembly logic appropriate to its category.',
    'Openings, access, supports, handles, controls, propulsion, joints, roots, containers, mounting, and contact points contain enough geometry to explain function.',
    'Material boundaries follow actual construction and do not act as arbitrary color blocking.',
    'Transparent, flexible, organic, masonry, food, metal, wood, liquid, and emissive materials use believable thickness and response.',
    'Placement, pivot, forward direction, scale, naming, hierarchy, and source metadata are export-ready.',
    'Collision follows major blocking and interaction volumes without tracing decorative microdetail.',
    'LOD plans preserve silhouette, support, interaction points, occupancy, openings, and the town-specific visual signature.',
    'Four-angle previews contain no disconnected parts, accidental intersections, floating supports, inverted faces, open backs, hidden required components, or missing contact shadows.',
    `The asset visibly supports the blueprint context “${context.previousHeading || asset.sourceSection}” rather than acting as context-free filler.`,
    doctrine.silhouette,
    ...required,
  ];
}

function buildDescription(asset, category, doctrine, context, placement, collision, orientation, condition, materials, lod, hooks) {
  const required = (asset.requiredComponents || []).join(', ');
  const materialNames = materials.names.join(', ');
  const townProfile = asset.productionBrief?.townArtDirection || policy.townProfiles?.[asset.town] || policy.townProfiles?.['shared-world'];
  return [
    `${asset.displayName} is the production specification for ${asset.fileName} in ${asset.town}. It originates from ${asset.sourceDoc} under “${context.previousHeading || asset.sourceSection}.” ${sentence(asset.description)} Its blueprint evidence is: ${context.excerpt}`,
    `Object identity: model this as ${doctrine.identity}. The resolved semantic category is ${category}. That category is based on the asset family, filename prefix, and whole object tokens, not incidental substrings or role words. The object must remain identifiable in neutral clay material, because text, color, logos, and emissive effects confirm identity but may not create it.`,
    `Silhouette and proportion: ${doctrine.silhouette} Keep the target envelope near ${asset.dimensionsMeters.width} meters wide, ${asset.dimensionsMeters.depth} meters deep, and ${asset.dimensionsMeters.height} meters high. Only reviewed protrusions such as signs, arms, doors, mirrors, roots, branches, railings, hoses, lights, vehicle propulsion, or service hardware may extend beyond that envelope. Every visible mass must support the named object rather than add unrelated decoration.`,
    `Construction and functional anatomy: ${doctrine.construction} Required visible components are ${required}. Each required component must connect through credible frames, joints, seams, foundations, roots, brackets, fasteners, cables, pipes, glazing frames, hinges, biological attachment, serving structure, or material transitions. Flat paint, decals, and glow cannot replace a component that explains operation, weight support, access, occupancy, growth, containment, drainage, power, food preparation, or maintenance.`,
    `Materials, color, and lighting: use the named material vocabulary ${materialNames}. ${sentence(townProfile.style)} ${materials.rules} Avoid the town-specific failures: ${(townProfile.avoid || []).join(', ')}. Surface variation should follow manufacturing, age, handling, weather, moisture, heat, pressure, preparation, or maintenance rather than random noise. Emissive areas must originate from a lens, screen, fixture, projector, biological organ, or energy component.`,
    `Condition and environmental integration: ${condition} ${placement} Add contact, foundations, feet, brackets, roots, piles, seals, trim, drainage, terrain blending, waterline response, or wall transitions where the object meets its environment. It may not appear pasted onto a surface or suspended by invisible support unless the design explicitly includes a justified force or suspension system.`,
    `Interaction and state design: ${doctrine.interaction} Expected hooks include ${hooks.join(', ')}. Separate and name parts that can open, slide, rotate, illuminate, display content, receive an item, carry an occupant, change material, emit particles, take damage, be repaired, be harvested, or connect to another system. Do not fragment static detail into needless objects, but do not merge away useful state boundaries.`,
    `Collision, orientation, and export: ${collision} ${orientation} Use one named asset root, semantically named render meshes, separate animated or stateful parts, simplified collision, and metadata for asset ID, town, family, source document, license, dimensions, semantic category, and specification version. Remove preview cameras, lights, helper meshes, unused materials, duplicates, hidden placeholders, and accidental geometry before GLB export.`,
    `Performance and LOD: ${doctrine.optimization} ${lod.lod0} ${lod.lod1} ${lod.lod2} The reduction process may never destroy this requirement: ${lod.neverCollapse}`,
    `Acceptance standard: the final model must look intentional from every inspection angle, satisfy all required components, fit the reviewed scale, use meaningful material separation, remain inside geometry budgets, sit correctly on its placement plane, and export as a verified nonempty GLB. A technically valid file that looks generic, toy-like, structurally impossible, context-free, semantically misclassified, or unlike ${asset.displayName} is a failure. It must be corrected, retried, or quarantined rather than published.`,
  ].join('\n\n');
}

function buildPrompt(asset, category, doctrine, context, placement, condition, materials, hooks) {
  return [
    `Create ${asset.displayName}, asset ID ${asset.id}, for ${asset.town}.`,
    `Resolved physical category: ${category}. Build it as ${doctrine.identity}.`,
    sentence(asset.description),
    `Blueprint evidence: ${context.excerpt}`,
    `Target dimensions: approximately ${asset.dimensionsMeters.width} m wide, ${asset.dimensionsMeters.depth} m deep, and ${asset.dimensionsMeters.height} m high.`,
    doctrine.silhouette,
    doctrine.construction,
    `Required components: ${(asset.requiredComponents || []).join(', ')}.`,
    `Materials: ${materials.names.join(', ')}. ${materials.rules}`,
    condition,
    placement,
    doctrine.interaction,
    `State hooks: ${hooks.join(', ')}.`,
    doctrine.optimization,
    'Deliver one clean production GLB with correct scale, semantic part names, an appropriate pivot, simplified collision guidance, no floating pieces, no hidden placeholder geometry, and no decorative element substituting for missing physical function.',
  ].join(' ');
}

function briefHash(asset) {
  return createHash('sha256').update(JSON.stringify({
    id: asset.id,
    semanticCategory: asset.semanticCategory,
    deepDescription: asset.deepDescription,
    generationPrompt: asset.generationPrompt,
    productionBrief: asset.productionBrief,
  })).digest('hex');
}

let corrections = 0;
for (const asset of deep.assets) {
  const previousCategory = asset.semanticCategory;
  const category = classifyDeepAsset(asset);
  const doctrine = CATEGORY_DOCTRINES[category];
  const context = correctedSourceContext(asset);
  const placement = placementFor(asset, category);
  const collision = collisionFor(category);
  const orientation = orientationFor(category);
  const condition = conditionFor(asset, category);
  const materials = materialText(asset);
  const hooks = animationHooks(asset, category);
  const lod = lodPlan(asset, doctrine);
  const rejections = rejectionCriteria(asset, category);
  const checks = qaChecklist(asset, category, context, doctrine);

  asset.semanticCategory = category;
  asset.sourceContext = context;
  asset.deepDescription = buildDescription(asset, category, doctrine, context, placement, collision, orientation, condition, materials, lod, hooks);
  asset.generationPrompt = buildPrompt(asset, category, doctrine, context, placement, condition, materials, hooks);
  asset.negativePrompt = rejections.join('; ');
  asset.productionBrief = {
    ...asset.productionBrief,
    identity: doctrine.identity,
    blueprintEvidence: context,
    gameplayAndWorldRole: `${asset.displayName} supports ${asset.sourceSection} in ${asset.town} and must visibly serve that blueprint role.`,
    placement,
    silhouetteAndProportion: doctrine.silhouette,
    targetDimensionsMeters: asset.dimensionsMeters,
    structuralConstruction: doctrine.construction,
    requiredComponents: asset.requiredComponents,
    conditionAndWear: condition,
    interactionAndAnimation: {
      guidance: doctrine.interaction,
      hooks,
    },
    collision,
    orientationAndPivot: orientation,
    optimization: doctrine.optimization,
    lod,
    qaChecklist: checks,
    rejectionCriteria: rejections,
  };
  asset.semanticRefinedAt = new Date().toISOString();
  asset.briefHash = briefHash(asset);
  if (previousCategory !== category) corrections += 1;
}

const categoryCounts = {};
for (const asset of deep.assets) categoryCounts[asset.semanticCategory] = (categoryCounts[asset.semanticCategory] || 0) + 1;
coverage.categoryCounts = categoryCounts;
coverage.assetsWithBlueprintContext = deep.assets.filter((asset) => asset.sourceContext?.excerpt?.length >= 40).length;
coverage.assetsWithQaChecklists = deep.assets.filter((asset) => asset.productionBrief?.qaChecklist?.length >= 12).length;
coverage.assetsWithRejectionCriteria = deep.assets.filter((asset) => asset.productionBrief?.rejectionCriteria?.length >= 8).length;
coverage.uniqueBriefHashes = new Set(deep.assets.map((asset) => asset.briefHash)).size;
coverage.semanticCategoryCorrections = corrections;
coverage.semanticRefinedAt = new Date().toISOString();
deep.counts.categories = categoryCounts;
deep.semanticCategoryCorrections = corrections;
deep.semanticRefinedAt = coverage.semanticRefinedAt;

writeFileSync(DEEP_PATH, `${JSON.stringify(deep, null, 2)}\n`);
writeFileSync(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`);

console.log(`[deep-specs] rebuilt semantic doctrines for ${deep.assets.length} assets`);
console.log(`[deep-specs] corrected ${corrections} prior category assignments`);
console.log(`[deep-specs] categories: ${Object.entries(categoryCounts).map(([name, count]) => `${name}=${count}`).join(', ')}`);
