# Third-party runtime assets

## Sunbox Games Stylized Customizable Avatar, Male Free

- Creator: Sunbox Games (`sunboxgames`)
- Marketplace: CGTrader
- CGTrader model ID: `3901952`
- Source page: `https://www.cgtrader.com/free-3d-models/character/man/stylized-customizable-avatar-male-free`
- Source license shown at intake: **Royalty Free License (no AI)**
- Intended use: editable player-character base

### Runtime modifications

The original Blender source is not committed to this repository. The runtime version was prepared specifically for Zaylins by:

- retaining the shared armature and modular body/clothing/accessory meshes
- selecting the full face/body morph version of the base body
- renaming nodes into stable Zaylins wardrobe slots
- preserving body, face, blink, viseme and outfit-hide morph targets
- adding explicit head, chest and hand attachment anchors
- exporting to GLB
- applying meshopt and quantization compression
- resizing selected appearance textures to 768px or 384px WebP files
- omitting oversized source normal/specular/gloss maps from the initial browser slice

The game may use and modify these assets as an embedded part of the game. Do not extract or redistribute the runtime files as a standalone character pack.
