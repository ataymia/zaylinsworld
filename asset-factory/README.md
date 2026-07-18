# ZTA Free Asset Factory

This directory contains the persistent specifications, policies, and queue state for the free unattended Zaylins asset generator.

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
  generated/                   compiled master specification library
  state/                       persistent queue progress
  work/                        temporary Blender input, renders, and reports; gitignored
```

Source code lives under:

```text
tools/asset-factory/
  compile-specs.mjs
  run-batch.mjs
  blender/common.py
  blender/builders.py
  blender/generate_batch.py
```

## Automation behavior

The workflow processes a maximum of 10 assets per run. It requires no per-asset approval.

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
