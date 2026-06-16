# Graphics & Animation Pipeline

How **Zaylin's World** gets believable characters, props, and animation into the
browser — what we can do **today, for free, locally**, versus what is **deferred**
to paid/API services later. No paid API calls, secrets, or hard third-party
dependencies are introduced by adopting this document.

---

## 0. Current state (what the engine already does)

- **Renderer:** three.js r160 + Vite, single bundle (~290 KB gzip).
- **Characters:** procedural low-poly avatars built in [src/avatar.js](../src/avatar.js)
  (`buildAvatar`), animated by a per-frame procedural leg/arm swing in
  `updatePlayer()` ([src/main.js](../src/main.js)) and the NPC/cop updaters.
- **GLB skins:** a validated humanoid GLB can be attached on top of the
  procedural rig via [src/avatarSkin.js](../src/avatarSkin.js) (`skinAvatar`,
  `validateHumanoidGlb`). Skinned clips play through three's `AnimationMixer`,
  created by `makeMixer()` ([src/assets.js](../src/assets.js)) and ticked by
  `updateMixers(dt)` ([src/manifest.js](../src/manifest.js)).
- **Loading/optimization:** GLBs are streamed from `public/assets/models/**`,
  resolved through the asset registry; Draco/Meshopt/KTX2 are supported by the
  loader when present in the file.
- **Feature flags:** `FEATURES` + `window.__ZW_FEATURES__` gate risky GLB swaps;
  `window.__ZW_SKIN__.faceYaw` live-corrects a skin's forward axis.

The **AnimationController** skeleton in
[src/animation/animationStateMachine.js](../src/animation/animationStateMachine.js)
is the seam where procedural posing and GLB clips converge (see
[ANIMATION_STATE_MACHINE.md](ANIMATION_STATE_MACHINE.md)).

---

## 1. The eight questions (free/local-now vs paid/API-later)

| # | Question | Answer for this repo |
|---|----------|----------------------|
| 1 | **Rigged character source?** | *Now/free:* Kenney/Quaternius/Mixamo (CC0/free) GLB+FBX, already the PSX roster in `public/assets/models/characters/psx`. *Later/paid:* Ready Player Me (avatar API, free tier + keys), Meshy/Luma (text/image→3D), Rodin. |
| 2 | **Animation clips?** | *Now/free:* Mixamo library (free, manual download, auto-rig), Quaternius universal animation packs. *Later/paid:* DeepMotion / Rokoko / Move.ai (video→mocap, API + keys). |
| 3 | **Retargeting to one skeleton?** | *Now/free:* Blender + Auto-Rig Pro/Rokoko free add-on, or Mixamo's shared skeleton (already uniform). *Automatable:* a Blender headless script (see [ASSET_CREATION_WORKFLOW.md](ASSET_CREATION_WORKFLOW.md)). |
| 4 | **Props / buildings / environment?** | *Now/free:* Kenney kits, Quaternius, Poly Pizza (CC0). *Later/paid:* Meshy/CSM text→3D, Quixet/Megascans (license). Existing kits already cover town props. |
| 5 | **Optimization (size/perf)?** | *Now/free + automatable:* `glTF-Transform` (Draco/Meshopt/dedup/prune), `KTX2`/`toktx` (GPU textures), `gltfpack`. Wire into `tools/` scripts. |
| 6 | **What's automatable in-repo today?** | FBX→GLB convert, kit indexing, material/texture processing, GLB optimization — all via Node scripts in `tools/` (no keys). |
| 7 | **What needs API keys (deferred)?** | RPM avatars, Meshy/Luma/CSM generation, DeepMotion/Rokoko mocap. Documented as optional; never imported or called automatically. |
| 8 | **Web/mobile performance budget?** | See §6. Target ≤ 1.0 M tris on screen, ≤ 60 skinned characters, KTX2 textures, single draw-batched kits, 30–60 fps mobile. |

---

## 2. Character pipeline (rigged humanoids)

```
source GLB/FBX ──▶ Blender retarget to ZW skeleton ──▶ bake clips (idle/walk/run/…)
   (free)              (free, scriptable)                 │
                                                          ▼
                                   glTF-Transform optimize (Draco + KTX2 + prune)
                                                          │
                                                          ▼
                            public/assets/models/characters/<pack>/<name>.glb
                                                          │
                                                          ▼
        loadAsset() ─▶ validateHumanoidGlb() ─▶ skinAvatar() ─▶ AnimationController
```

- **Single skeleton target:** standardize on the Mixamo/RPM humanoid bone names
  so one clip set retargets to every character. Clip names map to logical states
  through `CLIP_ALIASES` in the state machine — no per-asset wiring needed.
- **Validation first:** `validateHumanoidGlb()` rejects empty/tiny/huge/NaN
  bounds **before** hiding the procedural body, so a bad asset can never become a
  blob or an invisible player. Procedural fallback is always kept.

### Deferred (paid/API) avatar paths
- **Ready Player Me:** half-body/full-body avatars via URL/API (free tier; needs
  app id). Output is GLB → drops straight into `skinAvatar()`.
- **Generative (Meshy/Luma/CSM/Rodin):** text/image→mesh; requires rigging pass
  before use as a character. Good for props sooner than for rigged characters.

---

## 3. Prop & environment pipeline

- **Sourcing (free/CC0):** Kenney, Quaternius, Poly Pizza, Sketchfab-CC0.
- **In-repo today:** kits live under `public/assets/models/**` and are indexed by
  [tools/index-kits.mjs](../tools/index-kits.mjs) into `kits-index.json` /
  `asset-index-v2.json`; the registry [src/config/assetRegistry.js](../src/config/assetRegistry.js)
  resolves them.
- **Placement:** prefab rules ([src/config/placementRules.js](../src/config/placementRules.js),
  [src/prefabs.js](../src/prefabs.js)) scatter asset-aware clusters without
  blocking doors/lanes (gated by `FEATURES.USE_PREFAB_TOWN_PROPS`).
- **Generative (deferred):** Meshy/CSM text→3D for bespoke landmarks; bake +
  optimize before committing.

---

## 4. Blender automation (free, scriptable)

Headless Blender (`blender -b -P script.py`) can:
- Import FBX/GLB, **retarget** animation to the ZW skeleton.
- **Bake** NLA strips into named actions (idle, walk, run, …).
- **Decimate**/generate LODs.
- **Export** optimized GLB.

This complements the existing Node tools and needs **no API keys**. See
[ASSET_CREATION_WORKFLOW.md](ASSET_CREATION_WORKFLOW.md) for concrete commands.

---

## 5. Runtime animation (three.js)

- **Procedural (now):** sin-wave joint swing — zero asset cost, always works,
  used as the universal fallback.
- **Clip-based (GLB):** `AnimationMixer` + cross-fades, driven by the
  `AnimationController` FSM. States → clips via `CLIP_ALIASES`.
- **Hybrid:** a character with GLB locomotion but no `reload` clip plays the GLB
  walk/idle and falls back to a procedural arm pose for reload — the FSM resolves
  `null` clips gracefully.
- **LODs:** swap to lower-poly GLB / disable skinning past a distance threshold
  (future `LODGroup` per character).

---

## 6. Performance budget (web + mobile)

| Metric | Desktop target | Mobile target |
|--------|---------------|---------------|
| On-screen triangles | ≤ 1.5 M | ≤ 0.8 M |
| Skinned characters live | ≤ 60 | ≤ 25 |
| Active AnimationMixers | ≤ 60 | ≤ 25 |
| Texture format | KTX2 (BasisU) | KTX2 (BasisU) |
| Draw calls | ≤ 300 | ≤ 150 |
| Bundle (gzip) | keep < 400 KB | same |

Levers: KTX2 textures, Draco/Meshopt geometry, instancing/merging for kit props,
distance-based skinning cull, LODs, and capping live skinned NPCs (reskin only
the nearest N, keep distant ones procedural — `applyNpcSkins(..., max)` already
supports a cap).

---

## 7. Adoption order (low-risk → high)

1. Optimize existing GLBs with glTF-Transform (size win, no gameplay risk).
2. Adopt `AnimationController` for the player only (keep procedural fallback).
3. Retarget one Mixamo clip set to the PSX roster; map via `CLIP_ALIASES`.
4. Roll FSM to NPCs/cops with a live-skinned cap for perf.
5. Add LODs + KTX2 across kits.
6. (Deferred) Integrate RPM/generative/mocap behind optional, key-gated tools.
