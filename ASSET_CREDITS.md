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

## Kenney — Car Kit (3.1)
- **Source:** https://kenney.nl/assets/car-kit
- **Author:** Kenney (kenney.nl)
- **License:** Creative Commons Zero (CC0 1.0) — public domain, no attribution required.
- **Used for:** Drivable / traffic / dealership vehicles (sedan, suv, taxi, police,
  van, truck, race, hatchback-sports, delivery, etc.) with separate wheel nodes for
  rolling animation, plus debris/cone props.
- **Location in repo:** `public/assets/models/vehicles/car-kit/` (self-contained
  `.glb`). Indexed in `public/assets/models/kits-index.json` (`car-kit`).

## ambientCG — PBR Materials (Metal & Marble)
- **Source:** https://ambientcg.com (Metal007, Metal048A, Metal049A, Marble021)
- **Author:** ambientCG (Lennart Demes)
- **License:** Creative Commons Zero (CC0 1.0) — public domain, no attribution required.
- **Used for:** Jewelry/chain material generation (gold, silver, brass, marble
  display). Currently staged for integration.
- **Location in repo:** `public/assets/textures/materials/<id>/` — web-downscaled
  1K maps (`color`, `roughness`, `metalness`, `normal` (GL), `height`). Full-res
  source archives are kept out of git (see `.gitignore`).
- **Config:** `src/config/materials.json`. Re-process with `node tools/process-materials.mjs`.

---

CC0 assets may be used freely for any purpose. Attribution is not legally required
but is given here as a courtesy and to support Kenney's and ambientCG's work. If you
enjoy these assets, consider supporting https://kenney.nl/support and https://ambientcg.com.
