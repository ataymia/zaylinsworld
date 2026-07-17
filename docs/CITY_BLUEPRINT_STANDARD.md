# ZTA Detailed City Blueprint Standard

Status: planning standard, not runtime code  
Project: Zaylins Kid World, also called ZTA

Every future town blueprint must be detailed enough that an implementation agent can build the town without inventing its civic structure, gameplay identity, road logic, district structure, or asset taxonomy.

## World hierarchy

```txt
connected world
-> city/town
-> district
-> neighborhood/block
-> building, property, road, activity, job, or service
```

A town is not one themed block. Every town must contain multiple districts or equivalent geographic zones, each with a distinct role, route identity, population pattern, and gameplay reason to exist.

## Required sections

1. Name, alias, town role, and design north star.
2. Color, material, lighting, sound, weather, and silhouette rules.
3. World origin, neighboring connections, gateways, terrain, and map boundaries.
4. District-by-district layout with approximate bounds and district relationships.
5. Road/path hierarchy, intersections, traffic, pedestrian routes, transit, parking, service alleys, difficult traversal zones, and gateway routes.
6. Utilities and public infrastructure: fuel/charging, sanitation, power, water, clinics, parks, emergency services.
7. Hero landmarks, ordinary supporting buildings, filler architecture, and environmental infrastructure.
8. Player housing tiers, buyable properties, spawn/rest/storage functions, and residential identity.
9. School/training center, curriculum, learning minigames, skills, and unlocks.
10. Police/security station, patrol density, response rules, restricted zones, local crimes, heat clearing, and consequences.
11. Jobs, shifts, mission types, pay identity, and job assets.
12. Minigames and repeatable activities, with exact locations and reward roles.
13. Shops, restaurants, services, money sinks, and local economy.
14. NPC population types, routines, schedules, and social hubs.
15. Vehicle and travel identity.
16. Asset families with integration-ready names.
17. First style-anchor sprint.
18. Production phases and dependencies.
19. Agent handoff checklist.
20. Town completion checklist.

## Geographic minimum

Every normal surface town must include:

```txt
- at least 4 meaningful districts or equivalent geographic zones
- at least 2 major cross-town routes
- at least 1 local or secondary route network
- at least 1 service, alley, pedestrian-only, water, or restricted route type
- recognizable gateways to neighboring towns or world routes
- travel distance between home, school, work, shopping, and civic services
- filler neighborhoods/infrastructure between hero landmarks
- at least one traversal challenge appropriate to the town
- district-specific traffic, pedestrian, patrol, or creature behavior
```

Exceptions such as Dungeon Outskirts, Obby Canyon, or Aqualume may use surface/underground, base/course, or swim/current zones instead of conventional street districts, but they must still satisfy the geographic-purpose rule.

## Civic minimum

Every town must include:

```txt
- local police/security authority
- buyable housing
- school/training equivalent
- food and convenience access
- clinic/recovery service
- gym or town-appropriate physical training
- fuel/charging service where vehicles are allowed
- sanitation and utility dressing
- at least 4 local jobs
- at least 4 local minigames/activity loops
- town-specific skills
- town-specific crime/consequence profile
- local rest, storage, wardrobe, and spawn options
- reason to live there
- reason to revisit after moving away
```

## Filler rule

Filler is not random scenery. Decorative buildings, lots, utilities, homes, warehouses, service roads, parks, and street furniture must explain what exists between functional destinations. Decorative assets receive no prompt until a real handler and fallback exist.

## Road/path rule

A repeated square loop is not sufficient for a finished city. Road and path networks should use appropriate combinations of:

```txt
arterials
main streets
local streets
curves
hills or grade changes
roundabouts
school zones
parking entrances
service roads
alleys
bridges/tunnels
water lanes
pedestrian paths
restricted routes
```

Difficulty must come from readable geometry, traffic, speed, timing, or terrain, never invisible collision or intentionally confusing pathing.

## Asset naming

```txt
<domain>_<town-or-location>_<function-or-descriptor>_<variant>_v01.<ext>
```

Examples:

```txt
building_starline_studios_exterior_v01.glb
prop_harbor_fish_crate_a_v01.glb
furniture_richhills_mansion_sofa_a_v01.glb
ui_icon_dungeon_floor.svg
```

## Interaction rule

No fake prompts. An object receives an interaction prompt only when its handler, reward/consequence path, and safe fallback exist.

## Completion rule

A themed road and four buildings are not a town. A town is complete when the player can understand its geography, travel between districts, live, learn, work, shop, recover, socialize, commit local crimes, face local consequences, and build a life there.