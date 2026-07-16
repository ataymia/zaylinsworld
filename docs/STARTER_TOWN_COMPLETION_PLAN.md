# Starter Town Completion Program

Working branch: `agent/starter-town-completion-v1`

Draft pull request: `#4 Finish Starter Town foundation and character pipeline`

This document is the execution ledger for finishing Starter Town before multi-town expansion. Each slice must remain fallback-safe, pass `npm run check`, and avoid unrelated rewrites of `src/main.js`.

A checked item means the code path and automated validation exist. Visual acceptance items remain explicitly open until Mia tests the deployed branch in the actual game.

## Non-negotiable acceptance rules

- No invisible player, double bodies, giant models, or permanent loading overlays.
- Character assets load by explicit role, never through unrelated store/config imports.
- Procedural characters remain visible until a replacement GLB has loaded and passed validation.
- NPC/traffic density and asset loading remain capped to protect frame rate.
- Every visible interaction prompt has a working handler.
- Starter Town interiors remain enterable and retain clear door/spawn paths.
- New work lands on this branch and reaches `main` through a reviewed pull request.
- `npm run check` must pass before the pull request can leave draft.

## Phase 0: Guardrails

- [x] Create isolated implementation branch.
- [x] Add JavaScript syntax checking.
- [x] Validate relative imports and critical JSON files.
- [x] Validate asset-index paths and critical Starter Town asset groups.
- [x] Add save-state regression tests.
- [x] Add animation, character, conversation, interior, and town-policy regression tests.
- [x] Add CI for agent branches and pull requests.
- [x] Add a real headless-Chrome Starter Town smoke workflow.
- [ ] Confirm every required workflow is green on the final draft-PR head.

## Phase 1: Character pipeline

### 1A. One explicit skin system

- [x] Remove `src/skinRuntime.js` and its indirect import from Block Supply configuration.
- [x] Remove global `THREE.Object3D.prototype.add()` character interception.
- [x] Keep one validated skin adapter in `src/avatarSkin.js`.
- [x] Add explicit player, civilian, and officer call sites.
- [x] Give each role independent debug status and load limits.
- [x] Prevent duplicate skin attempts on avatar rebuilds.

### 1B. Character asset audit

- [x] Generate a machine-readable audit of every indexed character GLB.
- [x] Record file existence, mesh, skin/skinned-node, animation, clip timing/key count, bounds, material, and texture status.
- [x] Classify each asset as `static-prop-only`, `valid-skin-no-clips`, `rigged-with-clips`, `needs-retarget`, or `reject-bad-bounds`.
- [x] Record the result: 88 valid skinned bodies, 0 usable embedded motion clips, 85 pose-only tracks.
- [x] Select approved player, civilian, police, doctor, firefighter, and shopkeeper pools.

### 1C. Role-specific character strategy

- [x] Preserve the procedural player as an emergency fallback until a GLB passes validation.
- [x] Preserve player hair and held-weapon anchors over the approved GLB body.
- [ ] Make player clothing, shoes, body shape, skin tone, jewelry, and accessories fully modular on the GLB body. The current full-body GLB still owns most of those visuals.
- [x] Give civilians varied approved GLBs with a hard live-skin cap of eight.
- [x] Give police approved police GLBs with procedural-uniform fallback.
- [x] Define stable named shopkeeper candidates.
- [ ] Route every existing interior shopkeeper through the new role pool. Existing manifest-driven shopkeepers remain functional meanwhile.
- [x] Stagger character loading so entering the world is never blocked by cosmetic GLBs.

### 1D. Animation adoption

- [x] Reject the 0.033-second bind-pose tracks as unusable locomotion.
- [x] Add lightweight procedural bone animation for GLB idle, walk, and run.
- [x] Apply the hybrid motion path to player, nearby civilians, and police.
- [x] Automatically unregister motion drivers when avatars are removed or rebuilt.
- [x] Cap live-skinned civilians and police for performance.
- [ ] Wire the full `AnimationController` state set for jump/fall, punch, melee, gun hold, shoot, reload, hit/downed, sit, drive, eat, workout, talk, and other authored actions.
- [ ] Add/retarget a real universal motion-clip library. Current GLBs contain no usable clips.
- [ ] Live-approve GLB orientation, proportions, hair seating, and bone motion in the deployed game.

## Phase 2: Asset and performance cleanup

- [x] Generate a complete runtime asset inventory without deleting files.
- [x] Identify missing-index, unindexed, duplicate-index, duplicate-content, oversized, and missing-companion assets.
- [x] Confirm all 588 indexed rows resolve to real runtime files.
- [x] Record exact cleanup candidates and reference-first deletion policy.
- [x] Preserve licensing, credit, texture, `.bin`, and source-companion files.
- [x] Keep Starter Town character loading incremental and capped.
- [ ] Optimize oversized GLBs and textures in a dedicated asset-optimization branch after visual acceptance.
- [ ] Repair or exclude the four unindexed glTF files with missing external companions.
- [ ] Clean duplicate generated index rows in the organizer/index-generation scripts.

## Phase 3: Starter Town finish pass

### Block Supply

- [x] Spread wall-mounted stock across registered back, left, and safe right-wall structures.
- [x] Keep the floor and centered doorway lane clear.
- [x] Remove per-item display blocks and permanent price/owned labels.
- [x] Preserve the existing hover/interact purchase flow.
- [x] Test future wrapped rows against room and floor bounds.
- [ ] Live-approve spacing and orientation from the player camera.

### School

- [x] Use the classroom asset pack.
- [x] Verify classroom rows, teacher spawn, study station, and room-bound positions structurally.
- [x] Preserve clear entrance and walking paths.
- [x] Live visual approval received for the classroom furnishing pass.

### Police Station

- [x] Prevent nested dialogue from instantly closing.
- [x] Replace shallow one-click responses with controllable conversation trees.
- [x] Preserve the original legal-fee, heat, cell-inspection, and evidence-tampering callbacks.
- [x] Add stable academy, evidence-release, visitation, booking, and response-system event hooks.
- [ ] Connect those event hooks to complete academy, visitation, booking, evidence-recovery, and report missions.
- [ ] Live-approve conversation pacing and wording.

### Chicken Spot

- [x] Audit for dedicated fryer assets and record that they are not currently present.
- [x] Remove bakery/pizza-style stove and burner assets from Chicken Spot.
- [x] Add a lightweight stainless double fryer, single fryer, baskets, splash guards, and drain rack.
- [x] Snap the cooking-chicken prop to the fryer support surface.
- [x] Preserve counters, booths, register, ordering, eating, and work-shift registrations.
- [ ] Replace the procedural fryer line with dedicated licensed fryer GLBs when supplied.
- [ ] Live-approve fryer scale, placement, and material appearance.

### Whole-town regression

- [x] Add automated structural tests for school, police, Chicken Spot, and Block Supply.
- [x] Add automated save migration and town-identity tests.
- [x] Add a real-browser boot/enter-world/character-pipeline smoke test.
- [ ] Live-verify every entrance and exit.
- [ ] Live-verify player, NPCs, police, traffic, weapons, vehicles, jobs, shops, school, home, and save/load.
- [ ] Live-verify Low, Medium, High, and Auto graphics presets.
- [x] Record a Starter Town release checklist and known deferrals.

## Phase 4: Multi-town readiness

- [x] Create a formal town registry/config boundary.
- [x] Register Starter Town with center, bounds, spawn, landmarks, traffic, pedestrians, and service coverage.
- [x] Separate shared service categories from Starter Town-specific locations.
- [x] Persist `townId` and town load-state data with legacy-save migration.
- [x] Add pure active/warm/unloaded distance policy, hysteresis, and runtime budgets.
- [ ] Wire the policy into actual world chunk construction and disposal. Starter Town remains always live in the current one-town engine.
- [ ] Build one second-town vertical slice only after Starter Town passes live visual and gameplay acceptance.

## Deferred, not forgotten

- Full mission consequences and persistent NPC memory across all authored conversations.
- Retargeted universal character animation library.
- Fully modular creator-driven GLB body, skin, clothes, shoes, jewelry, and accessories.
- Cloud/CDN migration and binary optimization for the largest runtime assets.
- Expanded monster/creature pools.
- Actual multi-town chunk construction and the first second-town vertical slice.
