# Modular Player Integration

## Current runtime base

The first live modular-player candidate is the Sunbox Games male free avatar. The optimized browser slice contains:

- one shared humanoid armature
- editable body mass, muscle and height
- 18 face sliders exposed in the Character Studio
- blink and viseme-compatible morph targets
- T-shirt and hoodie slots
- jeans and cargo-shorts slots
- basketball-shoe and flip-flop slots
- crew-cut and close-crop hair slots
- beard and goatee slots
- beanie and baseball-cap slots
- pilot and square-glasses slots
- 17 eye textures and four eyelash textures
- hand, head and chest attachment anchors

## Runtime policy

The player model loads lazily when the character studio or live player requests it. The procedural avatar remains visible until the modular model and selected textures finish loading. Failure at any stage keeps the procedural character playable.

The catalog and save format use Zaylins-owned ids rather than source-pack filenames. Future full-pack or Genies Avatar SDK content can therefore map into the same body, face, hair, clothing, accessory and saved-outfit interfaces.

## Visual-proof status

Structural conversion, morph preservation, slot separation and browser compression have been checked. Live in-game appearance, facing, hand grip, clipping, animation feel and camera framing still require deployment and user confirmation before the draft pull request may be merged.
