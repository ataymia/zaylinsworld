# Player and NPC Visual Regression Fix Plan

## Live issues confirmed from deployed screenshot and playtest

- Skin tone selection does not visibly update the modular player.
- Character Studio preview is too blurry/pixelated to judge facial morphs and body changes.
- Procedural player chest/collar/clothing pieces remain visible after the modular player loads, causing red and blue artifacts.
- Chain/jewelry visuals are missing from the modular player path.
- Imported NPC bodies are mixing with procedural NPC animation/geometry, producing stretched and misshapen civilians.
- Legacy and incomplete NPC visuals remain in the population despite a large available character library.
- The game becomes noticeably laggy after the modular player and imported NPC passes run.
- The existing uploaded glTF hairstyles are missing from the modular creator.
- Player height must remain continuously adjustable and correctly grounded.

## Required fixes

1. Enforce one visible player body at a time. The modular player may replace the procedural body only after it passes loading and bounds validation. When active, every procedural body/clothing mesh must be hidden, while gameplay anchors remain available.
2. Enforce one visible NPC body at a time. Imported NPC skins must not be layered over animated procedural limbs. Until imported rigs have retargeted locomotion and visual approval, use the complete functional procedural population rather than distorted hybrids.
3. Apply skin tone through a dedicated modular skin material tint or skin texture mapping that updates live in Character Studio and gameplay. Texture loading must finish before the final tint is applied.
4. Restore chain and jewelry mounting through named neck/chest anchors without coupling jewelry to the hidden procedural torso or removing the Frostbox chain-builder gameplay.
5. Restore existing uploaded glTF hairstyles through the canonical head anchor, with per-style fit metadata and the existing hair-color palette.
6. Preserve a continuous player-height slider, normalize the modular body to the selected height, and re-ground the feet after each change.
7. Improve Character Studio preview fidelity using supersampling, sharper texture filtering, close-up face framing, and no low-resolution canvas stretching.
8. Reduce lag by preventing duplicate creator avatars, serializing preview updates, limiting the Character Studio preview to 30 FPS, removing unapproved imported NPC mixers, and enforcing one visible body per character.
9. Add structural checks that reject mixed player visuals, live distorted NPC imports, missing jewelry anchors, missing legacy-hair compatibility, incorrect skin-tint ordering, and lost height controls.

## Acceptance criteria

- No red collar/chest bubbles or blue clothing fragments appear around the modular player.
- Skin swatches visibly produce distinct skin tones in preview and live gameplay.
- Chains and equipped jewelry are visible and remain attached during movement.
- Existing uploaded asset hairstyles appear in the Hair tab, fit the modular head, and move with it.
- Height changes are visible, saved, and keep the player’s feet on the ground.
- Every civilian is one complete functional character, never a procedural/imported hybrid.
- NPC proportions remain sane during idle and walking.
- Facial features are readable in Character Studio at normal desktop resolution.
- Character Studio slider use and open-world play no longer cause the severe lag reported in this playtest.
- Procedural fallback remains available if the modular GLB fails.
- The chain builder remains usable.
- The branch passes CI and deployed visual review before merge.
