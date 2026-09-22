// ───────────────────────────────────────────────────────────────────────────
// missions.js — multi-quest runtime, save migration, tracker, and Q journal.
//
// Backward-compatible public API:
//   initMissions({ state, notify, saveNow })
//   missionEvent(type, arg)
//   renderTracker()
//   activeMissionId()
//
// The old manager advanced one mandatory array index and forced crime near the
// end. This manager supports concurrent quests, optional acceptance, tracking,
// categories, counts, branching-ready flags, planned content, and legacy saves.
// ───────────────────────────────────────────────────────────────────────────

import {
  QUEST_CATALOG,
  QUESTS_BY_ID,
  QUEST_CATEGORIES,
  QUEST_IMPLEMENTATION,
  LEGACY_MISSION_ORDER,
} from './config/questCatalog.js';
import { consequenceById } from './config/storyConsequences.js';

export const MISSIONS = QUEST_CATALOG;

const QUEST_STATE_VERSION = 1;
const MAX_TRACKED = 3;
const JOURNAL_TABS = Object.freeze([
  ['tracked', 'Tracked'],
  ['story', 'Story'],
  ['town', 'Town'],
  ['people', 'People'],
  ['career', 'Career'],
  ['activities', 'Activities'],
  ['completed', 'Completed'],
]);

// Runtime objectives point at named world targets instead of carrying raw map
// coordinates. The live minimap resolves these through StarterTownNavigation,
// keeping quest directions, police routes, and the built roads in agreement.
const OBJECTIVE_NAVIGATION_TARGETS = Object.freeze({
  'enter:chicken': 'chicken-spot',
  'enter:frostbox': 'frostbox',
  'enter:home': 'zaylins-home',
  'enter:gym': 'iron-city-gym',
  'enter:school': 'zaylins-prep',
  'enter:office': 'worktower',
  'enter:dealership': 'auto-haus',
  'talk-int:cashier': 'chicken-spot',
  'talk-int:jeweler': 'frostbox',
  'talk-int:dealer': 'auto-haus',
  'buy-chicken': 'chicken-spot',
  'eat-done': 'chicken-spot',
  'haircut-done': 'zaylins-home',
  'mailbox-check:zaylins-home': 'zaylins-home',
  'workout-done': 'iron-city-gym',
  'study-done': 'zaylins-prep',
  'job-done': 'worktower',
  'talk-sanitation': 'dreamdrop-sanitation-stop',
  'trash-done': 'dreamdrop-sanitation-stop',
  'enter-car': 'auto-haus',
  'buy-snack': '6twelve',
  'buy-drink': '6twelve',
  'talk-police-desk': 'police-station',
  'police-cells': 'police-station',
});

let deps = null;
let qs = null;
let journalOpen = false;
let activeTab = 'tracked';
let selectedQuestId = null;
let inputBound = false;
let uiMounted = false;

const nowStamp = () => Date.now();
const unique = (values) => Array.from(new Set(values || []));
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function blankQuestState() {
  return {
    version: QUEST_STATE_VERSION,
    active: {},
    completed: {},
    failed: {},
    availableIds: [],
    trackedIds: [],
    primaryId: null,
    flags: {},
    decisions: {},
  };
}

function progressFor(quest, legacyProgress = null) {
  const objectives = {};
  quest.objectives.forEach((objective, index) => {
    const legacyDone = Array.isArray(legacyProgress) && !!legacyProgress[index];
    objectives[objective.id] = legacyDone ? objective.count : 0;
  });
  return { startedAt: nowStamp(), objectives };
}

function migrateLegacyState(state) {
  const next = blankQuestState();
  const legacyIndex = Math.max(0, Number(state.missionIndex || 0));
  if (legacyIndex > 0) {
    next.completed['welcome-to-dreamdrop'] = { completedAt: nowStamp(), migrated: true };
    next.completed['first-day-your-way'] = { completedAt: nowStamp(), migrated: true };
  }
  LEGACY_MISSION_ORDER.forEach((questId, index) => {
    if (!QUESTS_BY_ID[questId]) return;
    if (index < legacyIndex) next.completed[questId] = { completedAt: nowStamp(), migrated: true };
  });
  const currentId = LEGACY_MISSION_ORDER[legacyIndex];
  const current = currentId && QUESTS_BY_ID[currentId];
  if (current) {
    next.active[currentId] = progressFor(current, state.missionProgress);
    next.trackedIds = [currentId];
    next.primaryId = currentId;
  }
  state.quests = next;
  return next;
}

function normalizeQuestState(state) {
  const source = state.quests && typeof state.quests === 'object' ? state.quests : migrateLegacyState(state);
  const next = {
    ...blankQuestState(),
    ...source,
    version: QUEST_STATE_VERSION,
    active: { ...(source.active || {}) },
    completed: { ...(source.completed || {}) },
    failed: { ...(source.failed || {}) },
    availableIds: unique(source.availableIds).filter((id) => QUESTS_BY_ID[id]),
    trackedIds: unique(source.trackedIds).filter((id) => source.active?.[id] && QUESTS_BY_ID[id]).slice(0, MAX_TRACKED),
    flags: { ...(source.flags || {}) },
    decisions: { ...(source.decisions || {}) },
  };
  if (!next.primaryId || !next.active[next.primaryId]) next.primaryId = next.trackedIds[0] || Object.keys(next.active)[0] || null;
  state.quests = next;
  state.storyFlags = { ...(state.storyFlags || {}), ...next.flags };
  return next;
}

function isComplete(id) { return !!qs.completed[id]; }
function isActive(id) { return !!qs.active[id]; }
function isAvailable(id) { return qs.availableIds.includes(id); }
function prerequisitesMet(quest) { return quest.prerequisites.every((id) => isComplete(id)); }
function objectiveDone(quest, progress, objective) { return (progress.objectives[objective.id] || 0) >= objective.count; }
function questDone(quest, progress) {
  if (!quest.objectives.length) return true;
  if (quest.completionMode === 'any') return quest.objectives.some((objective) => objectiveDone(quest, progress, objective));
  return quest.objectives.filter((objective) => !objective.optional).every((objective) => objectiveDone(quest, progress, objective));
}

function startQuestInternal(id, { track = false, silent = false } = {}) {
  const quest = QUESTS_BY_ID[id];
  if (!quest || quest.implementation !== QUEST_IMPLEMENTATION.runtime) return false;
  if (isActive(id) || isComplete(id) || !prerequisitesMet(quest)) return false;
  qs.availableIds = qs.availableIds.filter((questId) => questId !== id);
  qs.active[id] = progressFor(quest);
  if ((track || quest.trackedByDefault) && qs.trackedIds.length < MAX_TRACKED) qs.trackedIds = unique([...qs.trackedIds, id]);
  if (!qs.primaryId || quest.trackedByDefault) qs.primaryId = id;
  if (!silent) deps.notify(`📌 New quest: ${quest.title}`);
  return true;
}

function refreshAvailability({ silent = true } = {}) {
  let changed = false;
  for (const quest of QUEST_CATALOG) {
    if (quest.implementation !== QUEST_IMPLEMENTATION.runtime) continue;
    if (isActive(quest.id) || isComplete(quest.id) || !prerequisitesMet(quest)) continue;
    if (quest.autoStart) changed = startQuestInternal(quest.id, { track: !!quest.trackedByDefault, silent }) || changed;
    else if (!qs.availableIds.includes(quest.id)) { qs.availableIds.push(quest.id); changed = true; }
  }
  qs.availableIds = unique(qs.availableIds).filter((id) => {
    const quest = QUESTS_BY_ID[id];
    return quest && quest.implementation === QUEST_IMPLEMENTATION.runtime && prerequisitesMet(quest) && !isActive(id) && !isComplete(id);
  });
  return changed;
}

function addInventoryItem(itemId) {
  deps.state.inventory = Array.isArray(deps.state.inventory) ? deps.state.inventory : [];
  const existing = deps.state.inventory.find((entry) => (typeof entry === 'string' ? entry === itemId : entry?.id === itemId));
  if (existing && typeof existing === 'object') existing.qty = (existing.qty || 1) + 1;
  else if (!existing) deps.state.inventory.push({ id: itemId, qty: 1 });
}

function applyRewards(quest) {
  const reward = quest.rewards || {};
  if (reward.money) deps.state.money = Math.max(0, (deps.state.money || 0) + reward.money);
  if (reward.stats) {
    deps.state.stats = deps.state.stats || {};
    Object.entries(reward.stats).forEach(([stat, amount]) => {
      deps.state.stats[stat] = clamp((deps.state.stats[stat] || 0) + Number(amount || 0));
    });
  }
  (reward.items || []).forEach(addInventoryItem);
  (reward.flags || []).forEach((flag) => {
    qs.flags[flag] = true;
    deps.state.storyFlags = deps.state.storyFlags || {};
    deps.state.storyFlags[flag] = true;
    if (['hasPermanentGills', 'hasDiscoveredAqualume', 'aqualumeMoonpoolSynchronized'].includes(flag)) deps.state[flag] = true;
  });
  if (reward.achievements) deps.state.achievements = unique([...(deps.state.achievements || []), ...reward.achievements]);
  if (reward.reputation) {
    deps.state.reputation = deps.state.reputation || {};
    Object.entries(reward.reputation).forEach(([scope, amount]) => {
      deps.state.reputation[scope] = (deps.state.reputation[scope] || 0) + Number(amount || 0);
    });
  }
  if (reward.relationship) {
    deps.state.npcMemory = deps.state.npcMemory || {};
    Object.entries(reward.relationship).forEach(([npcId, amount]) => {
      const memory = deps.state.npcMemory[npcId] || { familiarity: 0, flags: [] };
      memory.relationship = (memory.relationship || 0) + Number(amount || 0);
      deps.state.npcMemory[npcId] = memory;
    });
  }
}

function completeQuest(id) {
  const quest = QUESTS_BY_ID[id];
  if (!quest || !qs.active[id]) return false;
  applyRewards(quest);
  delete qs.active[id];
  qs.completed[id] = { completedAt: nowStamp() };
  qs.trackedIds = qs.trackedIds.filter((questId) => questId !== id);
  if (qs.primaryId === id) qs.primaryId = qs.trackedIds[0] || Object.keys(qs.active)[0] || null;
  const moneyNote = quest.rewards?.money ? ` +${quest.rewards.money.toLocaleString()} DreamBucks` : '';
  deps.notify(`🏁 Quest complete: ${quest.title}${moneyNote}`);
  refreshAvailability({ silent: false });
  return true;
}

function matchObjective(objective, type, arg) {
  if (objective.event !== type) return false;
  if (objective.arg === undefined || objective.arg === null) return true;
  return objective.arg === arg;
}
function eligibleObjectives(quest, progress) {
  const incomplete = quest.objectives.filter((objective) => !objectiveDone(quest, progress, objective));
  return quest.ordered ? incomplete.slice(0, 1) : incomplete;
}

export function missionEvent(type, arg) {
  if (!deps || !qs) return;
  let changed = false;
  const activeIds = Object.keys(qs.active);
  for (const id of activeIds) {
    const quest = QUESTS_BY_ID[id];
    const progress = qs.active[id];
    if (!quest || !progress) continue;
    const objective = eligibleObjectives(quest, progress).find((candidate) => matchObjective(candidate, type, arg));
    if (!objective) continue;
    const before = progress.objectives[objective.id] || 0;
    const after = Math.min(objective.count, before + 1);
    progress.objectives[objective.id] = after;
    changed = true;
    deps.notify(after >= objective.count ? `✅ ${objective.text}` : `◈ ${objective.text} (${after}/${objective.count})`);
    if (questDone(quest, progress)) completeQuest(id);
  }
  if (!changed) return;
  renderTracker();
  if (journalOpen) renderJournal();
  deps.saveNow();
}

export function acceptQuest(id, { track = true } = {}) {
  if (!deps || !qs || !isAvailable(id)) return false;
  const started = startQuestInternal(id, { track, silent: false });
  if (started) {
    renderTracker();
    renderJournal();
    deps.saveNow();
  }
  return started;
}

export function offerQuest(id) {
  const quest = QUESTS_BY_ID[id];
  if (!quest || isComplete(id) || isActive(id)) return false;
  if (quest.implementation !== QUEST_IMPLEMENTATION.runtime || !prerequisitesMet(quest)) return false;
  if (!qs.availableIds.includes(id)) qs.availableIds.push(id);
  renderJournal();
  deps.saveNow();
  return true;
}

export function canOfferQuest(id) {
  const quest = QUESTS_BY_ID[id];
  return !!(quest
    && quest.implementation === QUEST_IMPLEMENTATION.runtime
    && !isComplete(id)
    && !isActive(id)
    && prerequisitesMet(quest));
}

export function trackQuest(id, makePrimary = true) {
  if (!isActive(id)) return false;
  qs.trackedIds = unique([...qs.trackedIds, id]).slice(-MAX_TRACKED);
  if (makePrimary) qs.primaryId = id;
  renderTracker();
  renderJournal();
  deps.saveNow();
  return true;
}

export function untrackQuest(id) {
  qs.trackedIds = qs.trackedIds.filter((questId) => questId !== id);
  if (qs.primaryId === id) qs.primaryId = qs.trackedIds[0] || Object.keys(qs.active)[0] || null;
  renderTracker();
  renderJournal();
  deps.saveNow();
}

export function recordStoryChoice(choiceId, optionId) {
  if (!qs) return false;
  qs.decisions[choiceId] = { optionId, chosenAt: nowStamp() };
  qs.flags[`choice:${choiceId}:${optionId}`] = true;
  deps.state.storyFlags = { ...(deps.state.storyFlags || {}), [`choice:${choiceId}:${optionId}`]: true };
  deps.saveNow();
  return true;
}

function questStatus(quest) {
  if (isComplete(quest.id)) return 'completed';
  if (isActive(quest.id)) return 'active';
  if (isAvailable(quest.id)) return 'available';
  if (quest.implementation === QUEST_IMPLEMENTATION.planned && prerequisitesMet(quest)) return 'planned';
  return 'locked';
}
function questVisible(quest) {
  if (!quest.secret) return true;
  return isComplete(quest.id) || isActive(quest.id) || isAvailable(quest.id) || prerequisitesMet(quest);
}

function releaseGameplayKeys() {
  ['w', 'a', 's', 'd', 'shift', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].forEach((key) => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
  });
}
function otherMenuIsOpen() {
  return !!document.querySelector('#dialogue:not(.hidden), #shop:not(.hidden), #builder:not(.hidden), #creator:not(.hidden)');
}

function injectStyles() {
  if (document.getElementById('quest-system-styles')) return;
  const style = document.createElement('style');
  style.id = 'quest-system-styles';
  style.textContent = `
    #quest-journal{position:fixed;inset:0;z-index:240;display:none;align-items:center;justify-content:center;background:rgba(4,4,10,.93);font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#fff;}
    #quest-journal.open{display:flex}.qj-panel{width:min(1120px,95vw);height:min(760px,92vh);background:#15151f;border:1px solid #33334a;border-radius:18px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 70px rgba(0,0,0,.6)}
    .qj-head{display:flex;justify-content:space-between;gap:16px;padding:20px 22px 12px;border-bottom:1px solid #33334a}.qj-head h1{font-size:28px;margin:0}.qj-sub{font-size:13px;color:#9a9ab0;margin-top:3px}.qj-close{align-self:flex-start}
    .qj-tabs{display:flex;gap:7px;padding:10px 18px;border-bottom:1px solid #2b2b40;overflow-x:auto}.qj-tab{border:1px solid #33334a;background:#1d1d2b;color:#cfd6e4;border-radius:999px;padding:8px 14px;font-weight:750;cursor:pointer;white-space:nowrap}.qj-tab.active{background:#4eff91;color:#06210f;border-color:#4eff91}
    .qj-layout{display:grid;grid-template-columns:minmax(300px,42%) 1fr;gap:0;min-height:0;flex:1}.qj-list{overflow-y:auto;padding:14px;border-right:1px solid #33334a;display:flex;flex-direction:column;gap:9px}.qj-card{background:#1d1d2b;border:1px solid #33334a;border-radius:13px;padding:12px;text-align:left;color:#fff;cursor:pointer}.qj-card:hover,.qj-card.selected{border-color:#4eff91}.qj-card.selected{box-shadow:inset 3px 0 #4eff91}
    .qj-card-top{display:flex;justify-content:space-between;gap:8px}.qj-card-title{font-size:15px;font-weight:850}.qj-card-meta{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8a8aa0;margin-top:4px}.qj-card-summary{font-size:12px;color:#bec5d8;line-height:1.4;margin-top:7px}.qj-status{font-size:10px;font-weight:850;padding:3px 7px;border-radius:999px;background:#2b2b3c;color:#c9d2e7;height:max-content}.qj-status.active{background:#173f2a;color:#7dffae}.qj-status.available{background:#3f3517;color:#ffe58b}.qj-status.completed{background:#25324d;color:#9fe8ff}.qj-status.planned{background:#34264a;color:#d7b6ff}.qj-status.locked{opacity:.65}
    .qj-detail{overflow-y:auto;padding:22px 24px}.qj-kicker{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#9fe8ff}.qj-detail h2{font-size:27px;margin:4px 0 7px}.qj-detail-summary{font-size:14px;color:#c9cede;line-height:1.55;margin-bottom:16px}.qj-objectives{display:flex;flex-direction:column;gap:8px;margin:12px 0}.qj-objective{display:flex;gap:10px;padding:10px;border-radius:10px;background:#1d1d2b;border:1px solid #303047;color:#dfe5f3;font-size:13px}.qj-objective.done{opacity:.55;text-decoration:line-through}.qj-dot{width:15px;height:15px;border-radius:50%;border:1.5px solid #53617d;flex:0 0 auto;margin-top:1px}.qj-objective.done .qj-dot{background:#4eff91;border-color:#4eff91}
    .qj-reward,.qj-consequence{margin-top:14px;padding:12px;border-radius:11px;background:#11111b;border:1px solid #2c2c40;font-size:12px;color:#bfc7da;line-height:1.5}.qj-consequence{border-left:3px solid #e7c14a}.qj-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}.qj-btn{border:0;border-radius:10px;padding:10px 15px;font-weight:850;cursor:pointer;background:#4eff91;color:#06210f}.qj-btn.secondary{background:#1d1d2b;color:#e8ebf4;border:1px solid #3b3b55}.qj-btn:disabled{opacity:.45;cursor:not-allowed}.qj-empty{padding:30px;text-align:center;color:#8a8aa0}.qj-progress{font-variant-numeric:tabular-nums;color:#9fe8ff;margin-left:auto}
    #mission-tracker{pointer-events:auto;cursor:pointer}#mission-tracker:hover{border-color:rgba(78,255,145,.65)}
    @media(max-width:760px){.qj-layout{grid-template-columns:1fr}.qj-list{border-right:0;border-bottom:1px solid #33334a;max-height:39vh}.qj-detail{padding:16px}.qj-panel{height:96vh}.qj-head h1{font-size:23px}}
  `;
  document.head.appendChild(style);
}

function mountJournal() {
  if (uiMounted) return;
  injectStyles();
  const overlay = document.createElement('div');
  overlay.id = 'quest-journal';
  overlay.innerHTML = `
    <div class="qj-panel" role="dialog" aria-modal="true" aria-label="Quest Journal">
      <div class="qj-head"><div><h1>Quest Journal</h1><div class="qj-sub">Track up to ${MAX_TRACKED} quests. Press Q to open or close.</div></div><button class="qj-btn secondary qj-close" type="button">Close (Q / Esc)</button></div>
      <div class="qj-tabs"></div><div class="qj-layout"><div class="qj-list"></div><div class="qj-detail"></div></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.qj-close').addEventListener('click', closeQuestJournal);
  overlay.addEventListener('pointerdown', (event) => { if (event.target === overlay) closeQuestJournal(); });
  const tracker = document.getElementById('mission-tracker');
  if (tracker) { tracker.title = 'Open Quest Journal (Q)'; tracker.addEventListener('click', openQuestJournal); }
  const hint = document.getElementById('hint');
  if (hint && !hint.textContent.toLowerCase().includes('q quests')) hint.insertAdjacentHTML('beforeend', ' · <b>Q</b> quests');
  uiMounted = true;
}

function questsForTab(tabId) {
  const visible = QUEST_CATALOG.filter(questVisible);
  if (tabId === 'completed') return visible.filter((quest) => isComplete(quest.id));
  if (tabId === 'tracked') {
    const tracked = qs.trackedIds.map((id) => QUESTS_BY_ID[id]).filter(Boolean);
    const activeUntracked = Object.keys(qs.active).filter((id) => !qs.trackedIds.includes(id)).map((id) => QUESTS_BY_ID[id]).filter(Boolean);
    const available = qs.availableIds.map((id) => QUESTS_BY_ID[id]).filter(Boolean);
    return [...tracked, ...activeUntracked, ...available];
  }
  return visible.filter((quest) => quest.category === tabId && !isComplete(quest.id));
}

function rewardText(quest) {
  const reward = quest.rewards || {};
  const parts = [];
  if (reward.money) parts.push(`${reward.money.toLocaleString()} DreamBucks`);
  if (reward.stats) parts.push(Object.entries(reward.stats).map(([key, value]) => `${key} ${value >= 0 ? '+' : ''}${value}`).join(', '));
  if (reward.items?.length) parts.push(`Items: ${reward.items.join(', ')}`);
  if (reward.achievements?.length) parts.push(`Achievement: ${reward.achievements.join(', ')}`);
  return parts.length ? parts.join(' · ') : 'Story progress, access, or relationship changes';
}

function renderDetail(quest) {
  const detail = document.querySelector('#quest-journal .qj-detail');
  if (!quest) { detail.innerHTML = '<div class="qj-empty">Choose a quest to inspect its objectives, rewards, and consequences.</div>'; return; }
  const status = questStatus(quest);
  const progress = qs.active[quest.id];
  const objectives = quest.objectives.map((objective) => {
    const count = progress?.objectives?.[objective.id] || 0;
    const done = isComplete(quest.id) || count >= objective.count;
    const counter = objective.count > 1 ? `<span class="qj-progress">${Math.min(count, objective.count)}/${objective.count}</span>` : '';
    return `<div class="qj-objective ${done ? 'done' : ''}"><span class="qj-dot"></span><span>${objective.text}</span>${counter}</div>`;
  }).join('') || '<div class="qj-empty">No objectives listed yet.</div>';
  const consequence = quest.consequenceRefs.map(consequenceById).filter(Boolean)[0];
  const consequenceHtml = consequence ? `<div class="qj-consequence"><strong>Choice matters:</strong> ${consequence.summary || consequence.title}</div>` : '';
  let actions = '';
  if (status === 'available') actions += `<button class="qj-btn" data-action="accept" data-id="${quest.id}">Accept quest</button>`;
  if (status === 'active') {
    const tracked = qs.trackedIds.includes(quest.id);
    actions += `<button class="qj-btn" data-action="primary" data-id="${quest.id}">${qs.primaryId === quest.id ? 'Primary quest' : 'Make primary'}</button>`;
    actions += `<button class="qj-btn secondary" data-action="${tracked ? 'untrack' : 'track'}" data-id="${quest.id}">${tracked ? 'Untrack' : 'Track'}</button>`;
  }
  if (status === 'planned') actions += '<button class="qj-btn secondary" disabled>Planned storyline</button>';
  if (status === 'locked') actions += '<button class="qj-btn secondary" disabled>Locked</button>';
  const category = QUEST_CATEGORIES[quest.category]?.label || quest.category;
  detail.innerHTML = `<div class="qj-kicker">${category} · ${quest.townId.replaceAll('-', ' ')}</div><h2>${quest.title}</h2><div class="qj-detail-summary">${quest.summary}</div><div class="qj-objectives">${objectives}</div><div class="qj-reward"><strong>Rewards:</strong> ${rewardText(quest)}</div>${consequenceHtml}<div class="qj-actions">${actions}</div>`;
  detail.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const { action, id } = button.dataset;
      if (action === 'accept') acceptQuest(id);
      if (action === 'track' || action === 'primary') trackQuest(id, true);
      if (action === 'untrack') untrackQuest(id);
    });
  });
}

function renderJournal() {
  if (typeof document === 'undefined') return;
  if (!uiMounted || !qs) return;
  const tabs = document.querySelector('#quest-journal .qj-tabs');
  const list = document.querySelector('#quest-journal .qj-list');
  if (!tabs || !list) return;
  tabs.innerHTML = '';
  JOURNAL_TABS.forEach(([id, label]) => {
    const button = document.createElement('button');
    button.className = `qj-tab${activeTab === id ? ' active' : ''}`;
    button.textContent = label;
    button.addEventListener('click', () => { activeTab = id; selectedQuestId = null; renderJournal(); });
    tabs.appendChild(button);
  });
  const quests = questsForTab(activeTab);
  if (!quests.length) { list.innerHTML = '<div class="qj-empty">Nothing in this section yet.</div>'; renderDetail(null); return; }
  if (!selectedQuestId || !quests.some((quest) => quest.id === selectedQuestId)) selectedQuestId = quests[0].id;
  list.innerHTML = '';
  quests.forEach((quest) => {
    const status = questStatus(quest);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `qj-card${selectedQuestId === quest.id ? ' selected' : ''}`;
    card.innerHTML = `<div class="qj-card-top"><span class="qj-card-title">${quest.title}</span><span class="qj-status ${status}">${status}</span></div><div class="qj-card-meta">${QUEST_CATEGORIES[quest.category]?.label || quest.category} · ${quest.townId.replaceAll('-', ' ')}</div><div class="qj-card-summary">${quest.summary}</div>`;
    card.addEventListener('click', () => { selectedQuestId = quest.id; renderJournal(); });
    list.appendChild(card);
  });
  renderDetail(QUESTS_BY_ID[selectedQuestId]);
}

export function openQuestJournal() {
  if (!deps || !uiMounted || journalOpen) return false;
  if (otherMenuIsOpen()) { deps.notify('Close the current menu before opening Quests.'); return false; }
  releaseGameplayKeys();
  document.exitPointerLock?.();
  journalOpen = true;
  document.getElementById('quest-journal').classList.add('open');
  renderJournal();
  return true;
}
export function closeQuestJournal() {
  if (!uiMounted || !journalOpen) return false;
  journalOpen = false;
  document.getElementById('quest-journal').classList.remove('open');
  return true;
}
export function toggleQuestJournal() { return journalOpen ? closeQuestJournal() : openQuestJournal(); }

function bindInput() {
  if (inputBound) return;
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target?.isContentEditable;
    if (typing) return;
    if (key === 'q' && !event.repeat) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleQuestJournal();
      return;
    }
    if (!journalOpen) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape') closeQuestJournal();
  }, true);
  window.addEventListener('keyup', (event) => {
    if (!journalOpen) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  inputBound = true;
}

export function renderTracker() {
  if (typeof document === 'undefined') return;
  const element = document.getElementById('mission-tracker');
  if (!element || !qs) return;
  const primaryId = qs.primaryId && qs.active[qs.primaryId] ? qs.primaryId : qs.trackedIds.find((id) => qs.active[id]) || Object.keys(qs.active)[0] || null;
  qs.primaryId = primaryId;
  if (!primaryId) {
    const available = qs.availableIds.length;
    element.style.display = '';
    element.innerHTML = `<div class="mt-label">Quests · Q</div><div class="mt-title">${available ? `${available} available` : 'All caught up'}</div><div class="mt-obj"><span class="mt-tick"></span>Open the Quest Journal</div>`;
    return;
  }
  const quest = QUESTS_BY_ID[primaryId];
  const progress = qs.active[primaryId];
  const rows = quest.objectives.filter((objective) => !objectiveDone(quest, progress, objective)).slice(0, 2).map((objective) => {
    const count = progress.objectives[objective.id] || 0;
    const suffix = objective.count > 1 ? ` (${count}/${objective.count})` : '';
    return `<div class="mt-obj"><span class="mt-tick"></span>${objective.text}${suffix}</div>`;
  }).join('');
  element.style.display = '';
  element.innerHTML = `<div class="mt-label">Quest · Q</div><div class="mt-title">${quest.title}</div>${rows}`;
}

export function initMissions(runtimeDeps) {
  deps = runtimeDeps;
  qs = normalizeQuestState(deps.state);
  const headless = !!runtimeDeps.headless || typeof document === 'undefined' || typeof window === 'undefined';
  if (!headless) {
    mountJournal();
    bindInput();
  }
  refreshAvailability({ silent: true });
  if (!Object.keys(qs.active).length && !Object.keys(qs.completed).length) startQuestInternal('welcome-to-dreamdrop', { track: true, silent: true });
  renderTracker();
  deps.saveNow();
}

export function activeMissionId() { return qs?.primaryId || null; }
export function getQuestSnapshot() { return qs ? JSON.parse(JSON.stringify(qs)) : null; }

export function questNavigationTargetFor(objective) {
  if (!objective) return null;
  const exactKey = `${objective.event}:${objective.arg ?? ''}`;
  return OBJECTIVE_NAVIGATION_TARGETS[exactKey]
    || OBJECTIVE_NAVIGATION_TARGETS[objective.event]
    || null;
}

export function activeQuestGuidance() {
  if (!qs) return null;
  const questId = qs.primaryId && qs.active[qs.primaryId]
    ? qs.primaryId
    : qs.trackedIds.find((id) => qs.active[id]) || Object.keys(qs.active)[0] || null;
  const quest = questId && QUESTS_BY_ID[questId];
  const progress = questId && qs.active[questId];
  if (!quest || !progress) return null;
  const objective = eligibleObjectives(quest, progress)
    .find((entry) => !!questNavigationTargetFor(entry));
  if (!objective) return null;
  return Object.freeze({
    questId,
    questTitle: quest.title,
    objectiveId: objective.id,
    objectiveText: objective.text,
    targetId: questNavigationTargetFor(objective),
  });
}
