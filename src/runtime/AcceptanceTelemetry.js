// ─────────────────────────────────────────────────────────────────────────────
// AcceptanceTelemetry.js — bounded, copyable evidence for deployed gameplay QA.
//
// This does not declare a visual or gameplay test "passed" on its own. It keeps
// objective evidence from a real browser session: frame spikes, heap/render
// samples, runtime errors, save outcomes, input delivery, graphics changes, and
// per-interior transition coverage. Reviewers can copy one report instead of
// relying on memory or a vague "it seemed fine" after a long play session.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_EVENTS = 240;
const MAX_ERRORS = 50;
const MAX_FRAME_SAMPLES = 1800;
const MAX_RUNTIME_SAMPLES = 420;

const defaultClock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function rounded(value, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(finite(value) * scale) / scale;
}

function boundedPush(list, value, limit) {
  list.push(value);
  if (list.length > limit) list.splice(0, list.length - limit);
}

function safeDetail(value, depth = 0) {
  if (value == null || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 4000 ? `${value.slice(0, 3999)}…` : value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (depth >= 4) return String(value);
  // Every high-volume collection is already explicitly bounded below. Preserve
  // those complete buffers in the copied report so late-session evidence is not
  // silently truncated by the serializer itself.
  if (Array.isArray(value)) return value.slice(0, 500).map((entry) => safeDetail(entry, depth + 1));
  if (typeof value === 'object') {
    const result = {};
    for (const [key, entry] of Object.entries(value).slice(0, 50)) {
      const copied = safeDetail(entry, depth + 1);
      if (copied !== undefined) result[key] = copied;
    }
    return result;
  }
  return String(value);
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

function emptyInterior(id) {
  return {
    id,
    entries: 0,
    exits: 0,
    failures: 0,
    recoveries: 0,
    unsafeReturns: 0,
    lastReturnDistance: null,
  };
}

export class AcceptanceTelemetry {
  constructor({ clock = defaultClock, sampleIntervalMs = 10000 } = {}) {
    this.clock = clock;
    this.sampleIntervalMs = Math.max(1000, finite(sampleIntervalMs, 10000));
    this.build = {};
    this.start('boot');
  }

  setBuild(build = {}) {
    this.build = { ...this.build, ...safeDetail(build) };
    return this.build;
  }

  start(label = 'manual', { preserveErrors = false } = {}) {
    const priorErrors = preserveErrors ? [...(this.errors || [])] : [];
    const now = this.clock();
    this.label = String(label || 'manual').slice(0, 120);
    this.startedAt = now;
    this.startedEpoch = new Date().toISOString();
    this.stoppedAt = null;
    this.active = true;
    this.events = [];
    this.errors = priorErrors;
    this.errorCounts = Object.fromEntries(priorErrors.map((entry) => [entry.key, entry.count || 1]));
    this.inputs = {};
    this.blockedInputs = {};
    this.saves = { attempts: 0, successes: 0, failures: 0, byArea: {}, lastAtMs: null };
    this.graphics = { changes: 0, presets: {}, last: null };
    this.interiors = {};
    this.frames = 0;
    this.frameMsTotal = 0;
    this.maxFrameMs = 0;
    this.over33Ms = 0;
    this.over50Ms = 0;
    this.frameSamples = [];
    this.runtimeSamples = [];
    this.nextSampleAt = now;
    this.lastContext = null;
    this.mark('session-start', { label: this.label, preservedErrors: priorErrors.length });
    return this.snapshot();
  }

  elapsedMs(at = this.stoppedAt || this.clock()) {
    return Math.max(0, finite(at) - finite(this.startedAt));
  }

  mark(type, detail = {}) {
    const entry = Object.freeze({
      atMs: Math.round(this.elapsedMs()),
      type: String(type || 'event'),
      detail: safeDetail(detail),
    });
    boundedPush(this.events, entry, MAX_EVENTS);
    return entry;
  }

  recordError(message, source = 'runtime') {
    const text = String(message?.stack || message?.message || message || 'unknown error').slice(0, 4000);
    const key = `${source}:${text}`;
    const existing = this.errors.find((entry) => entry.key === key);
    if (existing) {
      existing.count += 1;
      existing.lastAtMs = Math.round(this.elapsedMs());
      this.errorCounts[key] = existing.count;
      return existing;
    }
    const entry = {
      key,
      source: String(source),
      message: text,
      count: 1,
      firstAtMs: Math.round(this.elapsedMs()),
      lastAtMs: Math.round(this.elapsedMs()),
    };
    boundedPush(this.errors, entry, MAX_ERRORS);
    this.errorCounts[key] = 1;
    this.mark('runtime-error', { source, message: text.slice(0, 500) });
    return entry;
  }

  recordInput(key, blockedBy = null) {
    const name = String(key || 'unknown').toLowerCase().slice(0, 80);
    this.inputs[name] = (this.inputs[name] || 0) + 1;
    if (blockedBy) this.blockedInputs[String(blockedBy)] = (this.blockedInputs[String(blockedBy)] || 0) + 1;
  }

  recordSave(success, context = {}) {
    const area = String(context.area || 'unknown');
    this.saves.attempts += 1;
    this.saves[success ? 'successes' : 'failures'] += 1;
    this.saves.byArea[area] = (this.saves.byArea[area] || 0) + 1;
    this.saves.lastAtMs = Math.round(this.elapsedMs());
    if (!success) this.mark('save-failed', context);
  }

  recordGraphics(preset, values = {}) {
    const id = String(preset || 'unknown');
    this.graphics.changes += 1;
    this.graphics.presets[id] = (this.graphics.presets[id] || 0) + 1;
    this.graphics.last = { preset: id, values: safeDetail(values), atMs: Math.round(this.elapsedMs()) };
    this.mark('graphics-change', this.graphics.last);
  }

  _interior(id) {
    const key = String(id || 'unknown');
    this.interiors[key] ||= emptyInterior(key);
    return this.interiors[key];
  }

  recordInteriorEntry(id, detail = {}) {
    const record = this._interior(id);
    record.entries += 1;
    this.mark('interior-entry', { id: record.id, ...detail });
  }

  recordInteriorExit(id, { returnDistance = null, recovered = false, ...detail } = {}) {
    const record = this._interior(id);
    const distance = returnDistance == null ? null : Math.max(0, finite(returnDistance));
    record.exits += 1;
    record.recoveries += recovered ? 1 : 0;
    record.lastReturnDistance = distance == null ? null : rounded(distance);
    if (distance != null && distance > 3.5) record.unsafeReturns += 1;
    this.mark(recovered ? 'interior-exit-recovery' : 'interior-exit', {
      id: record.id,
      returnDistance: record.lastReturnDistance,
      ...detail,
    });
  }

  recordInteriorFailure(id, stage, error) {
    const record = this._interior(id);
    record.failures += 1;
    const message = String(error?.message || error || 'unknown transition failure');
    this.mark('interior-failure', { id: record.id, stage, message });
    this.recordError(message, `interior:${record.id}:${stage}`);
  }

  frame(frameMs) {
    if (!this.active) return;
    const duration = Math.max(0, finite(frameMs));
    if (!duration || duration > 60000) return;
    this.frames += 1;
    this.frameMsTotal += duration;
    this.maxFrameMs = Math.max(this.maxFrameMs, duration);
    if (duration > 33.3) this.over33Ms += 1;
    if (duration > 50) this.over50Ms += 1;
    boundedPush(this.frameSamples, duration, MAX_FRAME_SAMPLES);
  }

  sampleDue() {
    return this.active && this.clock() >= this.nextSampleAt;
  }

  sample(context = {}) {
    if (!this.active) return null;
    const now = this.clock();
    const entry = Object.freeze({
      atMs: Math.round(this.elapsedMs(now)),
      ...safeDetail(context),
    });
    this.lastContext = entry;
    boundedPush(this.runtimeSamples, entry, MAX_RUNTIME_SAMPLES);
    this.nextSampleAt = now + this.sampleIntervalMs;
    return entry;
  }

  stop(note = '') {
    if (this.active) {
      this.mark('session-stop', { note: String(note || '') });
      this.stoppedAt = this.clock();
      this.active = false;
    }
    return this.snapshot();
  }

  summary() {
    const completedInteriors = Object.values(this.interiors)
      .filter((entry) => entry.entries > 0 && entry.exits > 0 && entry.failures === 0 && entry.unsafeReturns === 0).length;
    return Object.freeze({
      active: this.active,
      label: this.label,
      elapsedMs: Math.round(this.elapsedMs()),
      frames: this.frames,
      maxFrameMs: rounded(this.maxFrameMs),
      over33Ms: this.over33Ms,
      errors: this.errors.reduce((sum, entry) => sum + entry.count, 0),
      saves: this.saves.successes,
      saveFailures: this.saves.failures,
      interiorsVisited: Object.keys(this.interiors).length,
      interiorsCompleted: completedInteriors,
      runtimeSamples: this.runtimeSamples.length,
    });
  }

  snapshot() {
    const averageFrameMs = this.frames ? this.frameMsTotal / this.frames : 0;
    const summary = this.summary();
    return Object.freeze({
      schemaVersion: 1,
      build: safeDetail(this.build),
      session: {
        label: this.label,
        active: this.active,
        startedAt: this.startedEpoch,
        elapsedMs: summary.elapsedMs,
      },
      performance: {
        frames: this.frames,
        averageFps: averageFrameMs ? rounded(1000 / averageFrameMs, 1) : 0,
        averageFrameMs: rounded(averageFrameMs),
        p95FrameMs: rounded(percentile(this.frameSamples, 0.95)),
        maxFrameMs: rounded(this.maxFrameMs),
        over33Ms: this.over33Ms,
        over50Ms: this.over50Ms,
      },
      saves: safeDetail(this.saves),
      graphics: safeDetail(this.graphics),
      inputs: safeDetail(this.inputs),
      blockedInputs: safeDetail(this.blockedInputs),
      interiors: safeDetail(this.interiors),
      errors: safeDetail(this.errors),
      events: safeDetail(this.events),
      runtimeSamples: safeDetail(this.runtimeSamples),
      latest: safeDetail(this.lastContext),
    });
  }

  report() {
    const report = this.snapshot();
    if (typeof console !== 'undefined') console.table({
      label: report.session.label,
      elapsedMinutes: rounded(report.session.elapsedMs / 60000),
      averageFps: report.performance.averageFps,
      p95FrameMs: report.performance.p95FrameMs,
      maxFrameMs: report.performance.maxFrameMs,
      errors: report.errors.reduce((sum, entry) => sum + entry.count, 0),
      saves: report.saves.successes,
      saveFailures: report.saves.failures,
      interiorsCompleted: Object.values(report.interiors)
        .filter((entry) => entry.entries && entry.exits && !entry.failures && !entry.unsafeReturns).length,
    });
    return report;
  }

  async copy() {
    const text = JSON.stringify(this.snapshot(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}

export const acceptanceTelemetry = new AcceptanceTelemetry();

if (typeof window !== 'undefined') {
  window.__ZW_ACCEPTANCE__ = acceptanceTelemetry;
}

export default acceptanceTelemetry;
