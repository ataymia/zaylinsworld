# ZTA Asset Forge architecture

## Runtime

```text
Browser dashboard
  -> Cloudflare Worker API
  -> Cloudflare Workflow
  -> Meshy Text-to-3D v2 preview + refine
  -> R2 generated GLB + preview
  -> D1 job ledger + public catalog
  -> Three.js GLTFLoader
```

The service is isolated under `asset-forge/` and does not replace the existing hard-coded GLB generators in `tools/generated-assets/`.

## Security boundaries

- Cloudflare credentials exist only as GitHub Actions credentials.
- Provider and dashboard credentials become Cloudflare Worker secrets.
- No secret is committed to the repository or returned by `/health`.
- Generation endpoints require `ASSET_FORGE_ADMIN_KEY`.
- Generated GLBs and the catalog are public because the game client must load them.

## Initial quality policy

- Standard Meshy geometry with remeshing enabled
- Triangle topology
- Default target of 6,000 polygons, hard cap of 20,000
- Meshy 6/latest preview and refine flow
- PBR maps enabled
- Baked lighting removal enabled
- Automatic scale estimate and bottom origin
- GLB-only output
- Zaylins style profile automatically appended to every prompt

## Next milestones

1. Deploy and verify `/health`.
2. Add Meshy and admin secrets.
3. Generate one fire hydrant proof asset.
4. Add a remote-catalog loader to the game.
5. Add candidate generation and human approval.
6. Add GLB validation and optimization.
7. Add placement metadata and map-population hooks.
