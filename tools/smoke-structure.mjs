import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const requiredFiles = [
  'index.html',
  'src/main.js',
  'src/avatar.js',
  'src/avatarSkin.js',
  'src/modularPlayer.js',
  'src/modularAttachments.js',
  'src/characterStudio.js',
  'src/characterStudioTheme.js',
  'src/config/playerAvatarCatalog.js',
  'src/config/characterRoles.js',
  'src/npc.js',
  'src/interiors.js',
  'src/furnish.js',
  'src/interaction.js',
  'src/config/blockSupplyLayout.js',
  'src/config/weaponCatalog.js',
  'src/config/mapConfig.js',
];
for (const rel of requiredFiles) await access(path.join(ROOT, rel));
const sources = Object.fromEntries(await Promise.all(
  requiredFiles.map(async (rel) => [rel, await readFile(path.join(ROOT, rel), 'utf8')]),
));
const chickenFurniture = sources['src/furnish.js'].match(/chicken:\s*\[([\s\S]*?)\n\s*\],\n\};/)?.[1] || '';
const blockLayout = sources['src/config/blockSupplyLayout.js'];
const skinTextureAwait = sources['src/modularPlayer.js'].indexOf('await Promise.all(jobs)');
const skinTint = sources['src/modularPlayer.js'].indexOf("const skin = instance.materials.get('ZW_Skin')");
const attachments = sources['src/modularAttachments.js'];
const studio = sources['src/characterStudio.js'];
const avatarSkin = sources['src/avatarSkin.js'];
const rolePolicy = sources['src/config/characterRoles.js'];
const checks = [
  ['entry module', sources['index.html'].includes('src/main.js')],
  ['player builder', /buildAvatar\s*\(/.test(sources['src/main.js'])],
  ['modular player adapter', /createModularPlayerVisual/.test(avatarSkin)],
  ['character studio', /mountCharacterStudio/.test(studio)],
  ['pack-agnostic catalog', /PLAYER_AVATAR_CATALOG/.test(sources['src/config/playerAvatarCatalog.js'])],
  ['procedural player fallback', /procedural fallback/.test(avatarSkin)],
  ['single player visual owner', /hideProceduralMeshes\(avatar\.group, modular\.group\)/.test(avatarSkin)],
  ['skin tint happens after texture jobs', skinTextureAwait >= 0 && skinTint > skinTextureAwait],
  ['world-scale modular wrapper', /const group = new THREE\.Group\(\)/.test(sources['src/modularPlayer.js']) && /model\.scale\.setScalar/.test(sources['src/modularPlayer.js'])],
  ['modular attachment bridge', /updateModularAttachments/.test(sources['src/modularPlayer.js'])],
  ['chain uses measured front chest', /metrics\.chest\.max\.z \+ 0\.018/.test(attachments) && /ZW_ModularJewelryMount/.test(attachments)],
  ['pendant is connected by bail', /ZW_PendantBail_/.test(attachments) && /-dropMax - 0\.038/.test(attachments)],
  ['legacy asset hair bridge', /HAIR_GLTF/.test(attachments) && /ZW_ExternalHairMount/.test(attachments)],
  ['legacy hair uses original forward', /mount\.rotation\.set\(cfg\.rotX \?\? 0, cfg\.rotY \?\? 0/.test(attachments)],
  ['legacy hair seats on measured crown', /metrics\.head\.max\.y - hairHeight \* modularFit\.crownSeat/.test(attachments)],
  ['legacy hair fits measured head bounds', /metrics\.headSize\.x \* modularFit\.widthMul/.test(attachments) && /Math\.min\(widthFit, heightFit\)/.test(attachments)],
  ['direct imported civilian policy', /mode:\s*['"]glb-functional-direct['"]/.test(rolePolicy) && /maxLiveSkins:\s*24/.test(rolePolicy)],
  ['directional arm solver', /makeDirectionalArmDriver/.test(avatarSkin) && /setFromUnitVectors/.test(avatarSkin)],
  ['player relaxed arms', /zwRelaxedArmPose/.test(avatarSkin) && /new THREE\.Vector3\(-0\.08, -1, 0\.07\)/.test(avatarSkin)],
  ['NPC relaxed arms', /relaxedArms/.test(avatarSkin) && /new THREE\.Vector3\(-0\.10, -1, 0\.05\)/.test(avatarSkin)],
  ['direct NPC bone drivers', /remapImportedRig/.test(avatarSkin) && /zwDirectRig/.test(avatarSkin)],
  ['bubble meshes retire after NPC swap', /retireProceduralMeshes/.test(avatarSkin)],
  ['civilian mixers disabled', /playEmbeddedClip:\s*false/.test(rolePolicy)],
  ['legacy creator canvas hidden', /canvas:not\(\.zw-studio-canvas\)/.test(sources['src/characterStudioTheme.js'])],
  ['legacy creator GPU draw gated', /zaylins\.characterStudioRenderGate/.test(studio) && /isLegacyCreator/.test(studio)],
  ['studio preview throttled', /timestamp - this\.lastRenderMs < 32/.test(studio)],
  ['studio uses true drawing-buffer dimensions', /canvas\.width !== expectedWidth/.test(studio) && /setSize\(width, height, false\)/.test(studio)],
  ['studio face close-up', /fov:\s*27/.test(studio) && /z:\s*1\.92/.test(studio)],
  ['city NPC creation', /createCityNPCs\s*\(/.test(sources['src/main.js'])],
  ['interior construction', /buildInteriors\s*\(/.test(sources['src/main.js'])],
  ['interior furnishing', /furnishInteriors\s*\(/.test(sources['src/main.js'])],
  ['interaction manager', /new\s+InteractionManager\s*\(/.test(sources['src/main.js'])],
  ['school classroom pack', /school:\s*\{[^}]*pack:\s*['"]classroom['"]/s.test(sources['src/furnish.js'])],
  ['Chicken Spot has no stove/griddle assets', !/(?:stove-griddle|burner-stove|stove-burner)/.test(chickenFurniture)],
  ['Chicken Spot preserves fryer fallback', /procedural fryer bank/.test(sources['src/furnish.js'])],
  ['Block Supply zones', /SHOP_ZONES/.test(blockLayout)],
  ['Block Supply uses multiple walls', /wall:\s*['"]left['"]/.test(blockLayout) && /wall:\s*['"]right['"]/.test(blockLayout) && /wall:\s*['"]back['"]/.test(blockLayout)],
  ['weapon catalog', /export\s+(?:const|function).*WEAPON|allWeapons|weaponsForTab/.test(sources['src/config/weaponCatalog.js'])],
  ['player spawn config', /SPAWN/.test(sources['src/config/mapConfig.js'])],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error('[smoke] failed checks:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}
console.log(`[smoke] ${checks.length} Starter Town structure checks passed.`);
