// ───────────────────────────────────────────────────────────────────────────
//  animationStateMachine.js — additive, NON-BREAKING character animation FSM.
//
//  WHY THIS EXISTS
//  The current avatars animate two ways:
//    1. Procedural leg/arm swing driven each frame in main.js updatePlayer() /
//       the NPC + cop updaters (no clips — just sin-wave joint rotation).
//    2. Skinned GLB clips played through three's AnimationMixer, tracked by
//       manifest.js trackMixer()/updateMixers(dt) (used by GLB skins + monsters).
//
//  As we move characters onto rigged GLBs with real Mixamo/RPM clips, we need a
//  single place that decides WHICH logical state a character is in (idle, walk,
//  run, drive, …) and maps that to either a procedural pose or a named GLB clip
//  — with smooth cross-fades and a clean fallback when a clip is missing.
//
//  This module is a SKELETON: it is intentionally NOT wired into updatePlayer()
//  yet, so it cannot regress the existing leg-swing. Adopt it incrementally:
//  build one AnimationController per character, call controller.set(state) when
//  game logic changes (moving/sprinting/in-car/shooting…), and call
//  controller.update(dt) each frame. If the character has a GLB mixer + clips it
//  cross-fades them; otherwise it just records the state so the existing
//  procedural code (or a future procedural poser) can read it.
//
//  No three.js import is required here — we only touch the mixer/actions object
//  shape that assets.js makeMixer() already returns, so this stays dependency
//  light and unit-testable.
// ───────────────────────────────────────────────────────────────────────────

// Canonical logical states. Keep this list authoritative — docs/ANIMATION_STATE_MACHINE.md
// mirrors it, and town/minigame configs reference these ids by string.
export const STATES = Object.freeze({
  IDLE: 'idle',
  WALK: 'walk',
  RUN: 'run',
  JUMP: 'jump',
  FALL: 'fall',
  SIT: 'sit',
  DRIVE: 'drive',
  PUNCH: 'punch',
  MELEE: 'melee',
  GUN_HOLD: 'gun-hold',
  SHOOT: 'shoot',
  RELOAD: 'reload',
  HIT: 'hit',
  DOWNED: 'downed',
  WORKOUT: 'workout',
  EAT: 'eat',
  FISH: 'fish',
  DANCE: 'dance',
  TALK: 'talk',
  SWIM: 'swim',
});

// Default clip-name candidates per state. The controller picks the FIRST clip
// whose name (case-insensitive) contains any candidate. This lets a single FSM
// drive Mixamo ("Walking", "Idle"), RPM ("M_Walk_001"), and hand-authored
// ("walk") naming schemes without per-asset config. Extend per-pack if needed.
export const CLIP_ALIASES = Object.freeze({
  [STATES.IDLE]: ['idle', 'breathing', 'stand'],
  [STATES.WALK]: ['walk', 'walking'],
  [STATES.RUN]: ['run', 'running', 'jog', 'sprint'],
  [STATES.JUMP]: ['jump', 'jumping'],
  [STATES.FALL]: ['fall', 'falling', 'air'],
  [STATES.SIT]: ['sit', 'sitting', 'seated'],
  [STATES.DRIVE]: ['drive', 'driving', 'sit', 'seated'],
  [STATES.PUNCH]: ['punch', 'jab', 'hook'],
  [STATES.MELEE]: ['melee', 'swing', 'slash', 'bat', 'attack'],
  [STATES.GUN_HOLD]: ['aim', 'gun', 'rifle', 'pistol', 'hold'],
  [STATES.SHOOT]: ['shoot', 'fire', 'shot'],
  [STATES.RELOAD]: ['reload'],
  [STATES.HIT]: ['hit', 'impact', 'flinch', 'hurt'],
  [STATES.DOWNED]: ['death', 'dead', 'down', 'ko', 'fall'],
  [STATES.WORKOUT]: ['workout', 'pushup', 'situp', 'lift', 'exercise'],
  [STATES.EAT]: ['eat', 'drink', 'food'],
  [STATES.FISH]: ['fish', 'cast', 'rod'],
  [STATES.DANCE]: ['dance', 'dancing'],
  [STATES.TALK]: ['talk', 'talking', 'wave', 'gesture'],
  [STATES.SWIM]: ['swim', 'swimming'],
});

// Allowed transitions. `null` = reachable from any state (interrupts). Used to
// reject nonsense transitions (e.g. RELOAD straight into SWIM) so future logic
// stays readable. Unlisted target → allowed by default (permissive skeleton).
export const TRANSITIONS = Object.freeze({
  [STATES.IDLE]: null,
  [STATES.WALK]: [STATES.IDLE, STATES.RUN, STATES.JUMP, STATES.GUN_HOLD, STATES.TALK, STATES.DRIVE],
  [STATES.RUN]: [STATES.WALK, STATES.IDLE, STATES.JUMP],
  [STATES.SHOOT]: [STATES.GUN_HOLD],
  [STATES.RELOAD]: [STATES.GUN_HOLD],
  [STATES.DRIVE]: null,
  [STATES.DOWNED]: null,
});

// Per-state defaults: whether the clip loops, and a sensible cross-fade time.
const STATE_META = {
  [STATES.SHOOT]: { loop: false, fade: 0.05 },
  [STATES.RELOAD]: { loop: false, fade: 0.1 },
  [STATES.PUNCH]: { loop: false, fade: 0.08 },
  [STATES.MELEE]: { loop: false, fade: 0.08 },
  [STATES.JUMP]: { loop: false, fade: 0.1 },
  [STATES.HIT]: { loop: false, fade: 0.05 },
  [STATES.EAT]: { loop: false, fade: 0.15 },
  [STATES.DOWNED]: { loop: false, fade: 0.2 },
};
const DEFAULT_META = { loop: true, fade: 0.18 };
const metaFor = (s) => STATE_META[s] || DEFAULT_META;

// Resolve a logical state → an actual clip name present on this character.
// `clipNames` = array of clip names found on the GLB (animations[].name).
export function resolveClip(state, clipNames) {
  if (!clipNames || !clipNames.length) return null;
  const aliases = CLIP_ALIASES[state] || [state];
  const lower = clipNames.map((n) => ({ raw: n, low: String(n).toLowerCase() }));
  for (const a of aliases) {
    const hit = lower.find((c) => c.low.includes(a));
    if (hit) return hit.raw;
  }
  return null;
}

function canTransition(from, to) {
  if (from === to) return false;
  const rule = TRANSITIONS[from];
  if (rule === undefined) return true;   // unlisted = permissive
  if (rule === null) return true;        // interruptible from anywhere
  return rule.includes(to);
}

// One controller per character. `opts.mixer` is the object returned by
// assets.js makeMixer() (has .play(name,{loop,fade}) + .clipNames? ) OR null for
// a purely-procedural avatar. `opts.clipNames` lists available GLB clip names.
export class AnimationController {
  constructor(opts = {}) {
    this.mixer = opts.mixer || null;
    this.clipNames = opts.clipNames || (this.mixer && this.mixer.clipNames) || [];
    this.state = opts.initial || STATES.IDLE;
    this.prev = null;
    this.onState = opts.onState || null;   // hook: (state, prev) => void  (procedural poser can subscribe)
    this._activeClip = null;
    this._applyClip(this.state, true);
  }

  // Returns the resolved clip name (or null when procedural-only / missing clip).
  has(state) { return !!resolveClip(state, this.clipNames); }

  // Request a state change. No-op if blocked by the transition table or already
  // active (for looping states). Returns true if the state actually changed.
  set(state, { force = false } = {}) {
    if (!Object.values(STATES).includes(state)) return false;
    if (state === this.state && !force) return false;
    if (!force && !canTransition(this.state, state)) return false;
    this.prev = this.state;
    this.state = state;
    this._applyClip(state, false);
    if (this.onState) this.onState(state, this.prev);
    return true;
  }

  _applyClip(state, immediate) {
    if (!this.mixer || !this.mixer.play) { this._activeClip = null; return; }
    const clip = resolveClip(state, this.clipNames);
    if (!clip) { this._activeClip = null; return; }   // fall back to procedural / hold last
    const meta = metaFor(state);
    this.mixer.play(clip, { loop: meta.loop, fade: immediate ? 0 : meta.fade });
    this._activeClip = clip;
  }

  // Convenience: pick movement state from a speed value (engine-agnostic).
  setLocomotion(speed, { runThreshold = 4.5, moveThreshold = 0.2 } = {}) {
    if (speed >= runThreshold) return this.set(STATES.RUN);
    if (speed >= moveThreshold) return this.set(STATES.WALK);
    return this.set(STATES.IDLE);
  }

  // Drive the underlying GLB mixer. Safe no-op for procedural-only characters
  // (those are still advanced by the existing manifest.js updateMixers()).
  update(dt) {
    if (this.mixer && typeof this.mixer.update === 'function') this.mixer.update(dt);
  }
}

// Factory so call sites don't import the class directly if they prefer functions.
export function createAnimationController(opts) { return new AnimationController(opts); }
