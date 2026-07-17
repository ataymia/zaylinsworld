# ZTA Asset Forge

Cloud-only text-to-GLB generation service for Zaylins. The service runs on Cloudflare Workers + Workflows, stores job/catalog data in D1, stores finished GLBs and previews in R2, and currently uses Meshy's Text-to-3D v2 API as the generation provider.

## What is automated

1. A job or batch is submitted from the browser dashboard.
2. A Cloudflare Workflow creates a Meshy preview mesh.
3. The workflow polls durably until the preview is ready.
4. It requests a textured PBR refine task.
5. The GLB and preview image are streamed directly into R2.
6. D1 publishes the completed model into the asset catalog.
7. The game can load the resulting `model_url` through its existing `GLTFLoader` pipeline.

No local download or manual upload step is part of this flow.

## GitHub configuration

Required for deployment:

- `CLOUDFLARE_API_TOKEN` repository secret
- `CLOUDFLARE_ACCOUNT_ID` repository secret **or** repository variable

Required before generation:

- `MESHY_API_KEY` repository secret
- `ASSET_FORGE_ADMIN_KEY` repository secret

`ASSET_FORGE_ADMIN_KEY` should be a long random password used only for this private dashboard. The deploy workflow copies the two application secrets into the Worker using Wrangler.

## Deployment

The `Deploy ZTA Asset Forge` GitHub Action deploys the Worker, automatically provisions D1 and R2 bindings, applies migrations, and uploads configured Worker secrets.

The first deployment is intentionally manual from the feature branch/PR. After merge, changes under `asset-forge/**` deploy automatically from `main`.

## API

- `GET /` browser dashboard; generation calls require the admin key
- `GET /health`
- `POST /api/jobs`
- `POST /api/jobs/batch`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `GET /api/catalog`
- `GET /assets/:key`

Mutation and job-inspection routes accept either:

```text
Authorization: Bearer <ASSET_FORGE_ADMIN_KEY>
```

or:

```text
X-Asset-Forge-Key: <ASSET_FORGE_ADMIN_KEY>
```

## Example single job

```json
{
  "name": "Dreamdrop fire hydrant",
  "category": "street-props",
  "prompt": "A polished red city fire hydrant with rounded proportions, side caps, top nut, subtle painted-metal wear, and a clean readable silhouette",
  "targetPolycount": 6000
}
```

## Current scope

This is the first production-shaped proof of concept. It intentionally focuses on props and environmental assets. Character rigging, animations, multi-part vehicles, automatic visual scoring, and direct placement in the live map remain later pipeline stages.
