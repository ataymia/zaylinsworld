# Character Asset Audit Summary

Generated and validated through `npm run audit:characters` on the `agent/starter-town-finish` branch.

## Inventory

| Pack | Files | Approx. runtime size | Result |
|---|---:|---:|---|
| `characters/psx` | 79 | 33.1 MB | All have a glTF skin and one animation clip |
| `characters/people` | 6 | 1.0 MB | All have a glTF skin and one animation clip |
| `characters/spooky` | 2 | 2.9 MB | Skinned, no animation clips |
| `characters/creatures` | 1 | 1.2 MB | Skinned, no animation clips |
| **Total** | **88** | **38.2 MB** | **85 rigged-with-clips, 3 valid-skin-no-clips** |

No indexed character file was missing, malformed, or meshless during the audit.

## Animation finding

All 85 animated character assets expose exactly one clip named `mixamo.com`.

This is sufficient to prove that the assets are rigged and can be played through an `AnimationMixer`, but it is not sufficient to drive the full animation state machine by named states. The current state machine expects logical aliases such as `idle`, `walk`, `run`, `jump`, `talk`, `shoot`, and `reload`.

## Runtime policy for Starter Town

### Player

- Keep the procedural/customizable avatar as the guaranteed base.
- A full-body GLB player skin remains an experimental visual layer, not the final creator architecture.
- Do not remove creator skin tone, hair, outfit, body, height, shoes, jewelry, or weapon anchors to force a static GLB body.
- Never hide the procedural player until the replacement passes bounds validation and has been attached successfully.

### Civilians

- Apply real GLB skins explicitly after city NPC creation.
- Cap the live GLB civilian pass at 12 characters.
- Excess or failed characters remain procedural.
- Do not use a global `THREE.Object3D.prototype.add()` character hook.

### Police

- Use the dedicated PSX police pool through `applyCopSkin` at officer spawn.
- Keep the procedural uniformed officer visible on any load or validation failure.

### Monsters

- Keep separate from the civilian/player pipeline.
- Expand monster candidates only after the core humanoid pipeline is stable.

## Animation adoption decision

Do not pretend the current single generic clip provides a complete animation library.

The safe sequence is:

1. Prove player, civilian, and police meshes load visibly with procedural fallback.
2. Audit the contents/duration of the generic `mixamo.com` clip in live play.
3. Add or retarget a named clip set for `idle`, `walk`, and `run` first.
4. Wire the animation state machine to the player only.
5. Expand to capped nearby NPCs and police after player locomotion passes regression testing.

## Tooling

Run:

```bash
npm run audit:characters
```

The command writes:

- `artifacts/CHARACTER_ASSET_AUDIT.md`
- `artifacts/character-asset-audit.json`

The CI quality workflow uploads both files as the `character-asset-audit` artifact.
