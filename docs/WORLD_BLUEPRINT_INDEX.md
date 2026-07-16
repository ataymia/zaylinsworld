# ZTA World Blueprint Index

Status: master planning index  
Project: Zaylin's Kid World, also called ZTA

This index is the front door for world implementation. It separates world-wide rules from town-specific build specifications.

## World-wide planning

1. [WORLD_MAP_DESIGN.md](WORLD_MAP_DESIGN.md) — connected-world intent and road hierarchy.
2. [ZTA_WORLD_BLUEPRINT.md](ZTA_WORLD_BLUEPRINT.md) — macro world, Starter Town v2 direction, town silhouettes, and integration sequence.
3. [CITY_BLUEPRINT_STANDARD.md](CITY_BLUEPRINT_STANDARD.md) — mandatory detail standard for every city.
4. [TOWN_SELF_SUSTAINING_SYSTEMS.md](TOWN_SELF_SUSTAINING_SYSTEMS.md) — housing, schools, jobs, skills, police, crime, and civic minimums.
5. [TOWN_ROADMAP.md](TOWN_ROADMAP.md) — compact summary and links.
6. [MINIGAME_FRAMEWORK.md](MINIGAME_FRAMEWORK.md) — shared activity lifecycle.

## Detailed town blueprints

| Town | Blueprint | Core identity | Planning status |
|---|---|---|---|
| Starter Town | [ZTA_WORLD_BLUEPRINT.md](ZTA_WORLD_BLUEPRINT.md) + current runtime config | ordinary life/tutorial city | existing playable foundation; expansion/dressing plan documented |
| TechTown | [TECH_TOWN_BLUEPRINT.md](TECH_TOWN_BLUEPRINT.md) | smart city, coding, drones, robotics, tech crime | detailed |
| Starline City | [STARLINE_CITY_BLUEPRINT.md](STARLINE_CITY_BLUEPRINT.md) | studios, performance, fashion, media, reputation | detailed |
| Fishing Harbor | [FISHING_HARBOR_BLUEPRINT.md](FISHING_HARBOR_BLUEPRINT.md) | fishing, boats, market, marine school, harbor economy | detailed |
| Dungeon Outskirts | [DUNGEON_OUTSKIRTS_BLUEPRINT.md](DUNGEON_OUTSKIRTS_BLUEPRINT.md) | sparse surface outpost + deep dungeon crawler | detailed |
| Obby Canyon | [OBBY_CANYON_BLUEPRINT.md](OBBY_CANYON_BLUEPRINT.md) | base settlement + vertical platform mastery | detailed |
| Rich Hills | [RICH_HILLS_BLUEPRINT.md](RICH_HILLS_BLUEPRINT.md) | property, luxury, hospitality, golf, marina, strict security | detailed |
| Casino Strip | [CASINO_STRIP_BLUEPRINT.md](CASINO_STRIP_BLUEPRINT.md) | fictional game halls, arcade, hotels, hospitality | detailed |

## Requested planning order

The planning pass was completed in this order:

```txt
1. TechTown (already established before this pass)
2. Starline City / Hollywood-Fame Town
3. Fishing Harbor
4. Dungeon Outskirts
5. Obby Canyon
6. Rich Hills
7. Casino Strip
```

## Recommended implementation order

Planning order and implementation order do not have to match. Recommended build sequence:

```txt
1. Stabilize Starter Town foundation and shared road/district data.
2. Build Fishing Harbor as first new connected town.
3. Build Obby Canyon course prototype because it tests separate-zone rules cleanly.
4. Build Dungeon Outskirts surface + first dungeon floor prototype.
5. Build TechTown after curved/segment roads, transit, and denser assets are proven.
6. Build Rich Hills after curved hill roads, property, marina, and security modifiers exist.
7. Build Casino Strip after local currencies, hotels, crowds, security, and payout controls exist.
8. Build Starline City after rhythm, reputation, events, studios, and crowd scheduling exist.
```

This is a dependency recommendation, not a creative priority ranking.

## Non-negotiable town completion rule

No town is complete until the player can:

```txt
- arrive and understand its geography
- travel safely by its supported transportation modes
- buy or select local housing
- attend its school/training center
- work multiple geographically appropriate jobs
- play multiple town-specific activities
- buy food and ordinary supplies
- recover health/energy and use local services
- refuel/charge where vehicles are allowed
- encounter local police/security and local crime consequences
- clear local trouble without a softlock
- live there without depending on Starter Town
- revisit for a lasting progression reason
```

## Asset implementation order inside each town

```txt
1. Style-anchor props
2. Terrain and road skeleton
3. Civic/service exteriors
4. Housing and school exteriors
5. Hero entertainment/gameplay exteriors
6. Core interiors
7. Jobs and minigame support assets
8. Police/crime/housing systems
9. NPC population and schedules
10. Lighting, sound, signage, performance, and QA
```

## Agent rule

An implementation agent must read the relevant town blueprint and
[CITY_BLUEPRINT_STANDARD.md](CITY_BLUEPRINT_STANDARD.md) before changing a town.
It must not invent missing districts, move gateways, replace established names,
or expose placeholder interactions without an explicit planning update.