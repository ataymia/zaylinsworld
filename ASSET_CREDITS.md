# Asset Credits

Zaylin's World uses free, openly-licensed art assets. The procedural characters,
city geometry, signs, and gameplay code are original to this project. Third-party
art packs are listed below.

## Kenney — Retro Urban Kit
- **Source:** https://kenney.nl/assets/retro-urban-kit
- **Author:** Kenney (kenney.nl)
- **License:** Creative Commons Zero (CC0 1.0) — public domain, no attribution required.
- **Used for:** District buildings placed in the city (apartments, bodega, office
  tower, laundromat, garage, row houses) plus street/sidewalk/prop reference models.
- **Location in repo:** `public/assets/models/buildings/urban-kit/`
  (`.gltf` + co-located `.bin` and `.png` textures).
- **Placement config:** `src/config/district.json` (positions/scales/labels),
  loaded by `src/cityKit.js`.

## Kenney — Mini Characters Kit
- **Source:** https://kenney.nl/assets/mini-characters-1
- **Author:** Kenney (kenney.nl)
- **License:** Creative Commons Zero (CC0 1.0) — public domain, no attribution required.
- **Used for:** Modular hair/eyebrow/beard attachments fitted onto the procedural
  avatar (the player and NPCs keep the custom character creator; these glTF hairs
  are optional modular attachments only).
- **Location in repo:** `public/assets/models/characters/mini-kit/`
  (`.gltf` + co-located `.bin` and `.png`).
- **Config:** `HAIR_GLTF` in `src/avatar.js`; loader in `src/hairKit.js`.

---

CC0 assets may be used freely for any purpose. Attribution is not legally required
but is given here as a courtesy and to support Kenney's work. If you enjoy these
assets, consider donating at https://kenney.nl/support.
