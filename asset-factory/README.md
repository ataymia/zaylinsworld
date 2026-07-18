# ZTA Free Asset Factory

This directory contains the persistent specifications, policies, and queue state for the free unattended Zaylins asset generator.

## Production status

- Factory merged and running on `main`
- First unattended batch completed: 10 of 10 passed QA, exported as verified GLBs, and entered the live asset index
- Currently supported and queued after batch one: 89
- Fully specified but intentionally waiting for dedicated family builders: 879
- TechTown hover-vehicle work is being repaired separately and does not block specification enrichment

The unsupported count is a quality safeguard, not lost work. Those assets already have specifications, but the factory refuses to replace them with crude generic geometry.

## Two specification layers

### Compiled master layer

```text
asset-factory/generated/master-asset-specs.json
```

This is the compact queue-facing specification library produced from every `.glb` request in the town blueprints. It contains names, towns, source sections, families, builders, dimensions, required components, materials, quality budgets, and baseline descriptions.

### Deep production layer

```text
asset-factory/generated/deep-asset-specs.json
asset-factory/generated/deep-spec-coverage.json
```

The deep layer expands every master asset into a full production brief. Every asset receives:

- a unique long-form production description
- an asset-specific generation prompt
- a negative prompt assembled from global, family, town, and asset rejection rules
- exact source-document and blueprint-section evidence
- gameplay and world role
- placement and environmental integration rules
- silhouette and proportion requirements
- structural, mechanical, anatomical, architectural, botanical, or food-construction logic
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
- a SHA-256 brief hash for duplicate detection and traceability

The deep-spec validation workflow fails when even one asset is absent, too short, duplicated, missing blueprint context, missing required sections, or using placeholder language.

## Cost model

- Generation engine: Blender, free and open source
- Automation: GitHub Actions
- Paid text-to-3D APIs: none
- Cloudflare generation dependency: none
- Local installation required by Mia: none

## Directory map

```text
asset-factory/
  quality-policy.json          global visual and QA contract
  manual-overrides.json        detailed hero specs and queue priorities
  generated/                   compact and deep specification libraries
  state/                       persistent queue progress
  work/                        temporary Blender input, renders, and reports; gitignored
```

Source code lives under:

```text
tools/asset-factory/
  compile-specs.mjs
  enrich-all-specs.mjs
  check-deep-specs.mjs
  run-batch.mjs
  blender/common.py
  blender/builders.py
  blender/generate_batch.py
```

## Deep brief automation

`.github/workflows/build-deep-asset-briefs.yml` rebuilds and validates the complete deep specification library when the blueprint documents, master asset list, quality policy, manual overrides, or enrichment code changes.

The workflow commits generated deep specifications on normal branch pushes and uploads them as a temporary artifact on every run. Exact duplicate descriptions, duplicate prompts, or duplicate hashes fail validation.

## Generation automation behavior

The model workflow processes a maximum of 10 assets per run. It requires no per-asset approval.

Passing assets are exported to:

```text
public/assets/models/generated/<town>/<family>/<asset>.glb
```

They are also registered in:

```text
public/assets/models/asset-index-v2.json
```

Four-angle preview images are kept as short-lived GitHub Actions artifacts. Batch reports are committed under:

```text
reports/asset-factory/
```

## Queue statuses

- `queued`: supported and awaiting generation
- `completed`: passed QA, exported, and registered
- `unsupported`: listed and fully specified, but waiting for a dedicated family builder
- `quarantined`: failed its purpose-built builder repeatedly and requires engineering attention

Unsupported does not mean forgotten. It means the factory refused to substitute crude placeholder geometry.

## Visual standard

An asset must look like the object it claims to be. The use of boxes, cylinders, curves, or other geometric construction is not itself a failure. Failure means the final object lacks recognizable identity, proportions, plausible construction, or required components.

See `quality-policy.json` and `docs/ASSET_FORGE.md` for the complete contract.
