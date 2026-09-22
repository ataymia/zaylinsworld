# Starter Town deployed acceptance runbook

Use this runbook only on the immutable Cloudflare preview for the exact pull-request
commit being accepted. The build badge in the lower-left corner and
`ZW.commit` must match the PR head before evidence is valid.

Automated repository checks prove contracts and deterministic outcomes. This
runbook supplies the remaining evidence from the actual 2,000 × 2,000 WebGL game.
It does not turn subjective visual or handling judgment into a fake unit test.

## Evidence controls

Open the build panel with **F2**. It shows the current acceptance session and has
buttons to reset or copy evidence and to run the interior cycle.

The same controls are available in the browser console:

```js
ZW.acceptance.start('five-minute-stationary')
ZW.acceptance.mark('note', { text: 'optional observation' })
ZW.acceptance.report()
await ZW.acceptance.copy()
ZW.acceptance.stop('completed')
```

The report is bounded for a 60-minute session and includes:

- build commit, version, start time, and elapsed time;
- average, recent p95, maximum, >33 ms, and >50 ms frame evidence;
- ten-second heap, renderer, population, area, position, wanted, and graphics samples;
- successful and failed saves by area;
- delivered and UI-blocked keyboard input counts;
- graphics preset changes;
- runtime errors and repeated-error counts;
- every interior entry, exit, recovery, failure, and exterior-return distance.

Keep the tab visible during a timed soak. Visibility changes are recorded so a
backgrounded tab cannot masquerade as continuous foreground play.

## 1. Build and save identity

1. Confirm the badge and `ZW.commit` match the PR head.
2. Start from a clean browser profile and create a character.
3. Confirm the starter car, quest journal, cyan guidance route, home deed, and first save.
4. Reload and continue; confirm money, position, quest, vehicle fuel/damage, school,
   career, property, and legal records remain coherent.
5. Repeat from the player's current save. Never erase that save to make a test pass.

Pass evidence: zero save failures, the correct commit, and successful reloads from
both clean and current profiles.

## 2. All twelve interiors

Stand outside in Starter Town, on foot, with zero wanted level. In the F2 panel,
choose **Test interiors**, or run:

```js
await ZW.acceptance.runInteriors({ cycles: 3 })
```

The runner uses the same production enter/leave functions as the real door
interactions. For each room it verifies that exactly one interior is visible,
the correct room owns the lifecycle, the exterior door exists, and the player
returns within 3.5 units. It restores the starting exterior position afterward.

This runner does not replace walking to every door, reading its sign and prompt,
or exercising its NPC and service stations. Those remain part of the manual pass.

Pass evidence: 12/12 completed, no missing entrance, no recovery, no failure, no
unsafe return, and zero runtime errors.

## 3. Geographic and driving pass

Start a `fifteen-minute-cross-city` session and drive these routes without teleporting:

1. Home → Zaylins Prep.
2. Home → WorkTower.
3. Home → Auto Haus.
4. West district → east district.
5. One full Beltway loop.

Record actual elapsed times and any impassable seam, false collision, broken lane,
traffic deadlock, missing sign, unsafe grade, or recovery teleport. Exercise fuel,
damage, repair, exit/re-entry, minimap guidance, and at least one save/reload while
driving.

## 4. Living city and police pass

Observe morning, afternoon, evening, and overnight activity. Confirm the five
scheduled service vehicles and Malik, Maya, Coach Rell, Officer Dane, and Denise
move to their canonical placements without duplicate avatars.

Run 1–5 star pursuits on foot and in a vehicle across at least three districts.
Verify warning/grace time, staffing changes, road routing, hiding, star reduction,
busting, legal clearing, full cleanup, pool reuse, and a stolen active pursuit
cruiser remaining visible and re-enterable after police cleanup.

## 5. Graphics and stability matrix

Run low, medium, high, and Auto separately. For each preset, inspect terrain,
roads, signs, characters, traffic, interiors, shadows, fog, and UI readability.

Complete and copy three named sessions:

1. `five-minute-stationary` in a dense district.
2. `fifteen-minute-cross-city` with driving, interiors, services, and pursuit.
3. `sixty-minute-mixed-play` covering ordinary life, all districts, repeated
   interiors, save/reload, and at least one police encounter.

Review frame spikes in context rather than using average FPS alone. Heap can rise
while assets load or before garbage collection; the release blocker is sustained
growth that does not settle after returning to a comparable low-load area.

## Release decision

Do not merge PR #35 until:

- repository CI and the immutable preview deployment are green;
- the build identity matches the tested PR head;
- all copied sessions have zero unexplained runtime/save/interior failures;
- the route, visual, input, life, service, pursuit, and save matrix passes;
- the 5-, 15-, and 60-minute sessions show no reproducible release blocker;
- Mia accepts both a clean-profile run and her current save.
