# ZTA Detailed City Blueprint Standard

Status: planning standard, not runtime code  
Project: Zaylin's Kid World, also called ZTA

Every future town blueprint must be detailed enough that an implementation agent can build the town without inventing its civic structure, gameplay identity, road logic, or asset taxonomy.

## Required sections

1. Name, alias, town role, and design north star.
2. Color, material, lighting, sound, weather, and silhouette rules.
3. World origin, neighboring connections, gateways, terrain, and map boundaries.
4. District-by-district layout.
5. Road hierarchy, intersections, traffic, pedestrian routes, transit, parking, and service alleys.
6. Utilities and public infrastructure: fuel/charging, sanitation, power, water, clinics, parks, emergency services.
7. Hero landmarks and minor supporting buildings.
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

A themed road and four buildings are not a town. A town is complete when the player can live, learn, work, shop, travel, recover, socialize, commit local crimes, face local consequences, and build a life there.