# 3D model assets — drop GLB files here

Each subfolder maps to a category in [`src/config/manifest.json`](../../../../src/config/manifest.json).
Drop a properly-licensed **`.glb`** file into the right folder, then point its
manifest slot at the file path (relative to `public/assets/`). The game loads it
automatically and falls back to the built-in procedural mesh (with a console
warning) when a slot is empty or a file fails to load.

```
characters/   player + NPC humanoid avatars (rigged, with idle/walk clips if possible)
hair/         modular Afrocentric hair meshes (afro, waves, locs, fade, braids, cornrows…)
vehicles/     cars (starter, sedan, supercar, hypercar) — wheels named *wheel*/*tire* spin
buildings/    exterior shells (Frostbox, dealership, chicken spot, home)
interiors/    walkable interior shells (Frostbox, dealership, chicken spot, home, bathroom)
jewelry/      display cases, chains, pendants, gems (frostbox_gem_diamond.glb is a sample)
props/        shared street/store props for instancing (lights, trees, chairs, shelves…)
```

## Asset rules
- Licensed for game use only: **CC0**, original, or commercial-use packs.
- No copyrighted/ripped game models; no real car/sneaker logos, real-person
  likenesses, or editorial-only models.
- Export as **GLB** (binary glTF). Prefer **Draco** mesh + **KTX2/Basis** texture
  compression — both are already supported by the loader.
- Keep textures at **1K–2K**, polys reasonable, and provide **LODs** for big props.

## Manifest slot format
A slot value can be:
- `null` — use the procedural fallback.
- `"models/vehicles/car_starter.glb"` — a path string (relative to `public/assets/`).
- `{ "file": "...", "scale": 1, "yOffset": 0, "rotationY": 0 }` — path + transform.
