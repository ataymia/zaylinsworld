// ───────────────────────────────────────────────────────────────────────────
//  missions.js — lightweight mission / objective manager + starter quest chain.
//
//  A mission has ordered objectives. Each objective is satisfied by a gameplay
//  EVENT (emitted from main.js: entering a building, talking to an NPC, buying/
//  eating chicken, driving to a checkpoint, finishing a mini-game, etc.). When
//  every objective in the active mission is done, its reward is granted and the
//  next mission starts. Progress is saved on state so it survives reloads and
//  entering/leaving interiors.
// ───────────────────────────────────────────────────────────────────────────

// obj.match(type, arg) → true when this objective is satisfied by the event.
const obj = (text, type, arg) => ({
  text,
  done: false,
  match: (t, a) => t === type && (arg == null || a === arg),
});

export const MISSIONS = [
  {
    id: 'welcome', title: 'Welcome to Zaylin\u2019s World',
    desc: 'Get your bearings and meet the block.',
    objectives: [
      obj('Talk to someone on the street', 'talk-city'),
    ],
    reward: { money: 150, stat: ['fun', 10], note: 'Welcome gift: +$150' },
  },
  {
    id: 'chicken-run', title: 'Chicken Run',
    desc: 'Grab a bite at the Chicken Spot.',
    objectives: [
      obj('Enter the Chicken Spot', 'enter', 'chicken'),
      obj('Talk to the cashier', 'talk-int', 'cashier'),
      obj('Buy a piece of chicken', 'buy-chicken'),
      obj('Eat it clean to the bone', 'eat-done'),
    ],
    reward: { money: 120, stat: ['hunger', 20], note: '+$120 & a full belly' },
  },
  {
    id: 'frostbox', title: 'Frostbox First Look',
    desc: 'Check out the ice at Frostbox.',
    objectives: [
      obj('Enter Frostbox', 'enter', 'frostbox'),
      obj('Talk to the jeweler', 'talk-int', 'jeweler'),
      obj('Collect a gem out in the city', 'gem'),
    ],
    reward: { money: 200, stat: ['fun', 8], note: '+$200 style money' },
  },
  {
    id: 'dealership', title: 'Dealership Tour',
    desc: 'See what Auto Haus is pushing.',
    objectives: [
      obj('Enter Auto Haus', 'enter', 'dealership'),
      obj('Talk to the salesperson', 'talk-int', 'dealer'),
      obj('Get in your ride', 'enter-car'),
    ],
    reward: { money: 100, stat: ['fun', 6], note: 'Starter car confirmed' },
  },
  {
    id: 'get-around', title: 'Get Around Town',
    desc: 'Take the whip for a real drive.',
    objectives: [
      obj('Drive to the park checkpoint', 'drive-checkpoint'),
      obj('Park and hop out', 'exit-car'),
    ],
    reward: { money: 130, stat: ['fun', 6], note: '+$130 driving cash' },
  },
  {
    id: 'home-cut', title: 'Home Haircut',
    desc: 'Line it up at the crib.',
    objectives: [
      obj('Head home', 'enter', 'home'),
      obj('Use the clippers (haircut mini-game)', 'haircut-done'),
    ],
    reward: { money: 80, stat: ['fun', 12], note: 'Fresh cut, +$80' },
  },
  {
    id: 'gym-intro', title: 'Gym Intro',
    desc: 'Put in work at Iron City Gym.',
    objectives: [
      obj('Enter the gym', 'enter', 'gym'),
      obj('Complete a workout', 'workout-done'),
    ],
    reward: { money: 90, stat: ['fitness', 15], note: '+$90 & fitness up' },
  },
  {
    id: 'school-intro', title: 'School Intro',
    desc: 'Hit the books at Zaylin Prep.',
    objectives: [
      obj('Enter the school', 'enter', 'school'),
      obj('Complete a study session', 'study-done'),
    ],
    reward: { money: 90, stat: ['smarts', 15], note: '+$90 & smarts up' },
  },
  {
    id: 'first-job', title: 'First Job',
    desc: 'Clock in at WorkTower.',
    objectives: [
      obj('Enter WorkTower', 'enter', 'office'),
      obj('Work a full shift', 'job-done'),
    ],
    reward: { money: 250, stat: ['fun', 5], note: 'First paycheck: +$250' },
  },
  {
    id: 'cleanup-crew', title: 'Cleanup Crew',
    desc: 'The block is filthy — pick up litter and dump it.',
    objectives: [
      obj('Talk to the sanitation worker', 'talk-sanitation'),
      obj('Finish a trash cleanup quota', 'trash-done'),
    ],
    reward: { money: 120, stat: ['hygiene', 8], note: 'Clean streets, +$120' },
  },
  {
    id: 'street-trouble', title: 'Street Trouble',
    desc: 'Somebody’s talking sideways. Handle it (stylized, no weapons needed).',
    objectives: [
      obj('Land a hit in a street fight', 'fight'),
    ],
    reward: { money: 60, stat: ['fitness', 8], note: 'You stood your ground, +$60' },
  },
  {
    id: 'risky-choice', title: 'Risky Choice',
    desc: 'Quick cash, real heat. Your call.',
    objectives: [
      obj('Mug someone for quick cash (press G near them)', 'rob-done'),
    ],
    reward: { money: 100, stat: ['fun', 4], note: 'Dirty money, +$100 — watch the heat' },
  },
  {
    id: 'police-alert', title: 'Police Alert',
    desc: 'You’ve got a wanted level. Shake the cops.',
    objectives: [
      obj('Lose the police (drop your wanted level to zero)', 'lost-cops'),
    ],
    reward: { money: 150, stat: ['fun', 6], note: 'Clean getaway, +$150' },
  },
];

let deps = null;     // { state, notify, saveNow, updateHUDStats }
let idx = 0;

export function initMissions(d) {
  deps = d;
  idx = deps.state.missionIndex ?? 0;
  // rebuild objective done-flags from saved progress
  const prog = deps.state.missionProgress || [];
  const m = MISSIONS[idx];
  if (m) m.objectives.forEach((o, i) => { o.done = !!prog[i]; });
  renderTracker();
}

function persist() {
  deps.state.missionIndex = idx;
  const m = MISSIONS[idx];
  deps.state.missionProgress = m ? m.objectives.map((o) => o.done) : [];
}

// Fire a gameplay event into the mission system. Safe to call for any event.
export function missionEvent(type, arg) {
  if (!deps) return;
  const m = MISSIONS[idx];
  if (!m) return;
  let advanced = false;
  // satisfy the FIRST not-yet-done objective that matches (keeps order intent
  // but is forgiving if the player does steps slightly out of sequence)
  for (const o of m.objectives) {
    if (!o.done && o.match(type, arg)) {
      o.done = true; advanced = true;
      deps.notify('\u2705 ' + o.text);
      break;
    }
  }
  if (!advanced) return;
  persist();
  if (m.objectives.every((o) => o.done)) completeMission();
  else renderTracker();
  deps.saveNow();
}

function completeMission() {
  const m = MISSIONS[idx];
  const r = m.reward || {};
  if (r.money) deps.state.money += r.money;
  if (r.stat) {
    const [k, v] = r.stat;
    deps.state.stats[k] = Math.max(0, Math.min(100, (deps.state.stats[k] || 0) + v));
  }
  deps.notify('\ud83c\udfc1 Mission complete: ' + m.title + (r.note ? ' \u2014 ' + r.note : ''));
  idx += 1;
  const next = MISSIONS[idx];
  if (next) {
    next.objectives.forEach((o) => { o.done = false; });
    setTimeout(() => deps.notify('\ud83d\udccd New mission: ' + next.title), 1400);
  }
  persist();
  renderTracker();
  deps.saveNow();
}

export function renderTracker() {
  const el = document.getElementById('mission-tracker');
  if (!el) return;
  const m = MISSIONS[idx];
  if (!m) {
    el.style.display = '';
    el.innerHTML = '<div class="mt-label">Missions</div><div class="mt-title">All caught up \ud83c\udf1f</div>';
    return;
  }
  el.style.display = '';
  const rows = m.objectives.map((o) =>
    `<div class="mt-obj ${o.done ? 'done' : ''}"><span class="mt-tick"></span>${o.text}</div>`).join('');
  el.innerHTML = `<div class="mt-label">Mission ${idx + 1}/${MISSIONS.length}</div>` +
    `<div class="mt-title">${m.title}</div>${rows}`;
}

export function activeMissionId() { return MISSIONS[idx]?.id || null; }
