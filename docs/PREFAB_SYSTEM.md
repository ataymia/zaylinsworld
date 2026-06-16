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
