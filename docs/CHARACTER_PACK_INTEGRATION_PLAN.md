# Character Pack Integration Plan

## Non-negotiable player requirement

The playable character must remain editable. The character creator must control, at minimum:

- base/body
- skin tone
- face
- height and body shape
- hair style and hair color
- top
- bottoms
- shoes
- accessories
- jewelry
- held-item attachment points

A complete pre-clothed character mesh may not replace the player creator unless the asset is split into compatible modular parts on one standardized skeleton.

## Role lanes

### Player lane: modular only

Acceptable player assets must provide either:

1. a clean base body in T-pose/A-pose plus separate clothing/hair meshes, or
2. multiple interchangeable parts sharing the exact same skeleton, bind pose, scale, and attachment conventions.

A full-body character with baked clothing is not a player base. It may be used as an NPC.

### NPC and job-role lane: complete characters allowed

Complete pre-clothed character models are suitable for:

- civilians
- police
- doctors
- firefighters
- chefs and restaurant employees
- shop workers
- mission characters
- monsters/creatures in their separate pipeline

These models still require bounds, origin, facing, skeleton, animation, material, and performance validation.

## Pack assessments

### Elbolilloduro Characters PSX

Source: https://elbolilloduro.itch.io/characters-psx

- Already present in the repository as `characters/psx`.
- Current audit: 79 indexed files, all skinned, each with one generic embedded animation clip.
- Good for capped civilians, police, doctors, firefighters, hazmat workers, mission characters, and monsters.
- Not modular enough to become the editable player architecture without significant Blender rework.
- Known source cleanup concerns include inconsistent origins, facing, scale, and bind/rest poses. Runtime normalization and procedural fallback remain mandatory.

### TawusGames AI Generated Character Pack 2

Source: https://tawusgames.itch.io/ai-generated-character-pack-2

- Four complete human characters: two men and two women.
- Advertised as rigged and textured.
- Approximately 20k faces per model with 2048 textures/AO maps.
- Suitable for named NPCs or close-up mission characters after optimization and license-file preservation.
- Not assumed modular. Do not use as a player base unless downloaded source files prove that body, clothes, and hair are separate compatible meshes.
- Performance plan: reduce texture size, inspect material count, compress GLB, and avoid populating crowds with these heavier models.

### TawusGames AI Generated 3D Character Pack

Source: https://tawusgames.itch.io/ai-generated

- Download listing contains a lion and a cat, not human creator bases.
- Possible future animal/creature use.
- Not part of the player character pipeline.

### Wizard Hat Studio Kitchen Chefs

Source: https://wizardhatstudio.itch.io/kitchen-chefs

- Candidate for Chicken Spot staff or future restaurant NPCs.
- Page/file metadata could not be inspected reliably during the web review.
- Do not integrate until the downloaded archive is uploaded and audited for format, license, skeleton, clips, polycount, textures, and source-part modularity.

## Required intake process for every new pack

1. Preserve the pack license/readme next to the source archive record.
2. Keep raw download files outside the runtime `public` tree.
3. Run an intake audit before conversion:
   - formats
   - mesh names
   - separate versus baked clothing
   - skeleton/bones
   - bind/rest pose
   - animation clips
   - origins and facing
   - source dimensions
   - triangles/faces
   - textures and material count
4. Classify each model as:
   - modular-player-compatible
   - NPC complete character
   - job/role NPC
   - creature/animal
   - reject or Blender-rework-required
5. Convert only approved runtime models to GLB.
6. Optimize textures and geometry before adding to the runtime index.
7. Test one model in live play before importing the whole pack.
8. Keep procedural fallback for every asynchronous character load.

## Recommended next asset request

For the player creator, prioritize packs explicitly marketed as:

- modular character system
- base characters
- interchangeable outfits
- shared humanoid skeleton
- separate hair/clothing meshes
- T-pose or A-pose source files

The visual style must be compatible across body, clothing, and hair packs. A beautiful complete character is still an NPC if its clothes are welded to its body.
