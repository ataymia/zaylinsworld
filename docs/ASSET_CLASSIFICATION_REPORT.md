# Asset Classification Report — Zaylin's World

_Generated for the Asset Integration Correction Pass (Phase 3.5)._

This report documents every asset group catalogued in
`public/assets/models/asset-index-v2.json`, the prefab/system it feeds, whether
it is kid-safe, and the fallback used if a GLB fails to load. The single rule
this pass enforces: **each prefab pulls ONLY from its approved asset pack** — no
more bedroom furniture leaking into the gym, no generic blocks where weapons
belong.

## Conversion pipeline (new this pass)

Several uploaded packs shipped **FBX-only**, which the in-game three.js
`GLTFLoader` cannot read — that is why those weapons could not be placed. They
are now converted to GLB via the system `assimp` CLI and registered:

- Tool: [tools/convert-fbx.mjs](../tools/convert-fbx.mjs) (`assimp export <fbx> <glb>`).
- assimp preserves per-material base colors (metal / wood), so converted weapons
  look correct even without separate texture maps.
- Output: `public/assets/models/weapons/maxwp/` (23 GLBs), registered under
  `weapons.maxwp` in the asset index.
- One source (`M3GG.fbx`, 4 KB, 0 meshes) was a broken export and was dropped.

## Index summary

| Category | Packs (count) |
|---|---|
| characters | psx (79), people (6), spooky (2), creatures (1) |
| buildings | gas-station (2), diner (4), mini-market (1), cabins (1), misc (1), shop (1) |
| interiors | furniture (53), restaurant (49), gym (72), classroom (189) |
| props | food (55), food-extra (1), trash (1), machines (1), trees (1), rocks (1), fishing (1) |
| weapons | styloo (40), **maxwp (23 — newly converted)** |
| animations | ual-1 (1), ual-2 (2) |

## Per-group classification

| Asset group | Category/Pack | Intended prefab use | Kid-safe | Scale norm | Fallback |
|---|---|---|---|---|---|
| PSX civilians (`character-01..16`, `-female-01..10`) | characters/psx | City NPC skins, player skin | Yes | height → 1.75–1.8 m, validated | procedural avatar |
| PSX police (`character-17..22-police`, `-female-police`) | characters/psx | Foot-cop officer skin (`applyCopSkin`) | Yes | height → 1.82 m, validated | procedural uniformed cop |
| Furniture (KayKit) | interiors/furniture | Home / Kicks / School / Office dressing | Yes | 1u≈1m | procedural room kept |
| Restaurant set | interiors/restaurant | **Chicken Spot ONLY** (counter, register, stove, booths) | Yes | 1u≈1m | procedural room kept |
| Gym equipment | interiors/gym | **Iron City Gym ONLY** (treadmill, benches, racks, dumbbells, mats) | Yes | 1u≈1m | procedural gym base kept |
| Classroom set | interiors/classroom | School prefab interior | Yes | 1u≈1m | procedural room kept |
| Food props | props/food | Chicken Spot counter food | Yes | scaled ×3–3.5 | none (decorative) |
| Styloo guns | weapons/styloo | Block Supply wall + held weapon (pistol/SMG/rifle/shotgun/sniper/rocket/board) | Yes (stylized, fictional) | longest axis → `fit` | procedural weapon mesh |
| **Max weapon pack (maxwp)** | weapons/maxwp | Block Supply wall + held weapon (revolvers, rifles, shotguns, SMGs, bazooka, gatling, crossbow, melee) | Yes (stylized, fictional) | longest axis → `fit` | procedural weapon mesh |
| Car kit / lowpoly cars | vehicles/* (on disk) | Traffic, drivable, dealership, **police cruisers** | Yes | length → 4.4 m | procedural car kept |

## Per-prefab approved packs (strict map)

Enforced in [src/furnish.js](../src/furnish.js) via `INTERIOR_PACK`:

| Interior | Approved pack | Notes |
|---|---|---|
| home | interiors/furniture | bed, couch, rug, lamp, cabinet, picture frame |
| kicks | interiors/furniture | armchair, rug, shelf, lamp |
| **gym** | **interiors/gym** | gym equipment only — no beds/nightstands |
| school | interiors/furniture | tables, chairs, shelf, books |
| office | interiors/furniture | desk, chair, cabinet, shelf, lamp |
| **chicken** | **interiors/restaurant** | counter, register, stove, booths, tables |

## Police corrections

- **Naming:** "Civic Safety HQ" → **"Police Station"** (building sign in
  [src/config/buildingPrefabs.js](../src/config/buildingPrefabs.js) + label in
  [src/config/mapConfig.js](../src/config/mapConfig.js) `POLICE_POST.name` +
  front-desk dialogue/prompt in [src/main.js](../src/main.js)).
- **Cruisers:** parked HQ cruisers now swap to the real `police` GLB in
  `applyVehicleModels` (preload guaranteed) — no longer white starter cars.
- **Officers:** `spawnFootCop` swaps to a real PSX police-officer GLB via
  `applyCopSkin`, with the procedural uniformed cop as fallback.
- **Spawn source:** `copSpawnPoint()` dispatches cops from the Police Station
  front (when 14–90 m away) or an offscreen ring (R≈30–38 m) — never on top of
  the player.

## Rejected / ambiguous

| Item | Reason |
|---|---|
| `M3GG.fbx` (SMG) | Broken source export — 0 meshes; dropped from registration |
| VNB Gym FBX set | Redundant — `interiors/gym` (72 GLB) already covers gym equipment |
| HCG Law Enforcement FBX | Redundant — PSX police characters already provide officers |
| PP SuperCar Audi FBX | Not needed yet — lowpoly/car-kit fleet already stocks dealership + traffic |

## Debug proof (live, in the F3 debug panel)

- `interiorsFurnished`, `furniturePlaced`, plus per-interior console line
  `[furnish] <id> ← <pack>: N placed`.
- `blockSupplyDisplays` (display count) + `blockSupplyGlb` (GLBs swapped in).
- `glbCruisers` (police GLB cruisers), `copSkin` (officer GLB used).
- Failed assets are listed via `debug.addFailedAsset`.
