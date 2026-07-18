import { gunzipSync } from 'node:zlib';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const CATALOG_ROOT = join(ROOT, 'asset-factory', 'gameplay-gaps');
const DOC_PATH = join(ROOT, 'docs', 'FINAL_GAMEPLAY_GAPS.md');
const SEED_ROOT = join(ROOT, 'tools', 'asset-factory', 'gameplay-gap-seed');
const SEED_B64 = readdirSync(SEED_ROOT)
  .filter((name) => /^part-\d+\.txt$/.test(name))
  .sort()
  .map((name) => readFileSync(join(SEED_ROOT, name), 'utf8').trim())
  .join('');
const TOWN_STYLES = {"shared-world":"cohesive cross-town realism with clean long-distance readability, restrained stylization, physically motivated light and material response, and age-appropriate presentation","starter-town":"ordinary contemporary American neighborhood and civic design with warm, practical materials, family-friendly clarity, and subtle wear","techtown":"precision-engineered near-future technology with controlled cyan or cool-white emissions, serviceable hardware, layered composites, and no unexplained neon","fishing-harbor":"working waterfront design with salt exposure, galvanized hardware, wet surfaces, rope, timber, marine paint, and practical repairs","rich-hills":"premium maintained residential design with refined stone, glass, metal, landscaping, quiet luxury, and discreet service infrastructure","casino-strip":"polished entertainment-district spectacle with controlled signage, theatrical lighting, durable public finishes, security integration, and readable circulation","dungeon-outskirts":"grounded fantasy construction using stone, timber, forged metal, rope, leather, mineral deposits, soot, dampness, and functional mechanisms","obby-canyon":"bold traversal readability with engineered platforms, safety contrast, canyon dust, wind exposure, and clearly telegraphed hazards","starline-city":"busy modern downtown and media-production design with transit hardware, studio equipment, commercial clutter, reflective glass, and urban wear","aqualume":"pressure-rated underwater architecture with thick framed glass, marine seals, reef-safe anchors, controlled bioluminescence, currents, mineral haze, and serviceable life-support systems"};
const COMMON_FORBIDDEN = ["generic primitive fallback or disconnected shape pile","toy-block proportions or Roblox-like filler","unexplained glow, random neon, or effects that ignore the town palette","missing attachment, origin, service, collision, state, or lifecycle metadata","visual noise that obscures gameplay readability or accessibility cues","single undifferentiated material when distinct physical or optical layers are required","copying protected characters, logos, hairstyles, vehicles, or artwork from unlicensed references"];
const seed = JSON.parse(gunzipSync(Buffer.from(SEED_B64, 'base64')).toString('utf8'));

function sourcePath(town) {
  return `asset-factory/gameplay-gaps/${town}.json`;
}
function longDescription(item) {
  const style = TOWN_STYLES[item.t];
  const components = item.c.join(', ');
  const materials = item.m.join(', ');
  return `${item.n} is a ${item.dt} added by the final gameplay, sensory, environmental, interaction, and cohesion sweep for ${item.t}. It closes the “${item.g}” gap with a named production asset rather than leaving the system to an invisible placeholder, a reused generic puff, an unrelated prop, or an improvised object whose construction cannot survive close inspection. The asset must communicate its purpose immediately through silhouette, motion, timing, surface response, interaction state, environmental contact, or optical behavior while following this town direction: ${style}

The required production anatomy is: ${components}. These components are mandatory functional layers, not optional decoration. They must connect through believable supports, timing relationships, attachment points, service logic, strand or species anatomy, projection rules, emitter origins, collision-safe boundaries, or state transitions appropriate to the deliverable. Materials and optical layers must include ${materials}. Material separation must follow real construction, biological growth, surface contamination, weathering, light transport, particle behavior, hair-fiber behavior, or gameplay-state logic instead of arbitrary color blocking.

The implementation must define a stable named origin, deterministic forward or projection direction, scale envelope, spawn or placement conditions, looping or one-shot lifecycle, transition timing, cleanup and pooling behavior, network replication policy, quality tiers, editor-preview metadata, and validation thresholds. Where the asset reacts to a surface, body, vehicle, weapon, water volume, wind field, camera, light, audio event, quest state, or interaction socket, that dependency must be explicit and testable. Close-range presentation requires convincing breakup, thickness, depth, strand structure, hardware, service access, edge response, or layered motion appropriate to ${item.n}. Distant presentation must preserve the primary read without excessive triangles, overdraw, alpha sorting, particle count, shadow cost, or network traffic.

Accessibility is part of the production specification. The asset may not rely on color alone, and flashing, injury feedback, camera motion, visual noise, or hazard communication must provide intensity limits and reduced-flash, reduced-motion, reduced-particle, high-contrast, or alternate-icon behavior where applicable. Injury-related records default to non-graphic presentation. Optional stylized blood is abstract, contains no exposed anatomy or gore, and must have paint, spark, dust, or comic-impact alternatives for child-safe settings. Hair records require a scalp-conforming root field, purposeful hairline, believable density and gravity, style-specific structure, silhouette variation, ear and nape clearance, recolor support, and secondary-motion planning. Afros may not be made from bunched spheres; locs may not be identical cylinders; braids and twists require visible interwoven rhythm, parting, tension, taper, and intentional styling.

This record is not permission to produce crude geometry or a decorative approximation. Every visible or simulated layer must reinforce ${item.n}, integrate with adjacent Zaylins systems, and pass recognition, lifecycle, town-style, accessibility, performance, and state review before release. Unsupported specialized assets remain outside the generic Blender prop route until their dedicated pipeline can meet this contract.`;
}
function designIntent(item) {
  return `Close the documented ${item.g} gap with a production-ready ${item.n} specific to ${item.t}. Preserve the complete component, material, lifecycle, accessibility, performance, and state contract. The result must integrate with animation, audio, lighting, collision, networking, environment, customization, and gameplay systems without primitive substitutions or unexplained decorative complexity.`;
}
const commonFunctional = [
  'preserve a stable named origin and deterministic orientation',
  'expose intensity, scale, color-safe, state, and quality-tier parameters where applicable',
  'define spawn, loop, transition, cleanup, pooling, and network-replication behavior',
  'keep gameplay readability ahead of decorative complexity',
  'include editor preview metadata and validation thresholds',
];
const assets = seed.map((item) => ({
  id: item.i,
  fileName: item.f,
  displayName: item.n,
  town: item.t,
  sourceDoc: sourcePath(item.t),
  sourceSection: item.g,
  family: item.fam,
  builder: null,
  builderStatus: 'unsupported',
  priority: item.p,
  variant: item.v,
  assetKind: item.k,
  deliverableType: item.dt,
  productionPipeline: item.pp,
  gapCategory: item.g,
  description: longDescription(item),
  designIntent: designIntent(item),
  dimensionsMeters: item.d,
  requiredComponents: item.c,
  materials: item.m,
  quality: item.q,
  functionalNotes: [`production pipeline: ${item.pp}`, ...commonFunctional, ...item.x],
  forbiddenShortcuts: [...COMMON_FORBIDDEN, ...item.r],
  license: 'Original Zaylins production specification; generated implementation must use original or documented commercially compatible source work.',
  generatedBy: 'Zaylins final gameplay-gap and cohesion sweep',
  status: 'unsupported',
  tags: item.a,
  statePlan: item.s,
  generationEligible: true,
}));
assets.sort((left, right) => left.id.localeCompare(right.id));

const byTown = new Map();
for (const asset of assets) {
  if (!byTown.has(asset.town)) byTown.set(asset.town, []);
  byTown.get(asset.town).push(asset);
}
mkdirSync(CATALOG_ROOT, { recursive: true });
for (const [town, townAssets] of [...byTown.entries()].sort(([a],[b]) => a.localeCompare(b))) {
  const path = join(CATALOG_ROOT, `${town}.json`);
  writeFileSync(path, `${JSON.stringify({
    format: 'zta-gameplay-gap-catalog',
    version: 2,
    town,
    recordCount: townAssets.length,
    generatedAt: new Date().toISOString(),
    source: 'Final gameplay, sensory, environmental, VFX, state, connector, creature, service, and hairstyle sweep',
    assets: townAssets,
  }, null, 2)}\n`);
}
const townCounts = {};
const kindCounts = {};
const categoryCounts = {};
for (const asset of assets) {
  townCounts[asset.town] = (townCounts[asset.town] || 0) + 1;
  kindCounts[asset.assetKind] = (kindCounts[asset.assetKind] || 0) + 1;
  categoryCounts[asset.gapCategory] = (categoryCounts[asset.gapCategory] || 0) + 1;
}
const summary = {
  format: 'zta-gameplay-gap-expansion-summary',
  version: 2,
  generatedAt: new Date().toISOString(),
  baselineAuditedRecords: 978,
  baselineCanonicalGenerationRequests: 962,
  baselineReferenceOnlyRecords: 16,
  replacementForCorruptStagedGapCount: 891,
  finalSweepAdditionalCount: 429,
  newCanonicalRequestCount: assets.length,
  expectedAuditedRecordCount: 978 + assets.length,
  expectedCanonicalGenerationRequestCount: 962 + assets.length,
  expectedReferenceOnlyRecordCount: 16,
  townCounts,
  assetKindCounts: kindCounts,
  gapCategoryCounts: categoryCounts,
  minimumDescriptionCharacters: Math.min(...assets.map((asset) => asset.description.length)),
  minimumRequiredComponents: Math.min(...assets.map((asset) => asset.requiredComponents.length)),
};
writeFileSync(join(CATALOG_ROOT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
mkdirSync(dirname(DOC_PATH), { recursive: true });
const lines = [
  '# Zaylins Final Gameplay and Asset Gap Sweep','',
  '## Inventory result','',
  '- Original audited records: **978**',
  '- Original canonical generation requests: **962**',
  '- Original reference-only records: **16**',
  '- Rebuilt replacement for the corrupt staged expansion: **891**',
  '- Additional final sensory and cohesion sweep: **429**',
  `- New canonical requests added: **${assets.length}**`,
  `- Expected audited records after integration: **${978 + assets.length}**`,
  `- Expected canonical generation requests: **${962 + assets.length}**`,'',
  '## Town coverage','',
  ...Object.entries(townCounts).sort().map(([town,count]) => `- ${town}: **${count}**`),'',
  '## Deliverable coverage','',
  ...Object.entries(kindCounts).sort().map(([kind,count]) => `- ${kind}: **${count}**`),'',
  '## Production rules','',
  '- Runtime effects and decals are generated as validated procedural definitions and SVG assets.',
  '- Specialized GLB families remain outside the primitive prop generator until dedicated builders can satisfy their contracts.',
  '- Injury feedback defaults to non-graphic and provides child-safe alternatives.',
  '- Afros require continuous coil volume and silhouette breakup, not sphere clusters.',
  '- Locs require roots, taper, variation, grouping, gravity, and collision planning, not identical cylinders.',
  '- Braids and twists require interwoven structure, scalp parting, root tension, taper, and purposeful styling.',
  '- Every effect defines lifecycle, pooling, cleanup, accessibility, quality tiers, and network behavior.',
];
writeFileSync(DOC_PATH, `${lines.join('\n')}\n`);
console.log(`[gameplay-gap-builder] wrote ${assets.length} canonical records across ${byTown.size} town catalogs.`);
console.log(`[gameplay-gap-builder] expected total=${978 + assets.length}, canonical=${962 + assets.length}, reference-only=16.`);
