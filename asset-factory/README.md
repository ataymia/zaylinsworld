# ZTA Free Asset Factory

This directory contains the persistent specifications, policies, queue state, generated models, and QA records for the free unattended Zaylins asset pipeline.

## Current specification status

The repository audit found **978 `.glb`-shaped records** across blueprints, system documents, reports, standards, and manual overrides.

They are now explicitly separated into:

- **962 canonical generation requests**
- **16 reference-only records that must not be generated**

The 16 reference-only records consist of:

- 9 existing-asset or cleanup references
- 3 naming examples from the city blueprint standard
- 1 workflow template reference
- 3 command fragments that were never assets

Every record remains documented so the audit trail is complete, but every reference-only prompt begins with `REFERENCE ONLY — DO NOT GENERATE` and carries a reason and required action.

## Physical-specification repair

The original compact compiler contained two important weak spots:

- 644 specialized objects had only generic unsupported-prop placeholders
- 23 non-character objects inherited character dimensions, anatomy components, or rigging language because their names contained species or profession words

The deep pipeline now replaces all **667** weak or contaminated records with physical object profiles containing:

- object-specific dimensions
- at least six functional components
- meaningful material categories
- geometry and material budgets
- placement, orientation, collision, LOD, interaction, and export requirements
- object-specific forbidden shortcuts
- a canonical physical description used to rebuild the final prompt and long-form brief

All 667 derived profiles are then specialized again. The validated accounting is:

- 237 explicit reusable object profiles
- 169 unique role-specific profiles
- 261 already-specific named profiles

No broad fallback profile remains in the final committed library.

## Two specification layers

### Compact queue layer

```text
asset-factory/generated/master-asset-specs.json
```

This is the smaller queue-facing inventory compiled from every discovered `.glb` reference plus manual canonical additions. It preserves source documents, families, builders, status, dimensions, components, materials, and baseline quality budgets.

### Deep production layer

```text
asset-factory/generated/deep-asset-specs.json
asset-factory/generated/deep-spec-coverage.json
asset-factory/generated/deep-specs/*.json
```

`deep-asset-specs.json` is a small manifest rather than a 36 MB monolith. The complete library is stored in **11 validated shards**:

- one shard for each production town or shared-world group
- one dedicated `reference-only.json` shard

The manifest records each shard’s path, record count, byte size, SHA-256 digest, generation eligibility, and first and last asset IDs. The largest shard remains below 6 MB.

Every deep record contains:

- a unique long-form production description
- an asset-specific generation prompt and negative prompt
- exact source-document and blueprint-section evidence
- final physical category and the reason for that classification
- generation eligibility and inventory disposition
- gameplay and world role
- placement and environmental integration rules
- silhouette and proportion requirements
- structural, mechanical, architectural, anatomical, botanical, food, or equipment construction logic
- dimensions and required components
- material behavior, town palette, wear, lighting, and emissive restrictions
- interaction and animation hooks
- collision rules
- pivot and orientation rules
- LOD targets and protected silhouette features
- export hierarchy
- licensing and provenance requirements
- at least 12 QA checks
- at least 8 rejection criteria
- a unique SHA-256 brief hash

## Validation gates

The deep specification workflow must pass all of these independently:

1. **Deep completeness:** exactly 978 unique descriptions, prompts, IDs, contexts, schemas, and hashes.
2. **Physical integrity:** all weak compact specs are replaced, non-character anatomy contamination is removed, dimensions are plausible, and functional components and materials are complete.
3. **Profile specialization:** every derived asset has a named specialized profile and no broad fallback remains.
4. **Inventory audit:** exactly 962 records are eligible for future generation and exactly 16 are reference-only.
5. **Shard integrity:** all 978 records reassemble from the manifest and shards with matching byte counts, SHA-256 digests, IDs, brief hashes, and inventory totals.

A green count alone is not enough. The workflow also rejects semantic contradictions such as:

- a streetlight classified as vegetation because it contains the letters `tree`
- a trash receptacle classified as food because it contains the word `can`
- a fish crate classified as a living fish
- a cottage or boat inheriting a humanoid rigging specification
- a charger classified as a hover vehicle or checkpoint surface
- a documentation command such as `in.glb` entering the generation queue

## Cost model

- Generation engine: Blender, free and open source
- Automation: GitHub Actions
- Paid text-to-3D APIs: none
- Cloudflare generation dependency: none
- Local installation required by Mia: none

## Directory map

```text
asset-factory/
  quality-policy.json             global visual and QA contract
  manual-overrides.json           detailed hero specs and queue priorities
  qa-overrides.json               reviewed object-specific QA tuning
  vehicle-base-map.json           licensed vehicle-body foundations
  generated/
    master-asset-specs.json       compact queue library
    deep-asset-specs.json         deep-library shard manifest
    deep-spec-coverage.json       coverage and integrity report
    deep-specs/                   town and reference-only shards
  state/                          persistent generation queue progress
  work/                           temporary Blender input, previews, and reports
```

Source code lives under:

```text
tools/asset-factory/
  compile-specs.mjs
  enrich-all-specs.mjs
  normalize-deep-specs.mjs
  refine-deep-semantics.mjs
  finalize-deep-semantics.mjs
  derive-physical-specs.mjs
  specialize-physical-specs.mjs
  classify-inventory-intent.mjs
  shard-deep-specs.mjs
  check-deep-specs.mjs
  check-physical-specs.mjs
  check-specialized-physical-specs.mjs
  check-inventory-intent.mjs
  check-sharded-deep-specs.mjs
  run-batch.mjs
  blender/
```

## Model-generation automation

The Blender model workflow remains separate from specification enrichment. It processes a maximum of 10 production-ready assets per run without per-asset approval.

Passing assets are exported to:

```text
public/assets/models/generated/<town>/<family>/<asset>.glb
```

They are registered in:

```text
public/assets/models/asset-index-v2.json
```

Four-angle preview images are stored temporarily with the corresponding GitHub Actions run. Persistent batch reports live under:

```text
reports/asset-factory/
```

## Queue statuses

- `queued`: supported and awaiting generation
- `completed`: passed QA, exported, verified, and registered
- `unsupported`: fully specified but waiting for a dedicated family builder
- `quarantined`: repeatedly failed a purpose-built builder and needs engineering work
- `reference-only`: documented for audit purposes and explicitly prohibited from generation

Unsupported does not mean forgotten. Reference-only does not mean missing. Both statuses prevent the factory from claiming progress through crude substitutions or accidental documentation fragments.

## Visual standard

An asset must look like the object it claims to be. Boxes, cylinders, curves, hard edges, and flat panels are allowed where the object’s real construction calls for them. Failure means the completed asset lacks recognizable identity, believable proportions, coherent support or anatomy, functional components, correct materials, or a plausible relationship to its environment.

See `quality-policy.json` and `docs/ASSET_FORGE.md` for the complete generation contract.
