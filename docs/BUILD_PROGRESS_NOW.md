# Zaylins live build progress and unfinished-work queue

Audit date: 2026-11-21  
Repository: `ataymia/zaylinsworld`  
Production branch: `main` (direct, narrow reviewed commits per Mia's workflow)  
Baseline: 2026-10-19 merged Harbor visual rebuild, commit `89e0a58475bdbee12ae0fa15d920d1035b4ed370`

## How to read status

- **Implemented:** source and automated guards exist. This is NOT a visual acceptance claim.
- **QA needed:** needs proof in the running WebGL browser build and a real device.
- **Partial:** working subset exists, but required features still absent.
- **Not playable:** planning data or assets exist; do not label the town finished.

The 53 KB master checklist was created before the large-world cutover.
Its many unchecked Phase 2–7 entries are historical and must not be rebuilt
without checking `main`. The August active-phase ledger is also older than
the October Harbor work. This file is the current source-of-truth handoff;
update it after each narrowly scoped code/QA slice.

## Playable world status

| Town | Runtime | Next playable-release blocker |
| --- | --- | --- |
| Starter Town | **Implemented; QA needed** | Real 2,000 × 2,000 drive, saves, interactions, visual parity, performance and police soak acceptance |
| Fishing Harbor | **Partial playable** | Real boat steering/travel, proper business interiors, deeper jobs/school/services and deployed visual QA |
| Rich Hills | Not playable | Create curated town package after Harbor passes acceptance |
| TechTown | Not playable | Distinct technology gameplay and world/city package |
| Casino Strip | Not playable | Age-appropriate arcade/probability systems, safety and complete town |
| Obby Canyon | Not playable | Traversable canyon/parkour systems, school, jobs and recovery |
| Dungeon Outskirts | Not playable | Complete distinct fantasy-town adventure systems |
| Starline City | Not playable | Production/entertainment district and full playable systems |
| Aqualume | Not playable | Underwater locomotion, life support, water route, marine services and save-safe transitions |

*The nine town blueprints and ten image references are design targets, not evidence
of working 3D implementation. A scene that uses crude identical boxes does not
satisfy the approved visual direction.*

## Confirmed existing technical foundations (do not replace)

- [x] Modular avatar and Character Studio; saved appearance; accessory fitting foundation
- [x] Large Starter Town footprint, streaming cells, connected road graph, district coverage
- [x] Starter Town navigation, traffic controls, pedestrians and named scheduled NPCs
- [x] Vehicle driving, repairs, fuel, ownership, Starter Town functional locations
- [x] School subjects/certificate, four career foundations, housing and property desk
- [x] Police wanted system, pursuits and recoveries; crime alternatives need further depth
- [x] Quest/mission, dialogue and save/migration foundations
- [x] Fishing Harbor arrival road, themed exterior assets, piers, traffic, signals and shore
- [x] Fishing skill challenge with moving fish, rod aiming, held/released reel and snap-risk tension, cast/bite timing, market sale/bait and school rod upgrade loop. Automated tests; visual acceptance pending.

These items are source/automated-test implementation statements; device acceptance
is separately required.

## Production patches on November 21, 2026

- [x] `35b9cdf1`: relocate boat-rental *shuttle* arrival to the safe central pier; stop repeated map-marker resets; test the landing, saved-town marker setup and wiring. **Does not implement a drivable rental boat.**
- [x] `f2ff6bb8`: introduce separate west/central/east catch pools, protect rare deep-water fish with a free East Pier permit, check current wanted status before issuing, preserve/sanitize permit data across saves and test the mechanics.
- [ ] Verify both commits in the final target deployment and perform human playtest. CI alone is insufficient.

## November 22 cold-chain integrity patch (source implementation, device QA pending)

- [x] Prevent frozen seafood crates from earning dispatch points or quality bonuses after warming back into the 1–4°C range. The overchill flag is crate-local and clears for the next crate; inspection routing and existing wage/save schema remain intact.
- [x] Add freeze-then-rewarm regression coverage to `check:harbor-market` including score, quality, and per-crate reset.
- [ ] Confirm deployed mouse/touch/keyboard feedback and full GitHub Actions quality gates before marking device acceptance.

## November 22 Harbor cold-chain feedback follow-up (PR validation pending)

- [x] Use the same crate-local `overChilled` state for the canvas crate stamp, thermometer color, and player guidance. A frozen-then-rewarmed crate now stays marked HOLD / INSPECT instead of falsely showing green safe status.
- [x] Add regression assertions for frozen/rewarmed, reset warm crates, ready non-inspection crates, and required visual warning wiring.
- [ ] Run full executable quality gate on the proposed commit; inspect GitHub Actions before merging.
- [ ] Deployed mouse, touch, keyboard, inspection routing, and save/reload acceptance still required. No visual acceptance claimed.

## November 25 expired rental service protection (CI and device QA pending)

- Prevent paid marina service on expired rentals; renewal already restores fuel and hull. Regression covers no charge and normal renewal.
- Deployed interaction acceptance remains outstanding.

## Unfinished product queue in dependency order

### P0. Current two-town runtime reliability

- [ ] Run `npm run check`, `npm run audit:characters`, `npm run audit:assets` on the target head and retain GitHub check evidence.
- [ ] Verify live Harbor travel and the relocated shuttle with an existing save and a fresh save.
- [ ] Test boat rentals, purchases, GLB loading, water travel, dock returns, collision, fuel/repair, and mid-water save/reload.
- [ ] Playtest Dockside Dispatch crate drag/drop, touch cooling and pointer capture, overchill/overheat, timeouts, keyboard controls (C + 1/2/3), wages, daily shift lockout and save/reload.
- [ ] Test Maritime Academy questions, buttons/keyboard, daily lessons, first-pass award, certificates and save/reload.
- [ ] Test Marina Buoy Run authentic buoy loading, B-start at dock, race timer, checkpoint sequence, certificate bonus, replays without duplicate pay and boat-rescue cancellation.
- [ ] Verify West/Central fishing accessible, East permit-required, permit denied under active heat, and permit persists through reload.
- [ ] Playtest fishing aim/reel/tension on mouse, keyboard and touch; confirm fish motion clarity, difficulty, no rapid-space exploit and failure feedback.
- [ ] Validate all functional Starter Town doors, return positions, city roads and police/service routes.
- [ ] Complete deployed 5-minute stationary, 15-minute travel and 60-minute mixed-play stability matrix, including Low/Auto presets.
- [ ] Visual parity: readable signs, correct authentic GLBs, no props in driving lanes or floating/blocked interiors.
- [ ] Validate clean-browser and existing-player save continuity; record and fix reproducible defects.

### P1. Fishing Harbor, a complete second-town gameplay package

- [x] First playable boat slice: rental/purchase, controls, bounds, pier collision, docking, service, emergency water rescue and saved water position using existing Harbor boat GLB. **Device acceptance still required.**
- [x] Marina Buoy Run: six sequential water-safe checkpoints, existing authored buoy GLBs, golden active marker, on-boat timer/prompts, cancellation, best times, daily payouts and Maritime Academy certificate bonus. **Live browser acceptance pending.**
- [ ] Multiple boat types, NPC water traffic, rescue missions and full marine services.
- [ ] Add real player and NPC water routes, buoy safety signals and water-boundary/recovery rules.
- [ ] Provide Harbor civic/retail/residential enterable interiors with functional exit registration; no decorative unreachable playable-block buildings.
- [x] Harbor Catch Market **Dockside Dispatch minigame**: four timed physical crate-handling rounds, independently controlled cold-chain ice chute, 1–4°C safe temperature band, conveyor clock, drag-and-drop handling bays, keyboard alternative, time/quality scoring and wages, daily shift rule and saved career records. **Live acceptance pending.**
- [ ] Add bait-shop restocking, dock work, courier and boat maintenance jobs with distinct actions, pay and progression.
- [x] Maritime Academy Water Safety & Navigation: 8 question bank, 4-question graded lessons, daily attempt policy, first-pass certification/one-time award, stat gains and save migration. **Device QA pending.**
- [ ] Add Maritime Academy advanced navigation/simulator, clinic, local housing, and patrol/restitution/service behavior.
- [ ] Add weather/ambient coastal behavior and curated population using existing Harbor assets.
- [ ] Add local story, missions, town-specific unlocks, water safety and legal/risky alternatives.
- [ ] Pass the full town release standard from `PLAYABLE_TOWN_RELEASE_STANDARD.md`.

### P2. Starter Town polish and mission depth

- [ ] Author/retarget named locomotion and action clips; test clothing/body extremes.
- [ ] Complete optional legal/risky/observer orientation without mandatory assault or mugging.
- [ ] Expand distinct jobs and school subject activities; tighten consequence/repair/civic loops.
- [ ] Resolve visual asset and readable-road acceptance without shrinking/replacing the existing city.
- [ ] Validate every no-fake-prompt interaction and final UI accessibility/controller policy.

### P3. Remaining cities, one independently accepted town at a time

- [ ] Rich Hills
- [ ] TechTown
- [ ] Casino Strip
- [ ] Obby Canyon
- [ ] Dungeon Outskirts
- [ ] Starline City
- [ ] Aqualume

Each must have true local architecture, enterable interiors, roads/travel,
population, school, work, housing, law, quests, save migration, collision and
performance verification. Do not promote an art preview to "playable".

### P4. Whole-world release

- [ ] Cross-town main plot and progression; optional legal and risky pathways
- [ ] Economy, balancing, minigames, visuals, NPC animations and world systems
- [ ] Long-session soak, multi-town memory/saves, rollback and browser compatibility
- [ ] Kid-facing safety, accessibility, asset/license review and launch readiness

## Non-negotiable construction rules

1. Preserve the existing **2,000 × 2,000 playable Starter Town** and working user saves.
2. Use existing authentic model packs and the approved district/map reference art.
3. Every new gameplay prompt must deliver an actual working result.
3a. **Minigames are skill-based playable activities, never spacebar spam or a token quiz**. Require multiple relevant controls and meaningful player decisions, audiovisual feedback, mastery, failure and scoring. Follow the Lineup Lab standard (tool choice, continuous manipulation, skill score); Harbor Market Dockside Dispatch now adds physical crate drag-and-drop, live cold-chain management, timed dispatch and quality scoring. Awaiting device acceptance.
4. Ship one testable system slice per commit and watch the quality/deployment gates.
5. Do not count an untested build, asset inventory record or blueprint as completed gameplay.
6. Use the active `main` history. No PR unless explicitly requested.

## Acceptance references

- `DEPLOYED_ACCEPTANCE_RUNBOOK.md`
- `PLAYABLE_TOWN_RELEASE_STANDARD.md`
- `FISHING_HARBOR_BLUEPRINT.md`
- `WORLD_VISUAL_REFERENCE_BIBLE.md`
- `buildPhaseStatus.js` (historical August ledger, not last production commit)

## November 22 Harbor canceled-shift panel reset (CI and device QA pending)

- [x] Reset Dockside Dispatch round marker and crate coordinates when hiding the panel, preventing stale dragged-crate positions after cancel/restart at the same order index.
- [x] Add lifecycle regression guards to `check:harbor-market` for order marker, crate location, cooling and dragging reset.
- [ ] Confirm executable GitHub Actions gates and deployed cancel/restart on mouse and touch, including pointer capture and fresh/existing saves. No visual acceptance claimed.

## November 22 Harbor interrupted-drag recovery (proposed, device QA pending)

- [x] Abort an active crate drag on canvas `lostpointercapture` without submitting a destination; preserve successful `pointerup` drops and pointer-cancel cleanup.
- [x] Add source-level regression guards for both abort paths, crate position/bay reset, and non-dispatch on lost capture.
- [ ] Confirm CI quality gates, then validate interrupted mouse/touch drags and successful drops in deployed gameplay; existing-save acceptance remains open.

## November 22 Harbor multi-touch crate ownership (branch validation pending)

- [x] Bind crate drag start, movement, release and cancellation to the initiating pointer ID so another finger cannot steal, move, dispatch or abort its crate.
- [x] Clear pointer ownership on successful release, canceled capture, hidden shift and new round; retain the existing keyboard station controls and cold-chain simulation.
- [x] Add pointer-ownership source regression guards to `check:harbor-market`.
- [ ] Run executable quality gates and inspect GitHub Actions before promoting to main; no test success is claimed yet.
- [ ] Real multi-touch device testing: second-finger move/up/cancel, owner drop, lost capture, keyboard alternatives and fresh/existing save continuity.

## November 22 Harbor ice chute multitouch integrity (device QA pending)

- [x] Give the held ice chute its own pointer owner, independent of crate dragging. Unrelated touches cannot release cooling; leaving the button while captured does not stop it.
- [x] Stop cooling on owner release/cancel/capture loss and reset ownership on shift close/new round. Add source regression assertions.
- [ ] Validate simultaneous ice-and-crate touches, browser interruption, keyboard C, and fresh/existing save continuity on real devices. Automated checks do not establish visual acceptance.

## November 23 Harbor ice chute shift lifecycle cleanup (PR validation pending)

- [x] Explicitly release the held ice chute's DOM pointer capture when a shift closes or the order changes, clear cooling ownership, and restore the unpressed button color.
- [x] Update Harbor Market regression guards to check the actual capture release, UI reference, and reset wiring, without changing saved data.
- [ ] Validate GitHub Actions executable gates and real-device cancel/restart, simultaneous touches, keyboard C, and fresh/existing saves before claiming acceptance.


## November 23 Lineup Lab multi-input stability (source QA, deployed QA pending)

- [x] Lineup Lab now uses a single Pointer Events path for mouse, pen and touch, eliminating duplicate touch/pointer cuts. The initiating pointer exclusively controls each stroke, with capture, cancel, capture-loss and window-blur cleanup.
- [x] Add `tools/check-lineup-lab.mjs` and wire `check:lineup-lab` into `npm run check`; guard active pointer ownership, secondary-button rejection, interruption handling, continuous cutting, and script parsing.
- [x] Connector-side source syntax and regression assertions passed. **This does not mean the Node test command or full CI ran.**
- [ ] Inspect GitHub Actions on the new head; run `npm run check` and `npm run check:lineup-lab` in an executable checkout.
- [ ] Device QA: mouse press/move/release, touch draw with a second finger, pen input, pointercancel, tab blur, restart, and result scoring. No visual or save acceptance claimed; no save schema changed.

## November 23 shared gameplay controls focus safety (source implementation; device QA pending)

- [x] Stop gameplay movement, jump, sprint and shortcuts from being triggered by typing in input, textarea, select and contenteditable UI, or modified browser shortcuts.
- [x] Release held keyboard and mouse controls, pending clicks and key edges on browser window blur so returning to the tab cannot resume unintended driving, firing or movement.
- [x] Preserve short key taps until frame consumption; add `tools/check-controls-focus.mjs` behavior tests and include `check:controls-focus` in `npm run check`. No save schema or world geometry changed.
- [ ] Confirm the GitHub Actions Quality Gate on this head, then deployed mouse/keyboard focus, text entry, tab switching while moving/aiming, and clean/existing-save behavior. No device or visual acceptance claimed.

## November 23 Maritime Academy dialog keyboard accessibility (source implementation; QA pending)

- [x] Move focus into the first lesson answer when opening or advancing questions, constrain Tab/Shift+Tab to the answer/exit buttons, and allow Escape to cancel the lesson.
- [x] Restore the previously focused control when the lesson closes if that control remains attached; leave saved academy state, lesson grading, and town geometry unchanged.
- [x] Add source regression guards to the existing `check:marine-academy` test, already included in `npm run check`.
- [ ] Execute `npm run check:marine-academy` and full Quality Gate on the new main head. Source guards have not been executed in this run.
- [ ] Browser/device QA: keyboard Tab wrap, Shift+Tab wrap, Escape, touch/button answer progression, focus restoration after cancellation and completion, fresh/existing saves. No deployed acceptance claimed.

## November 23 world-input handoff safety (source implementation; device QA pending)

- [x] When a keyboard event belongs to an editable control or a modified browser shortcut, immediately release previously held movement, sprint, jump, mouse-fire and pending click/key edges instead of only ignoring the new key. Prevents a player from continuing to walk or fire while typing in an overlay.
- [x] Expand the existing `check:controls-focus` regression with held walking, sprint, firing, queued click, and stale quick-tap cancellation, while retaining ordinary quick-tap and blur behavior. Isolated JavaScript behavioral checks passed for the runtime change; full Node/CI checks are not yet confirmed.
- [ ] Run `npm run check:controls-focus` and full `npm run check` on the current head, then inspect GitHub Actions. Verify typing transitions, Ctrl shortcuts, mouse hold, tab blur, and resumed world controls in deployed keyboard/mouse gameplay with clean and existing saves. No save schema, GLB, or Starter Town geometry changed; no deployed acceptance claimed.

## November 23 Maritime Academy Quality Gate assertion repair

- [x] Retrieved the failed GitHub Actions check job log for run `45233158743`; `npm run check` stopped at `tools/check-marine-academy.mjs:59` because the source assertion expected `event.key==='Tab'` while the working dialog guard correctly uses `event.key!=='Tab'` to return for non-Tab keys.
- [x] Commit `90f2f44359cc707ea806be1ed7cdbd9dde8472f4` corrects the test expectation and adds source guards for forward/reverse focus wrap. No gameplay code, saves, world geometry, or assets changed.
- [ ] Verify fresh GitHub Actions Quality Gate on the updated main head, including character and asset audits; this patch has not yet been confirmed green by CI.
- [ ] Perform deployed keyboard focus and save-continuity QA before marking the Academy dialog accepted.

## November 23 blocked-save boat recovery (CI/device QA pending)

- [x] When an existing save places a moving Harbor boat inside a pier/moored obstruction, normalize its position back to the safe marina dock **and zero its stale speed**. Preserve ownership, occupancy and valid mid-water speed/saves.
- [x] Add regression assertions to the existing `check:harbor-boats` quality gate for obstructed recovery and valid saved motion.
- [ ] Confirm GitHub Actions passes on the new main head; playtest corrupted/legacy save recovery and ordinary mid-water save/reload on a deployed device. No visual acceptance claimed.

## November 23 Lineup Lab replay lifecycle repair (CI/device QA pending)

- [x] Starting Clippers after finishing a haircut now calls the existing reset routine before beginning a new timed attempt, instead of reopening a completed session with the old timer, hair state, and result.
- [x] Added a restart lifecycle source regression assertion to `check:lineup-lab`, already wired into `npm run check`.
- [ ] Run complete GitHub Actions Quality Gate on the latest head; verify Start after Done, time expiry, replay, score/result reset, pointer handling, and game integration on deployed mouse/touch devices. No browser acceptance claimed.

## November 23 Lineup Lab active-stroke lifecycle cleanup (CI/device QA pending)

- [x] Stop and release any active clipper pointer capture on Reset and Done, including completion while the mouse or finger remains held. Prevent stale held strokes from cutting into a newly reset haircut.
- [x] Reject new canvas pointerdown cutting while a completed result is displayed; replay still requires Start Clippers or Try Again.
- [x] Extend `check:lineup-lab` with lifecycle source guards. Connector-side JavaScript parsing and new assertion matches passed; full Node quality gate and deployed browser QA remain unverified.
- [ ] Confirm current-head GitHub Actions and executable `npm run check`, then test held-stroke Reset/Done, secondary touches, replay, scoring and fresh/existing saves on mouse/touch devices.

## November 24 Harbor canonical mooring (PR validation pending)

- Docking now snaps the boat to its canonical marina slip and resets heading and speed before disembarking, so saved mooring matches the next boarding location.
- Added off-center docking and JSON save round-trip regression assertions to check:harbor-boats.
- CI and deployed/device QA pending; no asset or save schema changes.

## November 25 boat boundary save recovery

- Cancel stale velocity when numeric saved boat coordinates are clamped to water bounds; preserve occupancy and valid mid-water momentum. Regression added to harbor boat checks. CI and deployed/device QA pending.
- Docking consistency PR #45 merged after Quality Gate and Runtime Foundation passed; deployed QA remains outstanding.

## November 25 Harbor malformed coordinate recovery

- PR #46 merged after successful Quality Gate and Runtime Foundation checks.
- Missing, nonnumeric or nonfinite saved boat coordinates now cancel stale speed while retaining existing position normalization and occupancy. Added regression cases to check:harbor-boats.
- New CI and deployed/device QA pending.

## November 25 Harbor repeat rescue protection

- Avoid charging another tow fee when the occupied boat is already safely dockable and serviceable; retain assistance for disabled boats and preserve existing saves.
- Add repeat-rescue and disabled-at-marina regression coverage. CI and deployed/device QA pending.
