import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const requiredFiles = [
  'index.html',
  'src/main.js',
  'src/avatar.js',
  'src/avatarSkin.js',
  'src/modularPlayer.js',
  'src/characterStudio.js',
  'src/config/playerAvatarCatalog.js',
  'src/npc.js',
  'src/interiors.js',
  'src/furnish.js',
  'src/interaction.js',
  'src/config/blockSupplyLayout.js',
  'src/config/weaponCatalog.js',
  'src/config/mapConfig.js',
];
for (const rel of requiredFiles) await access(path.join(ROOT, rel));
const sources = Object.fromEntries(await Promise.all(requiredFiles.map(async (rel) => [rel, await readFile(path.join(ROOT, rel), 'utf8')]));
const chickenFurniture = sources['src/furnish.js'].match(/chicken:\s*\[([\s\S]*?)\n\s*\],\n\};/)?.[1] || '';
const blockLayout = sources['src/config/blockSupplyLayout.js'];
const checks = [
  ['entry module', sources['index.html'].includes('src/main.js')],
  ['player builder', /buildAvatar\s*\(/.test(sources['src/main.js'])],
  ['modular player adapter', /createModularPlayerVisual/.test(sources['src/avatarSkin.js'])],
  ['character studio', /mountCharacterStudio/.test(sources['src/characterStudio.js'])],
  ['pack-agnostic catalog', /PLAYER_AVATAR_CATALOG/.test(sources['src/config/playerAvatarCatalog.js'])],
  ['procedural player fallback', /procedural fallback/.test(sources['src/avatarSkin.js'])],
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
