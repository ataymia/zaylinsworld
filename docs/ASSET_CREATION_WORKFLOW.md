# Asset Creation Workflow

Step-by-step, repeatable process for turning sourced art (rigged characters and
props) into optimized GLBs that drop into **Zaylin's World**. Everything here is
**free and local** unless a step is explicitly marked *(deferred — paid/API)*.

See [GRAPHICS_ANIMATION_PIPELINE.md](GRAPHICS_ANIMATION_PIPELINE.md) for the big
picture and [ANIMATION_STATE_MACHINE.md](ANIMATION_STATE_MACHINE.md) for clip
naming.

---

## 0. Where assets live

```
public/assets/models/
  characters/<pack>/<name>.glb     # humanoids (PSX roster, etc.)
  buildings/ props/ vehicles/ …    # kits
  asset-index-v2.json              # generated registry
  kits-index.json                  # generated kit index
```

Existing in-repo tooling (Node, **no API keys**):

| Script | Command | Purpose |
|--------|---------|---------|
| [tools/convert-fbx.mjs](../tools/convert-fbx.mjs) | `node tools/convert-fbx.mjs` | FBX/OBJ → GLB via system `assimp`, kebab-cased into `public/assets/models/` |
| [tools/index-kits.mjs](../tools/index-kits.mjs) | `npm run index:kits` | Scan kits → `kits-index.json` |
| [tools/organize-assets.mjs](../tools/organize-assets.mjs) | `npm run organize` | Normalize folder layout / names |
| [tools/glb.mjs](../tools/glb.mjs) | (library) | Dependency-free GLB writer for original CC0 geometry |
| [tools/process-materials.mjs](../tools/process-materials.mjs) | `node tools/process-materials.mjs` | Bake source textures → material set |
| [scripts/gen-asset-report.mjs](../scripts/gen-asset-report.mjs) | `npm run gen:asset-report` | Audit which assets are actually used |

---

## 1. Sourcing (free / CC0)

- **Characters:** Mixamo (free, auto-rig + shared skeleton), Quaternius,
  Kenney mini-characters. Keep the PSX roster style consistent.
- **Animations:** Mixamo clips (download as FBX, "Without Skin" for clip-only),
  Quaternius universal animation library.
- **Props/buildings:** Kenney, Quaternius, Poly Pizza (all CC0).

Record provenance in [../ASSET_CREDITS.md](../ASSET_CREDITS.md).

---

## 2. Convert to GLB

1. Drop source FBX/OBJ into `.staging/` (used by `convert-fbx.mjs`).
2. Run `node tools/convert-fbx.mjs` → emits GLB under `public/assets/models/<dest>/`.
3. Re-index: `npm run index:kits`.

`assimp` preserves per-material base colors, so packs without texture maps still
render with correct metal/wood tints.

---

## 3. Retarget animation (Blender, free + scriptable)

For characters that need a shared clip set:

```bash
# headless retarget + bake (no GUI, no keys)
blender -b base_character.glb -P tools/retarget.py -- \
  --clips mixamo/walk.fbx mixamo/run.fbx mixamo/idle.fbx \
  --out public/assets/models/characters/<pack>/<name>.glb
```

`tools/retarget.py` (to author when first needed) should:
- Import the character + each clip FBX.
- Map source bones → the ZW/Mixamo skeleton (Auto-Rig Pro / Rokoko free add-on
  or a name-based bone map).
- Bake each clip into a **named action** (`idle`, `walk`, `run`, …) so
  `CLIP_ALIASES` in the state machine resolves them automatically.
- Export a single GLB with all actions.

> Until this script exists, Mixamo's shared skeleton already lets you download a
> character **with** its clips baked in — those load directly.

---

## 4. Optimize (free, scriptable — do this for everything)

Use `glTF-Transform` + KTX2. Add as dev tooling (CLI, no runtime dependency):

```bash
# geometry: dedupe, prune, Draco/Meshopt compress
gltf-transform optimize in.glb out.glb --compress meshopt

# textures → GPU-friendly KTX2 (BasisU)
gltf-transform etc1s out.glb out.ktx.glb     # or uastc for higher quality
```

Targets per character: ≤ ~30 KB geometry after Meshopt, KTX2 textures, ≤ 5
materials. The loader already reads Draco/Meshopt/KTX2 when present.

---

## 5. Register & validate

1. Place the optimized GLB under the correct `public/assets/models/**` folder.
2. Add/confirm its entry resolves through
   [src/config/assetRegistry.js](../src/config/assetRegistry.js).
3. Load test in-game: a humanoid passes `validateHumanoidGlb()` only if its final
   height lands in **1.2–2.4 m** and width/depth ≤ 1.6 m. If rejected, the
   console logs the reason and the procedural body is kept.
4. If a character walks backward, set `window.__ZW_SKIN__.faceYaw = Math.PI` in
   the console to confirm the fix, then bake the rotation into the source.

---

## 6. Deferred (paid / API — optional, never auto-invoked)

| Need | Service | Note |
|------|---------|------|
| Custom avatars | Ready Player Me | GLB out → `skinAvatar()`; needs app id |
| Text/image → 3D | Meshy / Luma / CSM / Rodin | rig before character use |
| Video → mocap | DeepMotion / Rokoko / Move.ai | export FBX → retarget (§3) |

These require keys and are **documented only** — no code path calls them, so the
repo stays buildable and secret-free.
