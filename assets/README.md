# Assets — Zaylin's World

This folder holds 3D assets loaded by the real glTF pipeline in
[`src/assets.js`](../src/assets.js). The game runs fully without any files here —
every slot falls back to a built-in procedural mesh — but dropping properly
licensed models in raises the visual fidelity toward "modern 3D game" quality.

## How to add a model

1. Put the optimized file in `assets/models/` (e.g. `assets/models/super_car.glb`).
2. Point the matching slot in [`manifest.json`](./manifest.json) at it, e.g.
   `"vehicles": { "super": "./assets/models/super_car.glb" }`.
3. Reload — it loads automatically with PBR materials, shadows, and (for rigged
   characters) animations. No code changes needed.

## Format & optimization requirements

- **Format:** `.glb` (preferred) or `.gltf`. Binary `.glb` keeps everything in one file.
- **Geometry compression:** Draco or meshopt (the loader supports both).
- **Textures:** KTX2 / Basis compressed where possible; otherwise 1K–2K PNG/JPG.
  Reserve 2K only for close-up hero items (jewelry, main character).
- **Budget:** keep cars/NPCs in the low-mid-poly range; use LODs for city assets.
- **Characters:** humanoid rig with named clips `idle`, `walk`, `run`, `talk`
  so the animation system can drive them.

## Licensing — verify BEFORE adding any asset

Only commit assets you are allowed to ship in a (potentially public, commercial)
game. For each asset confirm the license allows: **game use, modification, and
commercial/public distribution**. Acceptable sources:

- **CC0 / public domain** — e.g. [Poly Haven](https://polyhaven.com) (HDRIs,
  textures, some models). The default HDRI in the manifest is Poly Haven CC0.
- **Purchased commercial-use** asset packs.
- **Original custom models** (Blender) — required for signature assets like
  Frostbox, Block Supply, Zaylin, the hairstyles, the fictional cars, and jewelry.
- **Mixamo / Ready Player Me** only if their license terms fit your use case.

Do **not** add: real brand logos, real car badges, real celebrity likenesses,
editorial-only assets, or anything whose license forbids game/commercial use.

## Blender workflow (recommended)

1. Model / import → keep poly counts reasonable, apply real PBR materials
   (base color, metallic, roughness, normal, AO, emissive where useful).
2. For characters: rig + add `idle/walk/run/talk` actions (Mixamo retarget works).
3. Export → glTF 2.0 `.glb`, enable Draco compression, include animations.
4. (Optional) Run through `gltf-transform` for KTX2 textures + meshopt.
