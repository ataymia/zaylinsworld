// ───────────────────────────────────────────────────────────────────────────
//  minigames/minigameRunner.js — shared lifecycle driver skeleton (NOT wired).
//
//  Generalizes the proven startTimingGame() flow into a reusable state machine:
//    start → instructions → countdown → active → success/fail → reward → exit
//  with a replay cooldown. Engine-agnostic: it calls optional `hooks` you supply
//  and never touches THREE or the DOM directly, so it stays testable and safe to
//  import. Nothing here runs until a future game constructs and start()s it.
//
//  See docs/MINIGAME_FRAMEWORK.md §1 and §5.
// ───────────────────────────────────────────────────────────────────────────

export const PHASES = Object.freeze({
  IDLE: 'idle', INSTRUCTIONS: 'instructions', COUNTDOWN: 'countdown',
  ACTIVE: 'active', SUCCESS: 'success', FAIL: 'fail', REWARD: 'reward', EXIT: 'exit',
});

// Track last-finish times per minigame id to enforce cooldowns across runs.
const _lastFinish = new Map();

export class MinigameRunner {
  // descriptor: a catalog entry (see minigameCatalog.js).
  // hooks: { canStart, onInstructions, onCountdown, onActive(ctx,dt), onResult,
  //          onReward, onExit, showMessage } — all optional.
  constructor({ descriptor, hooks = {} } = {}) {
    if (!descriptor || !descriptor.id) throw new TypeError('descriptor with id required');
    this.d = descriptor;
    this.h = hooks;
    this.phase = PHASES.IDLE;
    this.score = 0;
    this.timeLeft = descriptor.duration || 0;
    this._countdown = 3;
  }

  // Returns { ok, reason } — checks cooldown + caller-supplied canStart gate.
  canStart() {
    const last = _lastFinish.get(this.d.id) || 0;
    const cd = this.d.cooldown || 0;
    const since = (Date.now() - last) / 1000;
    if (cd && since < cd) return { ok: false, reason: `cooldown ${Math.ceil(cd - since)}s` };
    if (this.h.canStart && !this.h.canStart()) return { ok: false, reason: 'entry requirements not met' };
    return { ok: true };
  }

  start() {
    const gate = this.canStart();
    if (!gate.ok) { this._msg(`Can't start: ${gate.reason}`); return false; }
    this.phase = PHASES.INSTRUCTIONS;
    this.score = 0;
    this.timeLeft = this.d.duration || 0;
    this._countdown = 3;
    if (this.h.onInstructions) this.h.onInstructions(this.d.instructions || '');
    return true;
  }

  // Advance from instructions → countdown (called when the player dismisses
  // instructions / presses go).
  beginCountdown() {
    if (this.phase !== PHASES.INSTRUCTIONS) return;
    this.phase = PHASES.COUNTDOWN;
    if (this.h.onCountdown) this.h.onCountdown(this._countdown);
  }

  // Per-frame tick. The owner calls this each frame with dt (seconds).
  update(dt) {
    if (this.phase === PHASES.COUNTDOWN) {
      this._countdown -= dt;
      if (this._countdown <= 0) { this.phase = PHASES.ACTIVE; }
      else if (this.h.onCountdown) this.h.onCountdown(Math.ceil(this._countdown));
      return;
    }
    if (this.phase === PHASES.ACTIVE) {
      if (this.h.onActive) this.h.onActive(this, dt);
      if (this.d.duration) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) this.finish(this.score > 0);
      }
    }
  }

  addScore(n) { if (this.phase === PHASES.ACTIVE) this.score += n; }

  // Resolve the run. `won` decides success/fail; reward only applies on success.
  finish(won) {
    if (this.phase === PHASES.SUCCESS || this.phase === PHASES.FAIL || this.phase === PHASES.EXIT) return;
    this.phase = won ? PHASES.SUCCESS : PHASES.FAIL;
    if (this.h.onResult) this.h.onResult(won, this.score);
    if (won) {
      this.phase = PHASES.REWARD;
      const reward = this._scaledReward();
      if (this.h.onReward) this.h.onReward(reward);
    }
    _lastFinish.set(this.d.id, Date.now());
    this.phase = PHASES.EXIT;
    if (this.h.onExit) this.h.onExit(won, this.score);
  }

  // Scale a [min,max] money reward by score (simple linear normalization); fixed
  // rewards pass through unchanged. Stats/items copy as-is.
  _scaledReward() {
    const r = this.d.reward || {};
    const out = { stat: r.stat || null, items: r.items || [] };
    if (Array.isArray(r.money)) {
      const [min, max] = r.money;
      const f = Math.max(0, Math.min(1, this.score / 100));
      out.money = Math.round(min + (max - min) * f);
    } else if (typeof r.money === 'number') {
      out.money = r.money;
    } else {
      out.money = 0;
    }
    return out;
  }

  _msg(m) { if (this.h.showMessage) this.h.showMessage(m); }
}

export function createRunner(opts) { return new MinigameRunner(opts); }
