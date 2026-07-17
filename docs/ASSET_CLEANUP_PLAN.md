# Asset Cleanup Plan

## Audit baseline

The corrected repository inventory scans the runtime tree before any deletion:

- 588 indexed entries
- 1,074 runtime model/texture files
- 336.0 MB total runtime asset storage
- 0 missing indexed files
- 260 unindexed non-companion files requiring review
- 5 exact duplicate groups
- approximately 4.2 MB of exact-duplicate storage

Unindexed does not mean unused. Several unindexed files are directly referenced weapons, hair, jewelry, vehicles, NPCs and props. Whole vehicle and urban-building kits also remain potential Starter Town or later-town source libraries.

## Safe duplicate candidates

These exact duplicates are the first cleanup candidates after live regression:

1. Duplicate Mini Kit hair textures with `_png` filename copies.
2. `models/props/trash-debris.glb` and `models/props/trash/trashanddebris.glb`.
3. Duplicate `Street_Asphalt_Curve_2Lane` copy files.

Before removing any duplicate, preserve the path used by current manifests and source references, update references when necessary, rerun the inventory, and deploy-test Starter Town.

## Deferred review groups

Do not delete these merely because they are unindexed:

- `models/vehicles/car-kit/`
- `models/vehicles/lowpoly-cars/`
- `models/buildings/urban-kit/`
- `models/characters/mini-kit/`
- directly referenced standalone weapons, hair, jewelry, NPCs and vehicles

These folders may be intentionally held as source libraries for upcoming town, traffic, wardrobe and building work.

## Cleanup gate

A deletion batch is allowed only when all of the following are true:

1. The file is an exact duplicate, a proven obsolete generated copy, or an intentionally retired asset.
2. Source and manifest references have been checked.
3. License or attribution records remain preserved.
4. `npm run check` passes.
5. `npm run audit:characters` passes.
6. `npm run audit:assets` reports no new missing indexed files.
7. Starter Town live regression passes after deployment.

Cleanup should use small commits grouped by asset family so each removal can be reverted independently.
