# ZTA Free Asset Factory architecture

## Decision

The production asset generator must remain usable without a paid text-to-3D API. The previous Meshy/Cloudflare generation path has been removed.

The replacement uses **Blender in headless mode on GitHub Actions**. Blender, Python, Node, the existing asset registry, and the generated geometry are all free/open-source or original ZTA work.

Cloudflare credentials may remain in GitHub for future hosting or storage work, but the asset generator does not read or require them.

## Runtime

```text
Town blueprints and visual bible
  -> blueprint asset-name compiler
  -> detailed machine specifications
  -> persistent GitHub queue
  -> next 10 supported assets
  -> purpose-built Blender family generators
  -> four-angle preview renders
  -> geometry, scale, component, material, pivot, and silhouette QA
  -> passing GLBs only
  -> existing asset-index-v2.json
  -> Three.js GLTFLoader
```

## What “realistic” means here

The target is not photorealism and it is not primitive placeholder art. The target is:

- immediately recognizable object identity
- believable human, architectural, mechanical, or anatomical proportions
- credible load paths, supports, joints, service panels, fasteners, vents, seams, and access points
- materials that correspond to how the object would actually be built
- town-specific visual identity from `WORLD_VISUAL_REFERENCE_BIBLE.md` and each town blueprint
- clean, optimized geometry suitable for a browser open-world game

Hard edges and square forms are allowed whenever the requested object calls for them. The banned shortcut is crude construction that fails to look like the object.

Examples:

- a utility box may be rectangular, but it still needs a door, hinge, latch, vents, conduit entries, mounting, and weather protection
- a hover car may be angular, but it still needs a chassis, passenger cabin, lift system, lights, cooling, service access, and stable packaging
- a fire hydrant may use cylindrical castings, but it cannot be a stack of plain red cylinders

## Non-negotiable rejection rules

The factory must not generate or accept:

- cylinder-and-sphere people
- stacked-circle or disconnected-blob monsters
- floating-box or flying-saucer hover cars
- vehicles without passenger packaging and propulsion hardware
- undecorated building boxes presented as finished facades
- generic primitive substitutes for unsupported families
- Roblox-like toy proportions or filler
- unrelated neon added outside the applicable town style

Unsupported families are marked `unsupported` and skipped. They remain in the master specification library until a dedicated builder exists.

## Source of the queue

`tools/asset-factory/compile-specs.mjs` scans every Markdown document under `docs/` and extracts every requested `.glb` filename.

For every discovered asset it creates:

- display name
- town and blueprint source
- family and builder status
- detailed production description
- design intent
- target dimensions
- required components
- material guidance
- geometry and material budgets
- functional notes
- prohibited shortcuts
- license and provenance metadata

Hand-authored hero specifications and priority overrides live in:

```text
asset-factory/manual-overrides.json
```

The complete generated library is written to:

```text
asset-factory/generated/master-asset-specs.json
```

Queue state is written to:

```text
asset-factory/state/queue.json
```

## Generation engine

Blender family builders live under:

```text
tools/asset-factory/blender/
```

They use:

- beveled hard-surface modeling
- curved tube and structural-member generation
- high-segment round parts where smoothness matters
- layered PBR and emissive materials
- text converted to exportable mesh
- component names and GLB extras
- separate functional pieces where animation or gameplay may need them later

The system never passes arbitrary unsupported text into a generic primitive generator.

## Batch operation

The GitHub workflow runs at minutes 17 and 47 of every hour and can also be launched manually.

Each run:

1. recompiles the master specification library
2. preserves prior queue progress
3. selects up to 10 supported queued assets
4. runs Blender once for the complete batch
5. renders four transparent-background views per asset
6. applies the quality gate
7. exports and registers passing assets
8. retries failures up to the configured limit
9. quarantines persistent failures
10. commits accepted GLBs, queue state, and the batch report
11. stores preview PNGs temporarily as a GitHub Actions artifact

A failed object does not stop the remaining batch.

## Quality gate

Every asset is checked for:

- required component coverage
- expected scale and dimensional tolerance
- ground-centered pivot
- mesh-object minimum
- triangle minimum and maximum
- material minimum and maximum
- four-angle silhouette coverage
- valid GLB export

A valid binary file is not sufficient. It must also meet its object-specific construction requirements.

## First production proof

The first unattended batch is the Starter Town street-infrastructure anchor pack:

1. main-street streetlight
2. residential streetlight
3. mast-arm traffic signal
4. stop sign
5. street-name sign
6. Dreamdrop District gateway marker
7. municipal fire hydrant
8. sidewalk utility cabinet
9. municipal bench
10. public trash receptacle

Detailed hand-authored specifications are already included for all ten.

The next proof includes two TechTown hover vehicles with dedicated chassis, cabin, lift-pod, cooling, lighting, charging, and service requirements.

## Commands

```bash
npm run asset:compile
npm run asset:dry-run
npm run asset:batch
```

`asset:batch` requires Blender and is intended primarily for GitHub Actions. No installation is required on the user’s computer.

## Honest limitation

This factory is procedural, not a free unlimited generative-AI sculptor. High quality comes from dedicated family builders and detailed specifications. A new specialized family may require one new builder, after which that builder can produce many consistent variants automatically.

Characters, creatures, highly organic hero sculptures, and complex rigged anatomy remain quarantined until dedicated pipelines are built. The factory is forbidden from lowering their quality merely to claim the queue is complete.
