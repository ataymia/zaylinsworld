# Cloudflare Asset Storage Plan

## Goal

Keep GitHub focused on source code, compact catalogs, deterministic build recipes, queue state, hashes, and reviewable metadata. Store large generated and imported binary assets in Cloudflare R2, where the browser can retrieve them through a cached custom domain.

The repository is already roughly 300 MB. Continued GLB generation inside Git history would make clones, checkouts, rebases, Actions startup, and pull-request inspection steadily slower even when the current working tree still appears manageable.

## Target architecture

```text
GitHub
  source code
  asset specifications
  queue and health summaries
  compact indexes and SHA-256 manifest
  GitHub Actions workflows
          |
          | verified upload
          v
Cloudflare R2
  assets/by-sha256/ab/<full-sha256>.glb
  assets/by-sha256/cd/<full-sha256>.ktx2
  other immutable binary payloads
          |
          | custom asset domain + Cloudflare cache
          v
Three.js game client
  familiar local asset path
  -> compact remote manifest lookup
  -> immutable R2 URL
  -> local public/ fallback when unmapped
```

## Why content-addressed objects

Each remote key is derived from the file's SHA-256 digest. A changed asset receives a new URL instead of silently replacing an old object. That permits long immutable cache lifetimes while preventing stale clients from receiving the wrong geometry.

The game continues to use paths such as:

```text
./assets/models/generated/example.glb
```

`src/assets.js` consults `public/assets/remote-asset-manifest.json`. When that path has an R2 mapping and an asset base URL is configured, the loader requests the content-addressed R2 object. When it is not mapped, the original local URL remains the fallback.

## Migration phases

### Phase 1: generated GLBs

Synchronize generated model binaries from:

```text
public/assets/models/generated/
public/assets/textures/generated/
public/assets/audio/generated/
```

Keep runtime JSON, SVG decal descriptors, queue state, health reports, and catalogs in Git. They are small, diffable, and useful during review.

During Phase 1 the local GLBs remain in Git as a safety net. R2 availability, checksums, browser CORS, custom-domain delivery, and game loading must all be proven before pruning.

### Phase 2: all web binary assets

Run the uploader with `scope=all` to synchronize GLB, GLTF, BIN, KTX2, image, HDR, audio, video, font, and WASM files found below `public/assets/`.

The compact manifest remains in Git. World code and game manifests do not need to know whether an individual asset is local or remote.

### Phase 3: stop committing generated binaries

After repeated successful production uploads:

1. Upload each accepted GLB before updating queue state.
2. Verify at least one downloaded object against its content hash in every run.
3. Commit only the compact remote manifest, index, queue, and QA reports.
4. Add generated binary directories to `.gitignore`.
5. Remove already-migrated binaries from the current Git tree.

This reduces new repository growth. It does not erase binary objects from older commits.

### Phase 4: optional history compaction

A controlled history rewrite is required to remove old binaries from existing Git history and materially reduce clone size. This must happen only after:

- R2 migration is complete and verified.
- A permanent backup branch or bundle exists.
- Production workflows are paused.
- Open feature branches are reconciled.
- Every collaborator understands that local clones must be refreshed.

Do not mix the history rewrite with active asset generation.

## Required GitHub configuration

### Actions secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID` for automated custom-domain attachment

The token should be scoped to the Zaylins Cloudflare account and grant only the R2 and deployment permissions required by the workflow. Never store the token in source files, workflow YAML, logs, issues, or chat messages.

### Repository variables

- `R2_BUCKET`, default: `zaylins-assets`
- `R2_ASSET_DOMAIN`, recommended: `assets.zaylinsworld.com`
- `R2_ASSET_BASE_URL`, normally `https://assets.zaylinsworld.com`

### Vite environment

Production builds may set:

```text
VITE_ASSET_BASE_URL=https://assets.zaylinsworld.com
```

The value is optional because the generated remote manifest may also carry its base URL. Local development works without it.

## Cache policy

Content-addressed objects use:

```text
Cache-Control: public, max-age=31536000, immutable
```

Manifests and indexes must not use that policy. They should be revalidated or served with a short cache lifetime because they are the pointers that announce new asset versions.

A custom R2 domain should be used for production delivery so Cloudflare cache behavior and Cache Rules are available. The development `r2.dev` endpoint should not be the final game asset origin.

## Browser and CORS policy

The supplied R2 CORS policy permits public `GET` and `HEAD` requests and exposes range, size, ETag, and last-modified response headers. This supports browser model loading and partial/range-aware delivery without permitting browser writes.

## Failure behavior

The migration is deliberately reversible:

- Missing remote manifest: local URL.
- Missing asset mapping: local URL.
- Missing base URL: local URL.
- Failed model request: existing procedural fallback.
- Failed R2 synchronization: no manifest commit and no local deletion.

No production workflow should delete a local binary until its upload and checksum verification have succeeded.

## Production checklist

1. R5 Blender proof passes.
2. R2 bucket creation or discovery succeeds.
3. CORS policy is applied.
4. Generated GLBs upload under SHA-256 keys.
5. Downloaded verification object matches its expected hash.
6. Remote manifest is committed.
7. Browser build and quality gate pass with the asset base URL configured.
8. Visual smoke test confirms remote models load.
9. Only then enable Git pruning for generated binaries.
