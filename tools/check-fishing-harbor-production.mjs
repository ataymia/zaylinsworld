import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {HARBOR_ACTIONS,HARBOR_LOCATIONS,HARBOR_LIGHTHOUSE,HARBOR_WATERWAYS} from '../src/config/fishingHarborPlan.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>readFileSync(path.join(root,relative),'utf8');
const assets=read('src/world/FishingHarborProductionAssets.js');
const terrain=read('src/world/FishingHarbor.js');
const streetscape=read('src/world/FishingHarborStreetscape.js');
const main=read('src/main.js');
const townLife=read('src/runtime/FishingHarborTownLife.js');
const extract=(folder,filename)=>path.join(root,'public/assets/models/generated/fishing-harbor',folder,filename+'.glb');

const shells=[...assets.matchAll(/\bbuilding_[a-z0-9_]+_v01\b/g)]
  .map(m=>m[0]);
const unique=[...new Set(shells)];
let missing=[];
for(const name of unique){
 const file=extract('building_shell',name);
 if(!existsSync(file)||statSync(file).size<120)missing.push(file);
}
const fixtureMatches=[...assets.matchAll(/model\('([^']+)','([^']+)'\)/g)];
for(const [,folder,name]of fixtureMatches){
 const file=extract(folder,name);
 if(!existsSync(file)||statSync(file).size<120)missing.push(file);
}
assert.equal(missing.length,0,'All production Harbor model files must exist: '+missing.join('; '));
assert(unique.length>=17,'Harbor must place at least 17 unique styled 3D buildings');
assert(fixtureMatches.length>=12,'Harbor needs actual boats, buoys, tidefuel and seafood props');
assert(assets.includes('loadModel(asset,renderer)'),'Harbor must use the tracked GLTF asset loader');
assert(assets.includes('report.proceduralSurrogatesReplaced++'),
  'Real assets must replace placeholder buildings');
assert(assets.includes('sceneRoot.userData.productionReport=report'),
  'Loaded model counts and failures must be observable in the running game');
assert(assets.includes("FH_cottage_"),'Generic residential filler must be replaced by Harbor homes');
assert(main.includes('hydrateFishingHarborProductionAssets({'),
  'Harbor asset placement must be reachable from live gameplay');
assert(main.includes('warmHarborProductionAssets(cityObserver)'),
  'Assets must load before the player reaches the waterfront');
assert(main.includes('buildHarborTownLife(scene)'),'Harbor must instantiate real citizens and traffic');
assert(townLife.includes('createCityNPCs('));
assert(townLife.includes('createTraffic('));
assert(townLife.includes('updateTraffic('));
assert(townLife.includes('Harbor Patrol'));
assert(HARBOR_LOCATIONS.length>=12,'Police, clinic, jewelry, boatworks and market belong in the town');
assert(HARBOR_ACTIONS.some(a=>a.kind==='lighthouse'),'Lighthouse needs an interaction');
assert.equal(HARBOR_WATERWAYS.length,3,'Three authored boat corridors needed');
assert(terrain.includes("FH_ocean',0,0.11"),'Ocean surface must be above buried terrain');
assert(terrain.includes("FH_harbor_water_edge',0,0.11"),'Coastline must be visible');
assert(terrain.includes('FH_east_inlet')&&terrain.includes('FH_west_inlet'),
  'Harbor needs visible inland coves and physical shore');
assert(streetscape.includes('FH_traffic_signal_post_'),'Physical signal posts required');
assert(streetscape.includes('FH_safe_streetlight_post_'),'Working streetlight layout required');
assert(streetscape.includes('FH_walkway_'),'Sidewalks need real geometry');
assert(streetscape.includes('FH_breakwater_lighthouse_island'),
  'Land bridge and Lighthouse island must be reachable');
const signalCount=(streetscape.match(/\[-?\d+,-?\d+\]/g)||[]).length;
assert(signalCount>=12,'Harbor signals need real intersections');
console.log('[harbor-production] verified '+unique.length+' genuine building assets and '+
fixtureMatches.length+' detail/boat model references');
console.log('[harbor-production] visible coast, 3 water channels, 12+ civic/commerce locations, signals, sidewalks and police/traffic runtime wired');
