// ───────────────────────────────────────────────────────────────────────────
//  minigameCatalog.js — minigame registry data skeleton (NOT wired).
//
//  Pure data. One descriptor per planned minigame (see docs/MINIGAME_FRAMEWORK.md
//  §2 for the shape). `run` is a hook id the actual game resolves when wired;
//  this file holds no engine logic. Rewards map ONLY onto the wallet + existing
//  state.stats ({health, energy, fitness, hygiene, fun, smarts}) + item ids.
//  `reward.money` may be [min,max] scored by performance.
// ───────────────────────────────────────────────────────────────────────────

export const MINIGAME_CATEGORIES = Object.freeze([
  'timing', 'rhythm', 'puzzle', 'luck', 'platform', 'combat', 'driving',
]);

export const MINIGAME_CATALOG = Object.freeze({
  // ── Starter Town (mirrors existing timing-game activities) ──
  'clippers-lineup': { title: 'Line Up', town: 'starter-town', category: 'timing',
    entry: { energy: 2 }, duration: 0, cooldown: 4,
    reward: { stat: { hygiene: 8, fun: 2 } }, instructions: 'Hit the marks for a clean line-up.', run: 'timingLoop' },
  'gym-training': { title: 'Training', town: 'starter-town', category: 'timing',
    entry: { energy: 5 }, duration: 0, cooldown: 4,
    reward: { stat: { fitness: 6, energy: -5 } }, instructions: 'Time each rep in the green zone.', run: 'timingLoop' },
  'food-shift': { title: 'Kitchen Shift', town: 'starter-town', category: 'timing',
    entry: { energy: 4 }, duration: 40, cooldown: 6,
    reward: { money: [40, 90], stat: { energy: -5, fun: 2 } }, instructions: 'Cook orders before they expire.', run: 'timingLoop' },
  'driving': { title: 'Road Test', town: 'starter-town', category: 'driving',
    entry: {}, duration: 0, cooldown: 0,
    reward: {}, instructions: 'Drive to the marker without wrecking.', run: 'drivingLoop' },

  // ── Fishing Harbor ──
  'fishing': { title: 'Cast & Reel', town: 'fishing-harbor', category: 'timing',
    entry: { energy: 5, permit: 'fishing-permit' }, duration: 30, cooldown: 8,
    reward: { money: [40, 150], stat: { fun: 4 }, items: ['fish'] }, instructions: 'Cast, wait for the bite, reel in the green zone.', run: 'fishingLoop' },
  'fish-transform': { title: 'Catch of Legend', town: 'fishing-harbor', category: 'timing',
    entry: { energy: 6 }, duration: 25, cooldown: 12,
    reward: { money: [150, 400], items: ['rare-fish'] }, instructions: 'Land the rare fish — it transforms!', run: 'fishingLoop' },
  'crab-traps': { title: 'Crab Traps', town: 'fishing-harbor', category: 'puzzle',
    entry: { energy: 3 }, duration: 35, cooldown: 6,
    reward: { money: [30, 80] }, instructions: 'Set and pull traps on time.', run: 'puzzleLoop' },

  // ── Dungeon Outskirts ──
  'dungeon-crawl': { title: 'Ruin Dive', town: 'dungeon-outskirts', category: 'combat',
    entry: { energy: 8 }, duration: 0, cooldown: 15,
    reward: { money: [100, 250], items: ['loot-cache'], stat: { health: -10 } }, instructions: 'Clear rooms, find keys, survive.', run: 'combatLoop' },
  'boss-fight': { title: 'Boss', town: 'dungeon-outskirts', category: 'combat',
    entry: { energy: 10 }, duration: 0, cooldown: 30,
    reward: { money: [300, 500], items: ['boss-relic'], stat: { health: -20 } }, instructions: 'Read the tells, punish the openings.', run: 'combatLoop' },

  // ── Obby Canyon ──
  'obby-course': { title: 'Obby Course', town: 'obby-canyon', category: 'platform',
    entry: {}, duration: 0, cooldown: 2,
    reward: { money: [20, 100] }, instructions: 'Reach the top — falls reset to checkpoint.', run: 'platformLoop' },
  'time-trial': { title: 'Time Trial', town: 'obby-canyon', category: 'platform',
    entry: {}, duration: 60, cooldown: 2,
    reward: { money: [50, 200] }, instructions: 'Beat the clock, no falls bonus.', run: 'platformLoop' },

  // ── Casino Strip ──
  'slots': { title: 'Slots', town: 'casino-strip', category: 'luck',
    entry: { money: 10 }, duration: 0, cooldown: 0,
    reward: { money: [0, 500] }, instructions: 'Spin and pray.', run: 'luckLoop' },
  'blackjack': { title: 'Blackjack', town: 'casino-strip', category: 'luck',
    entry: { money: 25 }, duration: 0, cooldown: 0,
    reward: { money: [0, 400] }, instructions: 'Hit or stand — beat the dealer.', run: 'cardLoop' },
  'roulette': { title: 'Roulette', town: 'casino-strip', category: 'luck',
    entry: { money: 25 }, duration: 0, cooldown: 0,
    reward: { money: [0, 900] }, instructions: 'Pick your number/color.', run: 'luckLoop' },
  'prize-wheel': { title: 'Prize Wheel', town: 'casino-strip', category: 'luck',
    entry: { money: 5 }, duration: 0, cooldown: 30,
    reward: { money: [0, 200], items: [] }, instructions: 'One free spin a day.', run: 'luckLoop' },
  'arcade': { title: 'Arcade', town: 'casino-strip', category: 'timing',
    entry: { money: 5 }, duration: 45, cooldown: 0,
    reward: { money: [0, 60], items: ['tickets'] }, instructions: 'High score wins tickets.', run: 'timingLoop' },

  // ── Tech City ──
  'coding-puzzle': { title: 'Debug It', town: 'tech-city', category: 'puzzle',
    entry: { energy: 4 }, duration: 60, cooldown: 4,
    reward: { money: [100, 200], stat: { smarts: 3 } }, instructions: 'Solve the logic puzzle before deploy.', run: 'puzzleLoop' },
  'drone-pilot': { title: 'Drone Run', town: 'tech-city', category: 'driving',
    entry: { energy: 3 }, duration: 50, cooldown: 6,
    reward: { money: [80, 160] }, instructions: 'Fly the route through the rings.', run: 'drivingLoop' },
  'hacking': { title: 'Hack', town: 'tech-city', category: 'timing',
    entry: { energy: 4 }, duration: 30, cooldown: 10,
    reward: { money: [120, 220] }, instructions: 'Match the sequence before the trace.', run: 'timingLoop' },

  // ── Hollywood / Fame ──
  'rhythm-audition': { title: 'Audition', town: 'hollywood-fame', category: 'rhythm',
    entry: { energy: 5 }, duration: 45, cooldown: 6,
    reward: { money: [100, 250], stat: { fun: 5 }, items: ['fame:5'] }, instructions: 'Hit the beats to impress the panel.', run: 'rhythmLoop' },
  'dance-battle': { title: 'Dance Battle', town: 'hollywood-fame', category: 'rhythm',
    entry: { energy: 6 }, duration: 40, cooldown: 8,
    reward: { money: [80, 200], items: ['fame:8'] }, instructions: 'Out-dance your rival.', run: 'rhythmLoop' },
  'talk-show': { title: 'Talk Show', town: 'hollywood-fame', category: 'timing',
    entry: {}, duration: 30, cooldown: 12,
    reward: { items: ['fame:10'] }, instructions: 'Time your answers for laughs.', run: 'timingLoop' },

  // ── Rich Hills ──
  'golf': { title: 'Golf', town: 'rich-hills', category: 'timing',
    entry: { money: 20 }, duration: 0, cooldown: 4,
    reward: { money: [0, 120] }, instructions: 'Set power and aim, sink the putt.', run: 'timingLoop' },
  'yacht-run': { title: 'Yacht Run', town: 'rich-hills', category: 'driving',
    entry: {}, duration: 60, cooldown: 6,
    reward: { money: [60, 180] }, instructions: 'Race the buoys.', run: 'drivingLoop' },
  'car-show': { title: 'Car Show', town: 'rich-hills', category: 'timing',
    entry: {}, duration: 0, cooldown: 8,
    reward: { money: [0, 300] }, instructions: 'Present your best ride for the judges.', run: 'timingLoop' },
});

export default MINIGAME_CATALOG;
