// ─────────────────────────────────────────────────────────────────────────────
// LODPolicy.js — one distance/relevance contract for world rendering and AI.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LEVELS = Object.freeze([
  Object.freeze({ id: 'near', maxDistance: 85, geometry: 'high', textures: 'high', animationHz: 60, aiHz: 20, physics: true, shadows: true, interaction: true }),
  Object.freeze({ id: 'mid', maxDistance: 210, geometry: 'medium', textures: 'medium', animationHz: 20, aiHz: 8, physics: false, shadows: false, interaction: false }),
  Object.freeze({ id: 'far', maxDistance: 520, geometry: 'low', textures: 'low', animationHz: 4, aiHz: 2, physics: false, shadows: false, interaction: false }),
  Object.freeze({ id: 'culled', maxDistance: Infinity, geometry: 'none', textures: 'none', animationHz: 0, aiHz: 0, physics: false, shadows: false, interaction: false }),
]);

const PRESET_SCALE = Object.freeze({ low: 0.72, medium: 0.9, high: 1, custom: 1, auto: 0.9 });
const INSTANCE_CATEGORIES = new Set([
  'tree', 'streetlight', 'pole', 'hydrant', 'bollard', 'bench', 'bin', 'fence',
  'guardrail', 'road-prop', 'house-shell', 'building-shell', 'parking-marker',
]);

function distance2D(a = {}, b = {}) {
  return Math.hypot((Number(a.x) || 0) - (Number(b.x) || 0), (Number(a.z) || 0) - (Number(b.z) || 0));
}

export class LODPolicy {
  constructor({ levels = DEFAULT_LEVELS, graphicsPreset = 'medium' } = {}) {
    this.levels = levels.map((level) => Object.freeze({ ...level }));
    this.graphicsPreset = graphicsPreset;
    this.scale = PRESET_SCALE[graphicsPreset] ?? 0.9;
  }

  setGraphicsPreset(preset) {
    this.graphicsPreset = preset;
    this.scale = PRESET_SCALE[preset] ?? 0.9;
  }

  levelAt(distance, { important = false, interior = false } = {}) {
    const importanceBoost = important ? 1.35 : 1;
    const interiorPenalty = interior ? 0.8 : 1;
    const effective = Math.max(0, Number(distance) || 0) / (this.scale * importanceBoost * interiorPenalty);
    return this.levels.find((level) => effective <= level.maxDistance) || this.levels.at(-1);
  }

  evaluate(object = {}, observer = {}) {
    const distance = distance2D(object.position || object, observer.position || observer);
    const level = this.levelAt(distance, {
      important: !!(object.important || object.functional || object.playerOwned),
      interior: !!object.interior,
    });
    return Object.freeze({
      id: level.id,
      distance,
      visible: level.geometry !== 'none',
      geometry: level.geometry,
      textures: level.textures,
      animationIntervalMs: level.animationHz ? 1000 / level.animationHz : Infinity,
      aiIntervalMs: level.aiHz ? 1000 / level.aiHz : Infinity,
      physics: level.physics,
      shadows: level.shadows,
      interaction: level.interaction,
    });
  }

  canInstance(record = {}) {
    if (record.skinned || record.animated || record.uniqueMaterial || record.interactive || record.breakable) return false;
    if (record.instancing === false) return false;
    return record.instancing === true || INSTANCE_CATEGORIES.has(record.category);
  }

  instanceKey(record = {}) {
    if (!this.canInstance(record)) return null;
    const asset = record.assetId || record.modelId || record.category || 'unknown';
    const material = record.materialId || record.material || 'default';
    const lod = record.lod || 'auto';
    return `${asset}|${material}|${lod}`;
  }

  shouldUpdate(lastUpdateMs, currentMs, evaluation, subsystem = 'ai') {
    const interval = subsystem === 'animation' ? evaluation.animationIntervalMs : evaluation.aiIntervalMs;
    return Number.isFinite(interval) && currentMs - lastUpdateMs >= interval;
  }

  snapshot() {
    return Object.freeze({
      graphicsPreset: this.graphicsPreset,
      distanceScale: this.scale,
      levels: this.levels.map((level) => ({ ...level, scaledDistance: Number.isFinite(level.maxDistance) ? Math.round(level.maxDistance * this.scale) : Infinity })),
      instanceCategories: [...INSTANCE_CATEGORIES],
    });
  }
}

export { DEFAULT_LEVELS as LOD_LEVELS, INSTANCE_CATEGORIES, distance2D };
export default LODPolicy;
