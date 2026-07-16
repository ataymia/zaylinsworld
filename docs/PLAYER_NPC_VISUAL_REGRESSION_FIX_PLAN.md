# Player and NPC Visual Regression Fix Plan

## Live issues confirmed from deployed screenshot

- Skin tone selection does not visibly update the modular player.
- Character Studio preview is too blurry/pixelated to judge facial morphs and body changes.
- Procedural player chest/collar/clothing pieces remain visible after the modular player loads, causing red and blue artifacts.
- Chain/jewelry visuals are missing from the modular player path.
- Imported NPC bodies are mixing with procedural NPC animation/geometry, producing stretched and misshapen civilians.

## Required fixes

1. Enforce one visible player body at a time. The modular player may replace the procedural body only after it passes loading and bounds validation. When active, every procedural body/clothing mesh must be hidden, while gameplay anchors remain available.
2. Enforce one visible NPC body at a time. Imported NPC skins must not be layered over animated procedural limbs. Failed or rejected imports must leave the complete procedural NPC visible.
3. Apply skin tone through a dedicated modular skin material tint or skin texture mapping that updates live in Character Studio and gameplay.
4. Restore chain and jewelry mounting through named neck/chest anchors without coupling jewelry to the hidden procedural torso.
5. Improve Character Studio preview fidelity using a higher internal render resolution, sharper texture sampling, correct camera framing, and no low-resolution canvas stretching.
6. Add structural checks that reject mixed player visuals, mixed NPC visuals, missing jewelry anchors, and nonfunctional skin-tone updates.

## Acceptance criteria

- No red collar/chest bubbles or blue clothing fragments appear around the modular player.
- Skin swatches visibly produce distinct skin tones in preview and live gameplay.
- Chains and equipped jewelry are visible and remain attached during movement.
- Every civilian is either a complete procedural NPC or a complete imported NPC, never both.
- NPC proportions remain sane during idle and walking.
- Facial features are readable in Character Studio at normal desktop resolution.
- Procedural fallback remains available if the modular GLB fails.
- The branch passes CI and deployed visual review before merge.
