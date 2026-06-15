# Asset Usage Report

Audit of tracked game assets under `public/assets/` — what is used in gameplay,
what is only indexed, and what is safe to remove. Generated as part of the
Block Supply / weapons-platform pass.

> **Method:** cross-referenced every large asset against `src/**/*.js`,
> `public/assets/manifest.json`, `public/assets/models/asset-index-v2.json` and
> `public/assets/models/kits-index.json`. "Used in gameplay" = reached by a code
> path (a `loadSlotModel`/`loadAsset` call, manifest slot, or config reference).

## Summary
- Tracked `public/assets/` total: **~346 MB**.
- The largest single contributors are the **urban-kit PNG normal maps** (~45 MB),
  **classroom demo scenes** (~28 MB), the **building GLBs** (diner/market/
  gas-station/shop ≈ 33 MB) and the **two Universal Animation Library GLBs**
  (~15 MB).

## Used in gameplay (KEEP)
| Asset | Size | Reached by |
| --- | --- | --- |
| `buildings/gas-station/gas-station.glb` | 8.7M | `main.js` `tryGasStationGLB()` → `loadAsset('buildings','gas-station',…)` |
| `buildings/gas-station/gas-station-props.glb` | 3.9M | gas-station GLB companion props |
| `buildings/diner/diner.glb` (+`objects.glb`) | 10M+5.3M | manifest `buildings` slot (diner interior/landmark) |
| `buildings/mini-market/market.glb` | 8.4M | manifest `buildings` slot (market) |
| `buildings/urban-kit/*` (`.gltf`+`.bin`+PNG) | ~45M | `cityKit.js` via `district.json` (skyline/buildings) |
| `vehicles/car-kit/*` | — | `vehicleKit.js` (drivable/traffic/dealer fleet) |
| `characters/psx/*` | — | `avatarSkin.js`, `monsters.js` → `loadAsset('characters','psx',…)` |
| `characters/mini-kit/*` | ~12M | `HAIR_GLTF` hair attachments (`avatar.js`/`hairKit.js`) |
| `models/hair/*.glb` | <0.1M | procedural-style hair attachments |
| `weapons/styloo/*` (ak47, ak47variant, mac10, pew, awp, shotgun, board, rocketlaucher) | — | `weaponCatalog.js` → `weapons.js` / held-weapon loader |
| `interiors/furniture/*`, `props/food/*` | — | `furnish.js` (`loadAsset('interiors','furniture')` / `('props','food')`) |

## Indexed but NOT loaded by any code path (REVIEW — candidates to remove)
These exist in `asset-index-v2.json` but **no `loadAsset`/manifest/config call in
`src/` reaches them**. They are not deleted automatically because they are still
referenced by the asset index (deleting them also requires pruning their index
entries), and because uploads are actively being integrated. Recommend the owner
confirm before removal.

| Asset | Size | Notes |
| --- | --- | --- |
| `interiors/classroom/chemistrylabdemoscene.glb` | 12M | Demo scene; no code loads it |
| `interiors/classroom/computerdemoscene.glb` | 6.2M | Demo scene; no code loads it |
| `interiors/classroom/cafeteriademoscene.glb` | 5.7M | Demo scene; no code loads it |
| `interiors/classroom/principalofficedemoscene.glb` | 4.1M | Demo scene; no code loads it |
| `buildings/shop/shop.glb` | 5.1M | Indexed, not loaded |
| `props/urban-props.glb` | 4.0M | Indexed, not loaded |
| `animations/ual-1/ual1-standard.glb` | 7.8M | Animation library; not wired to any rig |
| `animations/ual-2/ual2-standard.glb` | 7.7M | Animation library; not wired to any rig |

Removing the eight files above would reclaim **~52 MB** from the working tree.
To remove safely: delete the file **and** its entries in
`public/assets/models/asset-index-v2.json`, then rebuild.

## Root-level source archives (already gitignored)
Root `*.zip` / `*.rar` (Styloo packs, DINER.rar, Gas_station.rar, CC0 PBR PNG
packs, the afro `.blend`, etc.) are **ignored** via `.gitignore` (`/*.zip`,
`/*.rar`, `.staging/`, `vendor/source-textures/`) and are not part of the tracked
repo. They are kept locally only as integration sources and can be deleted from
the working tree at any time without affecting the game.

## Notes
- No assets were deleted by this pass — every large tracked asset is either used
  in gameplay or referenced by the asset index, so deletion is deferred to an
  explicit, owner-confirmed cleanup step (per the project's asset-safety policy).
- The afro upload (`uploads_files_5282165_Afro+IV+3c+hair.zip`) contains only a
  Blender source file (`Afro IV 3c hair.blend`) with **no GLB/glTF/FBX/OBJ**. It
  cannot be wired into the game until exported to glTF/GLB (Blender is not
  available in this container). The existing in-game Afro remains the procedural
  style built in `avatar.js`.
