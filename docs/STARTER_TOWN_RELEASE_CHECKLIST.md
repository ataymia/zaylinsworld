# Starter Town Release Checklist

This checklist separates automated proof from live visual/gameplay acceptance. A green build proves the code starts and the tested contracts hold. It does not prove that a hairstyle sits beautifully, a wall display feels balanced, or a fryer looks convincing from the player camera.

## Automated gates

All of the following must pass on the final pull-request head:

- [ ] Project integrity check
- [ ] JavaScript regression suite
- [ ] Production Vite build
- [ ] Starter Town headless-Chrome boot and enter-world smoke
- [ ] Character asset audit
- [ ] Runtime asset inventory

## Character and performance acceptance

- [ ] Player visibly changes from the old procedural body after entering the world.
- [ ] Player is not invisible, doubled, giant, miniature, sideways, underground, or floating.
- [ ] Selected hair remains attached to the player and does not cover the face or float above the scalp.
- [ ] Held weapons still attach to the correct hand after the GLB body loads.
- [ ] At least several nearby civilians visibly use varied approved character bodies.
- [ ] Civilians animate while walking rather than sliding in a frozen pose.
- [ ] Police use police-uniform bodies and animate during pursuit.
- [ ] Excess/distant civilians remain procedural rather than loading every GLB at once.
- [ ] Entering Starter Town becomes playable before cosmetic character streaming completes.
- [ ] No noticeable new lag spike, stutter loop, or memory spiral from the character pass.
- [ ] `window.__ZW_SKIN_STATUS__` shows a completed player attempt and capped civilian activity.

## Block Supply acceptance

- [ ] All visible stock is attached to a registered wall.
- [ ] Pistols use the left rear wall.
- [ ] Long weapons use the back wall with readable spacing.
- [ ] Melee/tools use the left front wall without floating.
- [ ] Featured/heavy items stay off the floor.
- [ ] Ammo on the right wall does not block the centered entrance.
- [ ] Upgrade rows remain above floor level.
- [ ] No permanent price, category, or owned-item labels clutter the room.
- [ ] Hover/interact buying still works for representative pistol, long gun, melee, ammo, and upgrade items.

## School acceptance

- [x] Classroom visually uses school assets rather than kitchen/dining furniture.
- [ ] Player can enter and exit without collision traps.
- [ ] Player can reach and use the study interaction.
- [ ] Desk rows, teacher area, lockers, and shelving leave reasonable walking aisles.

## Police Station acceptance

- [ ] Front-desk conversation remains open through multiple controlled choices.
- [ ] Academy branches cover training, applications, prerequisites, and career paths.
- [ ] Wanted/heat and legal-fee choice still performs its original gameplay action.
- [ ] Holding-cell conversation includes booking, visitation, inspection, and return choices.
- [ ] Evidence conversation includes tracking, release, security, and the original risky lock action.
- [ ] Conversation wording feels appropriate for the game's audience and does not become a wall of text.
- [ ] Player can enter and exit the station without getting stuck.

## Chicken Spot acceptance

- [ ] Kitchen reads as a fried-chicken operation, not a bakery or pizza restaurant.
- [ ] Double fryer, single fryer, baskets, splash guards, and drain rack are grounded and correctly scaled.
- [ ] Cooking-chicken prop rests on the fryer area rather than floating.
- [ ] Counter, register, heat lamp, booths, tables, and chairs remain correctly placed.
- [ ] Ordering works.
- [ ] Eating works.
- [ ] Work shift works.
- [ ] Player can enter and exit without collision traps.

## Whole-town gameplay acceptance

- [ ] Home: enter, exit, sleep, wardrobe, safe, bathroom/lineup interaction.
- [ ] Auto Haus: enter, exit, view and purchase representative vehicle.
- [ ] Frostbox: enter, exit, chain builder and purchase flow.
- [ ] Kicks & Fits: enter, exit, wardrobe/fit flow.
- [ ] Gym: enter, exit, workout interactions.
- [ ] School: enter, exit, study.
- [ ] Office: enter, exit, work interaction.
- [ ] Block Supply: enter, exit, inspect and buy.
- [ ] Chicken Spot: enter, exit, order, eat, work.
- [ ] Police Station: enter, exit, front desk, cells, academy, evidence.
- [ ] Gas station: refuel works.
- [ ] Garage: repair/tow behavior remains functional.
- [ ] City NPC conversations still open and close correctly.
- [ ] Traffic moves, stops, recovers from jams, and remains stealable where intended.
- [ ] Player vehicle driving, fuel, damage, exit, and re-entry work.
- [ ] Wanted stars, police dispatch, chase, hiding, busting, and heat work.
- [ ] Ranged and melee weapons equip and function.
- [ ] Save, reload, and legacy-save migration preserve progress.
- [ ] Minimap, prompts, HUD, notifications, and mission tracker remain visible and accurate.

## Graphics and device acceptance

- [ ] Auto preset selects a playable configuration.
- [ ] Low preset remains readable and responsive.
- [ ] Medium preset remains responsive.
- [ ] High preset remains responsive on the target work/test computer.
- [ ] Changing NPC and traffic density does not duplicate actors or break interactions.
- [ ] Returning from an interior does not progressively reduce frame rate.
- [ ] Rebuilding the player through wardrobe does not leak duplicate motion drivers or skins.

## Known deferrals after Starter Town approval

- Full modular GLB player customization for clothing, shoes, skin tone, body shape, jewelry, and accessories.
- Retargeted real idle/walk/run/action animation clips.
- Complete academy enrollment, booking, visitation, evidence-recovery, and report missions.
- Dedicated licensed Chicken Spot fryer GLBs.
- Binary/texture optimization of oversized runtime assets.
- Duplicate-index cleanup in asset-generation scripts.
- Actual multi-town chunk construction and disposal.
- First second-town vertical slice.

## Release decision

- [ ] Automated gates green.
- [ ] Mia completes the live acceptance pass.
- [ ] Any blocker found during live testing is fixed or explicitly deferred with a reason.
- [ ] Draft PR is marked ready.
- [ ] PR is reviewed and merged into `main`.
