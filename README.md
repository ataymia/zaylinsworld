# Zaylen's World

A modern 3D, browser-based open-world kid-city sandbox game built with **Three.js**. Create a
custom avatar with detailed Afrocentric hairstyles, explore a low-poly 3D city, drive a car, talk
to NPCs, and step into fully walkable store interiors — every interaction prompt you see is real
and works.

## Play / local development

It's a 3D web game built with **Three.js + Vite**. Install once, then run the dev server:

```bash
npm install
npm run dev      # opens http://localhost:5173 with hot reload
```

Production build (what gets deployed) and a local preview of it:

```bash
npm run build    # outputs static files to dist/
npm run preview  # serves the built dist/ locally
```

All saves use `localStorage` (with an IndexedDB-ready structure) so progress
persists across reloads during private testing. After the first visit, a service
worker caches the app shell and large assets so repeat loads are fast and the
game keeps working offline.

## Graphics & performance settings

Press **O** (or click the ⚙ button, top-right) to open the graphics menu:

- Presets: **Low · Medium · High · Auto** (defaults to **Auto**, which detects the
  device and picks a safe, smooth tier).
- Fine-tune: shadow quality, render scale, texture quality, view distance,
  NPC density, traffic density, reflection quality, anti-aliasing, effects
  quality, and interior detail.

Settings persist and apply live — drop everything to **Low** on a slow laptop and
the world keeps running.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Mouse | Look (click canvas to lock pointer) |
| `Shift` | Run |
| `Space` | Jump |
| `E` | Interact (enter building, talk to NPC, use a station, leave) |
| `F` | Enter / exit the car |
| `V` | Cycle camera (third-person → first-person → free) |
| `C` | Open wardrobe (in the city) |
| `O` / ⚙ | Open graphics & settings menu |
| `Esc` | Close the current menu |

## What you can do

- **Create your character** — 12 skin tones, 16 Afrocentric hairstyles (afros, fades, locs, twists,
  cornrows, braids, waves, durag, and more), outfits, shoes, accessories, and jewelry.
- **Explore the city** — roads, plazas, detailed buildings, props, traffic, and wandering NPCs.
- **Drive** — get in the car with `F` and cruise the streets (with collision and damage).
- **Enter real interiors** (`E` at a glowing doorway):
  - **Auto Haus** — dealership; walk the floor, view 5 cars, and buy one.
  - **Frostbox** — jewelry store with a custom chain builder and display cases.
  - **Block Supply** — gear shop.
  - **Chicken Spot** — buy chicken, sit and eat (3D eating mini-game), or work a shift for cash.
  - **Zaylen's Home** — sleep to restore energy, open the wardrobe, check your safe, and use the
    bathroom mirror for a hairline clean-up mini-game.
  - **Kicks & Fits** — try on fresh fits.
- **Talk to NPCs** — each store has a character with branching dialogue.
- **Progress & save** — money, stats (energy, hunger, fitness, smarts, hygiene, fun), and owned
  items are tracked and saved to `localStorage`.

## Design principle: no fake prompts

The game uses a central `InteractionManager` that **refuses to register any interactable without a
working handler**. If the HUD tells you to press a key, that interaction is guaranteed to do
something. This is verified by an automated headless-browser test that walks the whole world and
confirms every prompt triggers a real action (76/76 checks passing).

## Project structure

```
index.html        Entry point: HUD, overlay UI, loading screen
src/
  main.js         Bootstrap, game loop, and all interaction wiring
  graphics.js     Graphics/performance settings model (Low/Med/High/Auto)
  settings.js     In-game graphics settings menu UI
  loader.js       Loading screen + per-scene asset preloading
  assets.js       glTF/Draco/KTX2/meshopt loader + HDRI image-based lighting
  manifest.js     Asset-slot resolution + GLB swaps with procedural fallback
  config/
    manifest.json Slot map: which real GLB goes where (drag-and-drop)
  state.js        Game state + save/load (localStorage)
  controls.js     Keyboard/mouse input + camera modes
  interaction.js  Central InteractionManager (no handler -> no prompt)
  world.js        3D city: roads, buildings, props, entrances
  interiors.js    Walkable 3D store interiors + stock data
  npc.js          City NPCs, traffic, and the drivable car
  avatar.js       Avatar + Afrocentric hairstyle builder
  vehicles.js     Procedural vehicle models
  ui.js           HUD, character creator, dialogue, shop, chain builder
public/
  sw.js           Service worker (asset caching / offline)
  assets/         Drop-in GLB models, textures, HDRIs (see models/README.md)
tools/
  make-sample-gem.mjs   Generates the sample CC0 diamond GLB
assets/
  manifest.json   Legacy slot file (kept; live manifest is src/config/manifest.json)
```

## Adding real 3D assets

The glTF pipeline in `assets.js` already supports **Draco / meshopt** mesh
compression and **KTX2 / Basis** texture compression. To upgrade visuals, drop
properly-licensed (CC0 / commercial-use / original) `.glb` files into
`public/assets/models/<category>/` and point the matching slot in
`src/config/manifest.json` at them — the loader swaps the GLB onto the procedural
mesh automatically and falls back (with a one-time console warning) when a slot
is empty or a file fails to load, so the game always runs.

Asset folders (drag-and-drop targets):

```
public/assets/
  models/characters/   player + NPC humanoid avatars (idle/walk clips if available)
  models/hair/         modular Afrocentric hair (afro, waves, locs, fades, braids, cornrows)
  models/vehicles/     cars — wheel meshes named *wheel*/*tire*/*rim* spin automatically
  models/buildings/    exterior shells
  models/interiors/    walkable interior shells
  models/jewelry/      cases, chains, pendants, gems (frostbox_gem_diamond.glb sample)
  models/props/        shared props for instancing
  textures/            1K–2K compressed textures (KTX2/Basis preferred)
  hdr/                 .hdr / .exr environment maps
src/config/manifest.json   the slot map that wires files into the game
```

A sample **original CC0 diamond GLB** is generated by `npm run gen:gem`
(`tools/make-sample-gem.mjs`) and loaded live inside Frostbox, demonstrating the
end-to-end load → PBR → HDRI-reflection pipeline. Keep textures at 1K–2K and use
LODs for big props per the notes in `public/assets/models/README.md`.

### Asset Pack v1 (original CC0, generated)

Run `npm run gen:assets` (`tools/build-assets.mjs`) to regenerate the bundled
**Asset Pack v1** — 17 original, dependency-free, parametric GLBs (no third-party
or branded content) written by the tiny glTF/GLB toolkit in `tools/glb.mjs`:

- **Vehicles:** `car_starter`, `car_sedan`, `car_supercar_01`, `car_hypercar_01`
- **Characters:** `player_avatar`, `npc_basic_01`, `npc_basic_02`, `npc_shopkeeper_frostbox`
- **Hair:** `hair_afro`, `hair_waves`, `hair_locs`, `hair_taper_fade`, `hair_braids`, `hair_cornrows`
- **Jewelry:** `frostbox_display_case`, `frostbox_chain_cuban`, `frostbox_pendant_initial`

They are wired into `src/config/manifest.json` and placed in-game on **static**
objects so nothing loses animation: interior **shopkeepers** become GLB humanoids,
the **dealership showroom** displays GLB cars, and **Frostbox** shows a GLB display
case, cuban chain, iced pendant, and the spinning diamond. The player and walking
city NPCs stay procedural so they keep their animation and full character-creator
customization; the hair GLBs are drop-in ready for avatar attachment.

## Deployment

The build outputs a static `dist/` folder (relative asset paths, so it works on
subpaths):

- **GitHub Pages** — the included workflow (`.github/workflows/deploy.yml`) runs
  `npm ci && npm run build` and publishes `dist/` automatically on push to `main`.
- **Cloudflare Pages** — create a project with **build command** `npm run build`
  and **output directory** `dist`.
- **Large assets later** — move big `.glb`/HDRI files to Cloudflare R2 or another
  CDN and update the URLs in `assets/manifest.json`; the service worker will
  cache them after first load.