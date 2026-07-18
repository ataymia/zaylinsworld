import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { TOWNS, KINDS, OTHER, VARIANTS, STEMS } from './gameplay-gap-recipes.mjs';
import { makeAsset } from './gameplay-gap-factory.mjs';

const ROOT = process.cwd();
const OUT = join(ROOT, 'asset-factory', 'gameplay-gaps');
const DOC = join(ROOT, 'docs', 'FINAL_GAMEPLAY_GAPS.md');
const assets=[];
const otherRemaining={...OTHER};
for (const [town,cfg] of Object.entries(TOWNS)) {
  let local=0;
  KINDS.forEach((kind,k)=>{
    const quota=cfg.major[k];
    for(let i=0;i<quota;i++){
      const system=cfg.systems[i%cfg.systems.length];
      const stem=STEMS[kind][i%STEMS[kind].length];
      const variant=VARIANTS[Math.floor(i/STEMS[kind].length)%VARIANTS.length];
      assets.push(makeAsset(town,kind,local++,system,stem,variant));
    }
  });
  const remaining=cfg.total-local;
  for(let i=0;i<remaining;i++){
    const kind=Object.keys(otherRemaining).find((key)=>otherRemaining[key]>0);
    if(!kind) throw new Error('Other-kind quota exhausted early.');
    otherRemaining[kind]-=1;
    const system=cfg.systems[i%cfg.systems.length];
    const stem=STEMS[kind][i%STEMS[kind].length];
    const variant=VARIANTS[Math.floor(i/STEMS[kind].length)%VARIANTS.length];
    assets.push(makeAsset(town,kind,local++,system,stem,variant));
  }
}
if(Object.values(otherRemaining).some(Boolean)) throw new Error(`Unfilled other quotas: ${JSON.stringify(otherRemaining)}`);
const ids=new Set(assets.map((a)=>a.id));
const files=new Set(assets.map((a)=>a.fileName));
if(assets.length!==1320||ids.size!==1320||files.size!==1320) throw new Error(`Catalog integrity failure total=${assets.length}, ids=${ids.size}, files=${files.size}`);
mkdirSync(OUT,{recursive:true});
for(const town of Object.keys(TOWNS)){
  const townAssets=assets.filter((a)=>a.town===town);
  writeFileSync(join(OUT,`${town}.json`),`${JSON.stringify({format:'zta-gameplay-gap-catalog',version:3,town,recordCount:townAssets.length,generatedAt:new Date().toISOString(),assets:townAssets},null,2)}\n`);
}
const counts=(key)=>Object.fromEntries([...new Set(assets.map((a)=>a[key]))].sort().map((value)=>[value,assets.filter((a)=>a[key]===value).length]));
const summary={format:'zta-gameplay-gap-expansion-summary',version:3,generatedAt:new Date().toISOString(),baselineAuditedRecords:978,baselineCanonicalGenerationRequests:962,baselineReferenceOnlyRecords:16,replacementForCorruptStagedGapCount:891,finalSweepAdditionalCount:429,newCanonicalRequestCount:1320,expectedAuditedRecordCount:2298,expectedCanonicalGenerationRequestCount:2282,expectedReferenceOnlyRecordCount:16,townCounts:counts('town'),assetKindCounts:counts('assetKind'),minimumDescriptionCharacters:Math.min(...assets.map((a)=>a.description.length)),minimumRequiredComponents:Math.min(...assets.map((a)=>a.requiredComponents.length))};
writeFileSync(join(OUT,'summary.json'),`${JSON.stringify(summary,null,2)}\n`);
mkdirSync(dirname(DOC),{recursive:true});
writeFileSync(DOC,`# Zaylins Final Gameplay and Asset Gap Sweep\n\n- Baseline audited records: **978**\n- New canonical requests: **1,320**\n- Expected audited total: **2,298**\n- Expected canonical generation requests: **2,282**\n- Reference-only records: **16**\n\nRuntime effects and decals are procedurally generated and validated. Specialized GLBs remain quarantined until dedicated builders meet their contracts. Injury feedback defaults to non-graphic alternatives. Afros, locs, braids, twists, curls, fades, parts, edges, and scalp fit use dedicated groom and retopology rules rather than primitive shapes.\n`);
console.log(`[gameplay-gap-builder] wrote ${assets.length} records; expected total=2298, canonical=2282, reference-only=16.`);
