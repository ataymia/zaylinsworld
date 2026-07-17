# Police Career and Criminal Record System

Status: authoritative career-system blueprint, planning only  
Project: Zaylins Kid World, also called ZTA  
Primary pilot location: Starter Town / Dreamdrop Public Safety

Police officer is a permanent career path in ZTA. It represents the strongest lawful-life career branch and must be available in every town with a local law authority or equivalent safety agency.

The career is intentionally affected by the player's official criminal record. A player who is convicted in a town can never become an officer for that same town. A player who committed crimes but was never caught has no official record and may still apply. A player convicted elsewhere may rebuild their life and apply in a different town after completing a formal reform path.

---

## 1. Core rules

```txt
1. Uncaught crime does not create an official criminal record.
2. Active wanted status or an open local case blocks application.
3. Any conviction in a town permanently disqualifies police employment in that same town.
4. The same-town disqualification cannot be erased by paying money, waiting, or using an expungement shortcut.
5. A conviction in another town does not create an automatic permanent worldwide ban.
6. An out-of-town conviction requires a completed reform path before applying elsewhere.
7. A player who has never been caught may still pass a background check, even if hidden crime history exists.
8. Becoming a police officer does not erase hidden crimes or past convictions.
9. An officer caught committing a crime is fired and permanently barred from that town's department.
10. Every town keeps its own department eligibility and employment state.
```

This deliberately distinguishes what the player has done from what the legal system can officially prove.

---

## 2. Hidden history versus official record

### Hidden crime history

Tracks crimes committed whether or not the player was caught.

Possible uses:

- secret dialogue
- blackmail or witness missions later
- personal statistics
- internal narrative choices
- corruption storylines only if deliberately designed

Hidden history is not shown in a normal police background check.

### Official criminal record

Created only when the player is caught and processed for an offense.

Official records contain:

```txt
jurisdiction/town
case id
offense category
date/day
arrested flag
convicted flag
sentence/fine/community service
sentence completed
career disqualifications
```

### Jurisdiction rule

```txt
Convicted in Starter Town:
- permanently ineligible for Dreamdrop Public Safety police officer
- may pursue reform and later apply in another town

Convicted in Rich Hills:
- permanently ineligible for Rich Hills Police
- may pursue reform and later apply elsewhere

Never caught anywhere:
- no official record
- police application remains available
```

---

## 3. Recommended save-state model

```js
criminalHistory: {
  hiddenByTown: {
    'starter-town': {
      crimesCommitted: 0,
      seriousCrimesCommitted: 0,
      lastCrimeDay: null
    }
  },
  recordsByTown: {
    'starter-town': {
      arrests: [],
      convictions: [],
      localPoliceDisqualified: false,
      sentenceComplete: true,
      activeCase: false
    }
  },
  reform: {
    status: 'none',
    completedTown: null,
    completedDay: null,
    cleanDaysAfterReform: 0
  }
},
policeCareerByTown: {
  'starter-town': {
    status: 'locked',
    rank: null,
    academyProgress: 0,
    shiftsCompleted: 0,
    commendations: 0,
    disciplinaryStrikes: 0
  }
}
```

Valid police career statuses:

```txt
locked
eligible
application-pending
academy-cadet
probationary-officer
patrol-officer
senior-officer
specialist
suspended
fired
permanently-disqualified
```

---

## 4. Starter Town eligibility

A player may apply to Dreamdrop Public Safety when all are true:

```txt
- no Starter Town conviction
- no active Starter Town case
- no active wanted level
- Foundation Certificate completed
- Civics & Law lesson completed
- Driver Education completed
- minimum fitness threshold met
- minimum smarts threshold met
- valid local driving license
- no current serious job ban
```

Recommended starter thresholds:

```txt
smarts: 35+
fitness: 30+
civics lesson: passed
driver education: passed
road test: passed
```

These values should be attainable through normal Starter Town life without grinding for hours.

---

## 5. Reform path for another town

A player convicted in one town may apply to a different town after becoming a **Reformed Citizen**.

Required steps:

1. Finish all fines, jail, probation, restitution, or community service.
2. Clear all active wanted levels and cases.
3. Complete a reform interview at the convicting town's police/civic office.
4. Complete a Civics & Responsibility course.
5. Complete one community-benefit job chain.
6. Maintain a clean period with no new conviction.
7. Receive a Reformed Citizen certificate.
8. Apply only in a different town where the player has no local conviction.

Recommended clean period:

```txt
5 to 10 in-game days, balance-tested later
```

The certificate does not restore police eligibility in the town where the conviction occurred.

### Example

```txt
Player is convicted in Starter Town.
Dreamdrop police career is permanently closed.
Player completes sentence and reform path.
Player moves to Fishing Harbor.
If the player has no Fishing Harbor conviction and meets Harbor Patrol requirements,
they may apply to become a Harbor Patrol officer.
```

---

## 6. Background-check logic

Recommended decision order:

```txt
1. Is player currently wanted? -> reject temporarily.
2. Is there an active case in this town? -> reject temporarily.
3. Is localPoliceDisqualified true? -> reject permanently.
4. Does player have a conviction in this town? -> set permanent local disqualification.
5. Does player have a conviction elsewhere? -> require Reformed Citizen certificate.
6. Are academy prerequisites complete? -> if no, show exact missing requirements.
7. Otherwise -> eligible to apply.
```

Uncaught hidden crimes are intentionally not queried by this function.

---

## 7. Police academy path

Starter Town's police academy uses the existing Police Station/Public Safety campus and Zaylins Prep curriculum. No new functional academy building is required.

### Academy modules

| Module | Skill tested | Gameplay |
|---|---|---|
| Civics and Law | smarts/legal knowledge | scenario choices |
| Fitness Test | fitness | sprint, obstacle, timing |
| Driver Test | driving | controlled city route |
| Traffic Control | observation | identify violations and direct traffic |
| De-escalation | dialogue | choose safe responses |
| Evidence Basics | memory/sorting | label and store evidence |
| Radio Procedure | sequence | respond to dispatch correctly |
| Patrol Navigation | map knowledge | reach calls across districts |
| Arrest Procedure | timing/order | secure, search, transport without skipping steps |
| Community Service | reputation | help residents and complete reports |

### Academy progression

```txt
Application
-> background check
-> academy modules
-> cadet ride-along
-> probationary patrol
-> full patrol officer
```

Failure should allow retraining. Disqualification comes from criminal conviction, not from failing a test.

---

## 8. Police jobs and shifts

Police work must be a real job family, not a costume and a button.

### Entry-level duties

| Shift | Core loop |
|---|---|
| Front Desk Cadet | route residents, reports, fines, and lost-property requests |
| Traffic Control | monitor intersections and issue warnings/citations |
| School Crossing Detail | protect crossings and enforce school-zone speed |
| Community Patrol | visit district checkpoints and speak to residents |
| Report Filing | sort offense reports and evidence records |
| Vehicle Inspection | inspect patrol cars and impound vehicles |

### Patrol-officer duties

| Shift | Core loop |
|---|---|
| Dispatch Response | travel to generated calls within time/safety limits |
| Reckless Driver Stop | locate and safely stop an NPC offender |
| Stolen Vehicle Recovery | identify, pursue, and return a stolen car |
| Store Alarm | investigate a shop alarm and identify suspect/evidence |
| Disturbance Call | resolve a fight or argument through choices |
| Missing Item/Person | search a district using witness clues |
| Evidence Transport | carry secured evidence from scene to station |
| Pursuit Assistance | join an existing chase without causing civilian damage |
| Park/Neighborhood Patrol | deter theft and assist residents |
| Highway Patrol | monitor Eastgate/North Gate traffic |

### Higher-rank duties

- field training officer
- detective-style clue missions later
- traffic unit
- community liaison
- marine/harbor transfer in Fishing Harbor
- cybercrime unit in TechTown
- venue security liaison in Starline/Casino
- rescue/ranger unit in Obby/Dungeon/Aqualume equivalents

---

## 9. Police gameplay ethics and scoring

Officer shifts are scored on:

```txt
response time
safe driving
civilian safety
correct suspect identification
proper evidence handling
appropriate use of force
successful de-escalation
report accuracy
property damage
lawful procedure
```

The highest score should come from solving the call safely, not using the most force.

### Prohibited officer behavior

- attacking innocent NPCs
- stealing property
- planting or deleting evidence
- reckless pursuit damage
- ignoring required procedure
- abusing restricted areas

Consequences:

```txt
warning
pay reduction
disciplinary strike
suspension
firing
criminal case
permanent local police disqualification if convicted
```

---

## 10. Rank and promotion system

Recommended Starter Town ranks:

```txt
Cadet
Probationary Officer
Patrol Officer
Senior Patrol Officer
Traffic Specialist or Community Specialist
Sergeant later
```

Promotion factors:

- academy scores
- successful shifts
- commendations
- low civilian/property damage
- report accuracy
- minimum fitness/smarts
- no disciplinary conviction

Police wages should be stronger than starter retail work, but academy requirements and job difficulty justify the difference.

---

## 11. Department-specific careers

Each town uses the same record framework with different training and duties.

| Town | Career |
|---|---|
| Starter Town | Dreamdrop Police Officer / Public Safety Officer |
| Fishing Harbor | Harbor Patrol Officer |
| Rich Hills | Rich Hills Police Officer; private security remains separate |
| TechTown | Metro Security/Police Officer with cyber and drone training |
| Casino Strip | Strip Police Officer; venue security separate |
| Starline City | Starline Police Officer; studio/venue security separate |
| Dungeon Outskirts | Warden/Ranger Officer |
| Obby Canyon | Canyon Ranger/Safety Officer |
| Aqualume | Current Guard Officer |

A conviction in one jurisdiction permanently blocks only that jurisdiction's police career. Another jurisdiction requires reform and its own academy.

---

## 12. Tutorial presentation

Starter Town should introduce police work before the world opens.

During the Law and Choice tutorial phase, the police desk explains:

```txt
- police is a future career
- convictions in Starter Town permanently close that local career
- uncaught crime does not appear on an official record
- crime can pay faster but changes future choices if the player is caught
- reform can reopen police work elsewhere, never in the convicting town
```

The player is not forced to decide immediately. The academy application remains available later if still eligible.

---

## 13. Implementation phases

### Phase 1: Record foundation

- hidden crime counters
- arrests and convictions by town
- local permanent disqualification flag
- active case and sentence state

### Phase 2: Eligibility UI

- police desk career option
- background-check result
- exact missing prerequisites
- permanent versus temporary rejection wording

### Phase 3: Starter academy

- civics, fitness, driver, traffic, evidence, and patrol modules
- cadet status and saved progress

### Phase 4: Police shifts

- front desk
- school crossing
- traffic patrol
- dispatch calls
- stolen vehicle recovery

### Phase 5: Discipline and promotion

- shift scoring
- disciplinary strikes
- suspension/firing
- ranks and pay

### Phase 6: Cross-town reform

- sentence completion
- reform certification
- target-town application logic
- department-specific academies

---

## 14. Implementation checklist

```txt
[ ] crimes committed tracked separately from official record
[ ] arrest and conviction recorded by town
[ ] local conviction permanently sets local police disqualification
[ ] uncaught crimes do not block background check
[ ] active wanted/open case temporarily blocks application
[ ] out-of-town conviction requires reform certificate
[ ] reform never restores eligibility in convicting town
[ ] academy prerequisites show exact missing items
[ ] police career state saves per town
[ ] cadet and patrol shifts are playable
[ ] officer actions receive procedure/safety scoring
[ ] criminal officer can be suspended, fired, arrested, and locally barred
[ ] each future town defines its own law-career variant
[ ] no paid item bypasses a police-career disqualification
```

Final rule:

```txt
The police career is not merely a job unlock.
It is the long-term reward for protecting an official clean record in that town.
```