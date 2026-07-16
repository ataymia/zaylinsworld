# Starter Town Completion Program

Working branch: `agent/starter-town-completion-v1`

This document is the execution ledger for finishing Starter Town before multi-town expansion. Each slice must remain fallback-safe, pass `npm run check`, and avoid unrelated rewrites of `src/main.js`.

## Non-negotiable acceptance rules

- No invisible player, double bodies, giant models, or permanent loading overlays.
- Character assets load by explicit role, never through unrelated store/config imports.
- Procedural characters remain visible until a replacement GLB has loaded and passed validation.
- NPC/traffic density and asset loading remain capped to protect frame rate.
- Every visible interaction prompt has a working handler.
- Starter Town interiors remain enterable and retain clear door/spawn paths.
- New work lands on this branch and reaches `main` through a reviewed pull request.
- `npm run check` must pass before a slice is considered complete.

## Phase 0: Guardrails

- [x] Create isolated implementation branch.
- [x] Add JavaScript syntax checking.
- [x] Validate relative imports and critical JSON files.
- [x] Validate asset-index paths and critical Starter Town asset groups.
- [x] Add save-state regression tests.
- [x] Add animation-state-machine regression tests.
- [x] Add CI for agent branches and pull requests.
- [ ] Confirm CI is green on the draft pull request.

## Phase 1: Character pipeline

### 1A. One explicit skin system

- [ ] Remove `src/skinRuntime.js` and its indirect import from Block Supply configuration.
- [ ] Remove global `THREE.Object3D.prototype.add()` character interception.
- [ ] Keep one validated skin adapter in `src/avatarSkin.js`.
- [ ] Add explicit player, civilian, and officer call sites.
- [ ] Give each role independent debug status and load limits.
- [ ] Prevent duplicate skin attempts on avatar rebuilds.

### 1B. Character asset audit

- [ ] Generate a machine-readable audit of every indexed character GLB.
- [ ] Record mesh, skin, skeleton, animation, clip-name, bounds, and texture status.
- [ ] Classify each asset as `static-prop-only`, `valid-skin-no-clips`, `rigged-with-clips`, `needs-retarget`, or `reject-bad-bounds`.
- [ ] Select approved player, civilian, police, worker, and shopkeeper pools.

### 1C. Role-specific character strategy

- [ ] Player keeps creator-driven skin tone, hair, clothing, shoes, accessories, and weapon anchors.
- [ ] Civilians use varied approved GLBs with a distance/count cap.
- [ ] Police use approved police GLBs with procedural-uniform fallback.
- [ ] Shopkeepers use stable named appearances.
- [ ] Character loading is staggered and never blocks entering the world.

### 1D. Animation adoption

- [ ] Wire `AnimationController` to the player first.
- [ ] Support idle, walk, run, jump/fall, punch, melee, gun hold, shoot, reload, hit/downed, sit, and drive.
- [ ] Use procedural animation when a GLB clip is unavailable.
- [ ] Roll the controller to nearby NPCs and police only after the player passes testing.
- [ ] Cap active mixers and disable distant skinning/animation.

## Phase 2: Asset and performance cleanup

- [ ] Generate a complete asset inventory without deleting files.
- [ ] Identify unindexed, orphaned, duplicate, and oversized assets.
- [ ] Verify references before any deletion or move.
- [ ] Add geometry/texture optimization recommendations and scripts where safe.
- [ ] Preserve licensing/credit files and companion `.bin`/texture files.
- [ ] Keep Starter Town initial loading incremental.

## Phase 3: Starter Town finish pass

### Block Supply

- [ ] Spread wall-mounted stock across registered wall structures.
- [ ] Keep floor clear and remove per-item display blocks/always-on labels.
- [ ] Preserve hover/interact purchase flow.

### School

- [x] Use the classroom asset pack.
- [ ] Verify desk interaction positions and clear walking paths.

### Police Station

- [x] Prevent nested dialogue from instantly closing.
- [ ] Replace shallow one-click responses with controllable conversation trees.
- [ ] Add academy/evidence/holding-cell progression hooks.

### Chicken Spot

- [ ] Replace bakery/stove visuals with fryer-specific equipment when available.
- [ ] Keep counters, booths, register, eating, and work-shift interactions functional.

### Whole-town regression

- [ ] Verify every entrance and exit.
- [ ] Verify player, NPCs, police, traffic, weapons, vehicles, jobs, shops, school, home, and save/load.
- [ ] Verify Low/Medium/High graphics presets.
- [ ] Record a Starter Town release checklist and known deferrals.

## Phase 4: Multi-town readiness

- [ ] Create a formal town registry/config boundary.
- [ ] Separate shared town services from Starter Town-specific content.
- [ ] Add distance/chunk-based town loading.
- [ ] Build one second-town vertical slice only after Starter Town is stable.

## Deferred, not forgotten

- Full authored NPC conversations with branching choices, memory, missions, and consequences.
- Retargeted universal character animation library.
- Cloud/CDN migration for the largest runtime assets.
- Expanded monster/creature pools.
- Additional towns and regional systems.
