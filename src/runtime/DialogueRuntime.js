// ─────────────────────────────────────────────────────────────────────────────
// DialogueRuntime.js — resolves the canonical authored dialogue trees against
// the live player save. The renderer stays UI-agnostic: it returns the same
// {name,text,choices} shape used by ui.openDialogue and delegates game services.
// ───────────────────────────────────────────────────────────────────────────────
import { DIALOGUE_TREES } from '../config/npcDialogueTrees.js';
import { NPCS_BY_ID, relationshipStage } from '../config/npcStoryCatalog.js';

const asList = (value) => Array.isArray(value) ? value : [value];

function convictionExists(state, townId) {
  const value = state?.crimeRecord?.convictionsByTown?.[townId];
  return Array.isArray(value) ? value.length > 0 : !!value;
}

function fallbackStageText(textByStage, stage) {
  if (!textByStage) return '';
  const order = stage === 'close'
    ? ['close', 'trusted', 'regular', 'familiar', 'stranger']
    : stage === 'hostile'
      ? ['hostile', 'rival', 'stranger', 'familiar']
      : stage === 'rival'
        ? ['rival', 'stranger', 'familiar']
        : [stage, 'regular', 'familiar', 'stranger', 'trusted'];
  return order.map((key) => textByStage[key]).find(Boolean) || Object.values(textByStage)[0] || '';
}

export class DialogueRuntime {
  constructor({
    state = () => ({}),
    quests = () => null,
    actions = {},
    canOfferQuest = () => true,
    save = () => {},
    random = Math.random,
  } = {}) {
    this.getState = typeof state === 'function' ? state : () => state;
    this.getQuests = typeof quests === 'function' ? quests : () => quests;
    this.actions = actions;
    this.canOfferQuest = canOfferQuest;
    this.save = save;
    this.random = random;
  }

  memory(npcId) {
    const state = this.getState();
    state.npcMemory = state.npcMemory || {};
    const memory = state.npcMemory[npcId] || {
      greeted: false,
      timesTalked: 0,
      relationship: 0,
      flags: [],
    };
    state.npcMemory[npcId] = memory;
    return memory;
  }

  begin(npcId) {
    if (!DIALOGUE_TREES[npcId]) return null;
    const state = this.getState();
    const memory = this.memory(npcId);
    const first = !memory.greeted;
    const newDay = memory.lastConversationDay !== state.day;
    memory.greeted = true;
    memory.timesTalked = (memory.timesTalked || 0) + 1;
    memory.lastDay = state.day;
    memory.lastConversationDay = state.day;
    if (first) memory.relationship = (memory.relationship || 0) + 4;
    else if (newDay) memory.relationship = (memory.relationship || 0) + 2;
    else memory.relationship = (memory.relationship || 0) + 0.25;
    this.save();
    return this.view(npcId, DIALOGUE_TREES[npcId].start || 'greet');
  }

  meets(requirements, npcId) {
    if (!requirements) return true;
    const state = this.getState();
    const quests = this.getQuests() || {};
    const flags = { ...(state.storyFlags || {}), ...(quests.flags || {}) };
    const relationship = Number(this.memory(npcId).relationship) || 0;

    if (requirements.flag && !asList(requirements.flag).every((flag) => !!flags[flag])) return false;
    if (requirements.flagNot && !asList(requirements.flagNot).every((flag) => !flags[flag])) return false;
    if (requirements.questComplete && !asList(requirements.questComplete).every((id) => !!quests.completed?.[id])) return false;
    if (requirements.questNotStarted && !asList(requirements.questNotStarted)
      .every((id) => !quests.active?.[id] && !quests.completed?.[id])) return false;
    if (requirements.minRelationship != null && relationship < Number(requirements.minRelationship)) return false;
    if (requirements.wantedAbove != null && (Number(state.wanted) || 0) <= Number(requirements.wantedAbove)) return false;
    if (requirements.localConviction && !convictionExists(state, requirements.localConviction)) return false;
    if (requirements.noLocalConviction && convictionExists(state, requirements.noLocalConviction)) return false;
    if (requirements.minStat && !Object.entries(requirements.minStat)
      .every(([id, value]) => (Number(state.stats?.[id]) || 0) >= Number(value))) return false;
    if (requirements.reputationAbove && !Object.entries(requirements.reputationAbove)
      .every(([id, value]) => (Number(state.reputation?.[id]) || 0) >= Number(value))) return false;
    if (requirements.reputationBelow && !Object.entries(requirements.reputationBelow)
      .every(([id, value]) => (Number(state.reputation?.[id]) || 0) <= Number(value))) return false;
    return true;
  }

  textFor(node, npcId) {
    const memory = this.memory(npcId);
    let text = node.text || '';
    if (node.textByStage) text = fallbackStageText(node.textByStage, relationshipStage(memory.relationship || 0));
    if (node.textByState) {
      const selected = node.textByState.find((entry) => this.meets(entry.requires, npcId));
      if (selected?.text) text = selected.text;
    }
    if (node.textPool?.length) text = node.textPool[Math.floor(this.random() * node.textPool.length)] || text;
    const reaction = node.reactions?.find((entry) => this.meets(entry.requires, npcId));
    return reaction?.text ? `${text} ${reaction.text}`.trim() : text;
  }

  execute(npcId, nodeId, action) {
    if (action.close) return undefined;
    if (action.openService) {
      const result = this.actions.openService?.(action.openService, npcId);
      return result === undefined ? 'keep' : result;
    }
    if (action.offerQuest) {
      this.actions.offerQuest?.(action.offerQuest, npcId);
      return this.view(npcId, nodeId);
    }
    if (action.setFlag) {
      const state = this.getState();
      state.storyFlags = { ...(state.storyFlags || {}), [action.setFlag]: true };
      this.actions.setFlag?.(action.setFlag, npcId);
      this.save();
      return this.view(npcId, nodeId);
    }
    if (action.setRelationship != null) {
      const memory = this.memory(npcId);
      memory.relationship = (Number(memory.relationship) || 0) + Number(action.setRelationship);
      this.actions.setRelationship?.(Number(action.setRelationship), npcId);
      this.save();
      return this.view(npcId, nodeId);
    }
    if (action.storyChoice) {
      this.actions.storyChoice?.(action.storyChoice, 'dialogue', npcId);
      return this.view(npcId, nodeId);
    }
    return undefined;
  }

  view(npcId, nodeId = 'greet') {
    const tree = DIALOGUE_TREES[npcId];
    const npc = NPCS_BY_ID[npcId];
    const node = tree?.nodes?.[nodeId];
    if (!tree || !npc || !node) return null;
    const options = (node.options || []).filter((option) => {
      if (!this.meets(option.requires, npcId)) return false;
      if (option.action?.offerQuest && !this.canOfferQuest(option.action.offerQuest)) return false;
      return true;
    });
    return {
      name: npc.name,
      text: this.textFor(node, npcId),
      choices: options.map((option) => ({
        label: option.label,
        onPick: () => option.goto
          ? this.view(npcId, option.goto)
          : this.execute(npcId, nodeId, option.action || { close: true }),
      })),
    };
  }
}

export default DialogueRuntime;
