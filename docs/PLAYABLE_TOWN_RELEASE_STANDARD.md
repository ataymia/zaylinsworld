# Playable Town Release Standard

A town is **not finished** when colored terrain, labeled boxes, or functioning waypoints render. Starter Town is the visual and systems reference. Its services, production GLB architecture, pedestrian/vehicle schedules, collision enforcement, interactables, interiors, and save/test discipline must be respected in every town.

## Mandatory before a town may be labeled complete

1. **Blueprint identity**: every planned district has its own landscape, road hierarchy, landmarks, skyline, businesses, housing and ordinary neighborhood filler. Avoid cloning a single grid.
2. **Real assets**: inspect the repo's generated GLB catalog before authoring geometry. Place appropriate building exteriors and context props by stable IDs/paths; log production loads and failures. No all-procedural boxes standing in for available buildings.
3. **Waterfront geography where required**: large visible shoreline/ocean, coherent land/water elevations, piers that meet land, boat lanes, safe dry traffic roads, navigational and safety cues.
4. **Road QA**: intersections merge visibly rather than flashing/z-fighting. Every sign, roadside prop, static building, tree, rock and collider is checked against *all* road footprints with a size-based margin. No invisible road blockages. Verify sidewalks, crosswalks, traffic lights and pole positions.
5. **Live population**: purposeful resident/employee/student walking routes; traffic obeying local lights/signs, police/emergency presence and services. All uses town-local systems, LOD and schedules.
6. **Progression and jobs**: thematic minigames, meaningful work, economy, schooling/training, property/housing, clinic, law/permit services, fuel/mobility and a reason to return. No dummy E prompts or decorative-only career claims.
7. **Travel and discovery**: short, nonempty connected corridors, readable compact map while traveling, click town to set route; detailed town navigation unlocks on physical visit, then stays available. Avoid arbitrary 3–5 minute empty highways.
8. **Save compatibility**: don't reset Starter Town or user saves. Any coordinate changes require deterministic one-way migration, car recovery, and regression tests.
9. **Performance**: use bounded asynchronous asset hydration, reuse cached GLBs/materials, instancing for repetitive visual filler, region-distance updates for NPCs and physics.
10. **Release acceptance**: static data checks, route graph reachability, full npm quality gate, successful production build and **real deployed browser/device visual inspection** for every district. Automated code success is necessary but insufficient.

## Fishing Harbor specifically

Use the existing dedicated lighthouse, academy, Harbor Patrol, harbor master, bait shop, seafood market, diner, rental, boatworks, cannery, village housing, waterfront homes, boats, seawalls, pier parts, streetlights and safety props. Preserve Cast & Reel, add the boat and water activities specified in docs/FISHING_HARBOR_BLUEPRINT.md, ensure the Harbor's own full-service town economy, and visually verify the coast from highway arrival.

## Current work staging

A remodel of Fishing Harbor's visual layer, trip length, vehicle speed, roadside placement and map navigation is being validated on a separate branch. It is not to be described as a finished port before the in-browser inspection and still-missing marine gameplay features are implemented.
