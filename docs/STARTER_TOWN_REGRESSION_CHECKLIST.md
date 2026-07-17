# Starter Town Live Regression Checklist

Run this checklist on the deployed draft branch before PR #5 is eligible to merge.

## Character Studio

- [ ] Creator opens without a blank preview or JavaScript error.
- [ ] Modular male base loads; procedural fallback stays visible until it is ready.
- [ ] Drag rotates the character and mouse wheel zooms without scrolling the page.
- [ ] Height, body build, muscle, nail and all face sliders visibly change the model.
- [ ] Skin tone, 17 eye choices and four eyelash choices apply correctly.
- [ ] Both hairstyles, beard, goatee, hats and glasses toggle without duplicate meshes.
- [ ] T-shirt/hoodie, jeans/shorts and both shoe slots swap cleanly.
- [ ] Texture/color variants update without flashing white or losing materials.
- [ ] Randomize, Undo and Reset Category behave predictably.
- [ ] Named looks save, reload, equip and delete after a page refresh.
- [ ] Old saves migrate without losing money, stats, inventory or mission progress.

## Live Player

- [ ] The same saved appearance is used after entering Starter Town.
- [ ] Model height is human-scale and feet sit on the ground.
- [ ] Character faces the movement direction rather than backward or sideways.
- [ ] Idle/walk/run limb motion bends the expected imported bones.
- [ ] Hair, clothing and body do not visibly separate during movement.
- [ ] Held weapon attaches to the right hand with acceptable grip and orientation.
- [ ] Entering/exiting vehicles hides and restores the player correctly.
- [ ] A failed modular load leaves the procedural player fully playable.
- [ ] No increasing memory/mixer count after repeated creator visits or respawns.

## Civilians and Police

- [ ] Civilian GLBs appear gradually without a large loading freeze.
- [ ] Civilian cap remains enforced.
- [ ] Police use police-character assets and retain procedural fallback.
- [ ] NPCs, police and player never exchange role assets accidentally.
- [ ] Wanted-level pursuit, collisions, robbery witnesses and despawn still work.

## Interiors

- [ ] School remains furnished with classroom assets and all paths are walkable.
- [ ] Block Supply pistols and long weapons occupy the back wall.
- [ ] Block Supply ammo occupies the left wall.
- [ ] Block Supply melee/tools and upgrades occupy the right wall.
- [ ] Featured weapons remain on the central/front fixture.
- [ ] No floating dark display plates or inaccessible shop interaction points.
- [ ] Chicken Spot contains a fryer bank and hood, not stove/griddle props.
- [ ] Chicken Spot counter, heat lamp, sink, shelf, booths and tables load correctly.
- [ ] Food props rest on counters/tables/fryer area rather than floating.
- [ ] Home closet opens the rebuilt Character Studio.
- [ ] Kicks & Fits wardrobe station opens the same appearance system.
- [ ] Gym, office, garage and 6twelve remain walkable.

## Police Station

- [ ] Front desk accurately reports current wanted stars.
- [ ] Paying the legal fee removes one star and deducts the correct money.
- [ ] Insufficient money keeps the dialogue open with a clear message.
- [ ] Academy, holding-cell and evidence-locker dialogue branches return cleanly.
- [ ] Parked cruisers remain drivable/stealable and apply the intended wanted penalty.

## Core Town Systems

- [ ] Spawn, walking, sprinting, camera and collisions work.
- [ ] Default car, traffic cars, fuel, damage, repair and refueling work.
- [ ] Trash pickup, sanitation jobs and dumpster deposit work.
- [ ] Food purchase/eating and Chicken Spot work shift still function.
- [ ] Shops deduct money, mark ownership and persist after refresh.
- [ ] HUD stats, time, location, job, wanted stars and notifications update.
- [ ] Minimap markers remain present for key Starter Town locations.
- [ ] No new console errors, failed required assets or severe frame-time spikes.

## Automated gate

Before live testing, confirm:

```bash
npm run check
npm run audit:characters
npm run audit:assets
```

Record screenshots or notes for every failed visual item. Structural CI success does not count as visual approval.
