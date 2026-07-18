# Starter Town Large-World Preview QA

Preview entry:

```txt
/large-town-preview.html
```

Optional ready-asset hydration:

```txt
/large-town-preview.html?assets=1
```

Optional weather check:

```txt
/large-town-preview.html?weather=rain
```

The preview does not read or write the normal player save. It exists to verify the Phase 2–6 city foundation before functional gameplay locations are relocated in Phase 7.

## Controls

```txt
Click        capture mouse
WASD         move
Q / E        down / up
Shift        speed boost
G            district overlay
T            top-down view
R            reset camera
1 / 2 / 3    low / medium / high graphics
P            copy runtime report
Esc          release mouse
```

---

# QA pass A: boot and isolation

- [ ] Preview loads without entering the normal Character Studio.
- [ ] Preview does not alter the normal game save.
- [ ] Loading screen completes.
- [ ] Preview still enters when an optional model or environment asset fails.
- [ ] Base preview loads without `?assets=1`.
- [ ] Asset-hydrated preview reports placed assets and unresolved placeholders separately.

# QA pass B: scale and geography

- [ ] The city reads as approximately 2,000 × 2,000 playable units.
- [ ] The terrain envelope extends beyond the playable city.
- [ ] All nine district areas are visible with the G overlay.
- [ ] North Fishing Highway approach is visible.
- [ ] East Rich Hills Parkway approach is visible.
- [ ] Dreamdrop Beltway forms the intended outer road identity.
- [ ] Civic Heights is clearly elevated.
- [ ] Northworks remains comparatively flat.
- [ ] Parkside has gentle rolling terrain.
- [ ] Willowbend reads as lower-density residential land.

# QA pass C: roads

- [ ] No major road appears disconnected.
- [ ] Visible road crossings behave as one connected network.
- [ ] Sloped roads follow terrain rather than cutting through it.
- [ ] No road floats far above terrain.
- [ ] No road disappears deeply below terrain.
- [ ] Parkside roundabout is visible and correctly centered.
- [ ] Willowbend cul-de-sacs are visible.
- [ ] Raised school crossings are visible.
- [ ] Gateway approaches include merge/acceleration contracts in the runtime report.
- [ ] Sidewalks and curbs do not cover road lanes.
- [ ] Crosswalks do not float or sink.
- [ ] Guardrails face the road and do not block lanes.
- [ ] Streetlights are spaced consistently.

# QA pass D: districts and massing

- [ ] Dreamdrop District reads as dense mixed-use core.
- [ ] Market Mile reads as continuous retail.
- [ ] Northworks reads as industrial and vehicle-oriented.
- [ ] Scholar’s Quarter reads as campus and neighborhood.
- [ ] Civic Heights reads as formal civic/office terrain.
- [ ] Eastgate reads as travel and roadside services.
- [ ] Parkside reads as open recreation.
- [ ] Willowbend reads as homes and local streets.
- [ ] Westside reads as working neighborhood and walkups.
- [ ] Purposeful empty and future parcels remain open.
- [ ] Building massing sits on terrain.
- [ ] No major building mass blocks an entire arterial.

# QA pass E: assets and placeholders

- [ ] Ready Asset Lab models appear only at their registered locations.
- [ ] A missing asset leaves a clean placeholder rather than an error or invisible gameplay location.
- [ ] Asset scale is plausible compared with roads and parcels.
- [ ] Asset origins do not place buildings underground.
- [ ] Asset placeholders can be distinguished in the runtime report.
- [ ] No asset is duplicated accidentally at one location.

# QA pass F: performance

Run this section on Low, Medium, and High.

- [ ] Stand still for five minutes.
- [ ] Fly across the entire town at normal speed.
- [ ] Fly across the town with Shift boost.
- [ ] Streaming pending-job count eventually settles.
- [ ] FPS does not continuously decline during traversal.
- [ ] Memory does not obviously grow without returning.
- [ ] Low preset remains usable.
- [ ] Auto graphics can step down under sustained poor FPS in the normal game.
- [ ] Runtime report contains FPS, frame time, draw calls, triangles, textures, assets, pools, lifecycle, world, cells, and phase status.
- [ ] Visual audit does not identify an unexpected explosion in shadow casters or unculled meshes.

# QA pass G: boundaries and recovery

- [ ] Flying outside the playable boundary reports clamp/recovery behavior.
- [ ] North gateway corridor is permitted inside the terrain envelope.
- [ ] East gateway corridor is permitted inside the terrain envelope.
- [ ] Other unfinished edges do not imply a valid travel route.
- [ ] Safe recovery points back to Zaylins Home.

# Phase gate

Phase 2–6 live verification passes when:

```txt
The large-town preview loads reliably, reads as the approved city,
contains one connected and terrain-fit road system, stays within the
performance direction of the selected preset, and exposes no skeleton-level
blocker that would make Phase 7 relocation wasteful.
```

After that gate, begin:

```txt
Phase 7A: Shared functional-location relocation and parity framework
```
