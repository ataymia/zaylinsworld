# Prefab & Variation System (Phase 2)

Zaylin's World builds its town from **pure config** + a **seeded variation resolver**
so the same town can be dressed with many different assets without touching gameplay
code. Adding a new asset is a registry/config edit — never a code change.

## Layers

```
asset-index-v2.json ──► config/assetRegistry.js  (buildRegistry → semantic meta)
                                  │
config/variationPools.js ─────────┤  "give me a trash item / a couch / a gas pump"
config/prefabRegistry.js ─────────┘  seeded weighted pick → asset OR clean fallback
                                  │
config/placementRules.js          │  where props may sit (off-road, off-footprint)
config/propPrefabs.js             │  per-prop pool + collision + procedural fallback
config/buildingPrefabs.js         │  building exterior/interior/props/theme
config/interiorPrefabs.js         │  interior zones/stations/npc spawns
config/vehicleCollisionRules.js   │  hard/breakable/soft + damage states
                                  ▼
src/prefabs.js   placeProp() → loads GLB (normalized, grounded, bounds-checked)
                               or draws a procedural fallback box; registers
                               collision (world.js colliders + worldCollision.js)
src/townBuilder.js  dressTown() → uses placement rules + pools + seed to scatter
                               varied trash clusters & dumpsters into Starter Town
```

## Determinism

Everything is seeded with `mulberry32` keyed off a string hash
(`hashSeed` / `makeRng` in `config/prefabRegistry.js`). The town seed
(`state.townSeed`, default `'starter-town'`) drives every pick and jittered
anchor, so the town does **not** rearrange on reload unless the seed changes.

## Variation (no single hard-coded asset)

`config/variationPools.js` defines named pools (e.g. `trash`, `couch`,
`gas_pump`, `weapon_wall`). A pool matches assets by **category OR tag**, so new
uploads that fit are picked up automatically. `resolveVariation(registry, pool,
{seed, key})` returns a weighted random asset; `resolveVariations(...)` returns N
without back-to-back repeats. If a pool has no candidates it returns a clean
**fallback stub** and `prefabs.js` draws a simple procedural box (never a blob or
black screen).

## Collision

`config/vehicleCollisionRules.js` classifies objects as:

| type      | behavior                                   |
|-----------|--------------------------------------------|
| `hard`    | solid AABB pushed to `world.js` colliders  |
| `breakable` | tips over + minor car damage on impact   |
| `soft`    | litter — driven over, no blocking          |
| `none`    | decor / interior, no vehicle collision     |

`src/worldCollision.js` tracks registered objects and `collideVehicle(pos, speed,
onBreak)` is called from `updateCar` (gated by
`FEATURES.USE_BREAKABLE_STREET_OBJECTS`).

## Damage → handling

`config/vehicleCollisionRules.js` `DAMAGE_STATES` map 0–100 damage to
clean/dented/smoking/critical/totaled. `src/vehicleDamage.js` `handlingFor(dmg)`
returns `speedMult / steerMult / wobble / totaled`. A **totaled** car can't drive
and must be towed to the City Garage. `applyDamageVisual` scuffs panels, tilts the
chassis, and attaches a smoke puff.

## Feature flags (`src/main.js` FEATURES)

- `USE_PREFAB_TOWN_PROPS` — run `dressTown()` after the city builds.
- `USE_BREAKABLE_STREET_OBJECTS` — enable smashable street objects.

Both default on but are fully additive + fallback-safe; turning them off restores
the prior behavior with zero side effects.

## Adding a new asset (no code)

1. Add the file to the asset index (`asset-index-v2.json`).
2. If needed, tag it so an existing pool in `variationPools.js` matches (category
   or tag). For a brand-new prop, add a `PROP_PREFABS` entry with a `pool`,
   `collisionType`, and a procedural `fallback`.
3. Reload — the seeded resolver will start selecting it. No gameplay code edits.

## Debug panel (WORLD / ASSETS)

Shows: prefab props placed, prefab real assets vs fallbacks, prefab seed,
breakable objects, world objects, and failed assets — so you can prove the system
is selecting assets (not just reading config) at runtime.

## Phase 3 — Starter Town goes live (traffic, trash, storefronts, HQ)

This phase wires the prefab/asset foundation into *visible* gameplay so the town
reads as a real place, not a config layer:

- **Traffic control** (`src/traffic.js`, `mapConfig.INTERSECTIONS` /
  `TRAFFIC_TIMING`): real signal poles and stop signs built at intersections.
  `buildTrafficControl(scene)` returns a controller; `updateTraffic()` in
  `npc.js` now obeys red/yellow lights, pauses at stop signs, brakes for cars
  ahead, and self-recovers from permanent jams (re-slots stuck cars).
- **Real pickup trash** (`props.js` `loadTrashTemplates` / `makeTrashItem`): the
  cleanup job now spawns the real *Trash & Debris* GLB nodes (with a clean bag
  fallback). The old decorative scatter and prefab trash boxes were removed so
  there is a single, asset-backed, pickuppable litter system.
- **Storefront identity** (`world.js` `storefrontProps`): per-landmark awnings,
  rooftop billboards, and type props (menu boards, gem pedestals, crates, tire
  stacks…) so each building is recognizable, not a labelled box.
- **Civic Safety HQ** (`mapConfig.POLICE_POST`, `world.js` `buildPolicePost`):
  a visible police post with a cruiser lot, two parked (stealable) cruisers, a
  flag/beacon, a front-desk info dialogue, and a minimap marker.

### Expansion prep (next districts — NOT built yet)

The systems above are intentionally data-driven so a second district can reuse
them without new gameplay code:

- **Layout**: `mapConfig` is pure data (roads, landmarks, intersections, routes,
  police post). A new district = a sibling config object with the same shape.
- **Traffic graph**: `TRAFFIC_ROUTES` / `PEDESTRIAN_ROUTES` are closed loops;
  add loops for the new grid and `buildTrafficControl` + `createTraffic` handle
  them unchanged.
- **Seeding**: `dressTown({ seed })` already accepts a per-district seed, so
  prop placement stays deterministic and varied per district.
- Do **not** build a multi-town map until Starter Town is confirmed visually
  working in a live session.

### Roadmap — Obby / obstacle-course zone (future, do NOT implement yet)

A planned challenge zone: jump/parkour platforms, moving hazards, checkpoints,
and rewards. Intended variants: beginner, timed run, "monster" chase, vehicle
course, and a police-academy training course (ties into Civic Safety HQ). This
is recorded here only as a roadmap item — no implementation in this phase.
