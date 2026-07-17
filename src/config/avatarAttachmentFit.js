// Canonical attachment fit contracts for cross-pack hair and jewelry.
// Hair source points use normalized asset coordinates:
// x: -1 left to +1 right, y: 0 bottom to 1 top, z: -1 back to +1 front.

const point = (name, x, y, z) => Object.freeze({ name, source: Object.freeze([x, y, z]) });

// Dense scalp cage. The added forehead/scalp rows stop imported styles from
// bridging over the skull like a rigid helmet and give every style enough
// control points to seat along the forehead, temples, ears, crown and nape.
export const HEAD_CAGE_POINTS = Object.freeze([
  point('crown', 0, 0.98, 0),
  point('crownFront', 0, 0.84, 0.62),
  point('crownBack', 0, 0.84, -0.62),
  point('crownLeft', -0.62, 0.84, 0),
  point('crownRight', 0.62, 0.84, 0),

  point('topFrontLeft', -0.34, 0.78, 0.82),
  point('topFrontCenter', 0, 0.79, 0.92),
  point('topFrontRight', 0.34, 0.78, 0.82),
  point('topSideLeft', -0.82, 0.72, 0.08),
  point('topSideRight', 0.82, 0.72, 0.08),
  point('topBackLeft', -0.34, 0.78, -0.82),
  point('topBackCenter', 0, 0.79, -0.94),
  point('topBackRight', 0.34, 0.78, -0.82),

  point('upperFrontLeft', -0.52, 0.68, 0.86),
  point('upperFrontCenter', 0, 0.68, 0.98),
  point('upperFrontRight', 0.52, 0.68, 0.86),
  point('upperSideLeft', -0.96, 0.62, 0.12),
  point('upperSideRight', 0.96, 0.62, 0.12),
  point('upperBackLeft', -0.52, 0.68, -0.86),
  point('upperBackCenter', 0, 0.68, -0.98),
  point('upperBackRight', 0.52, 0.68, -0.86),

  point('foreheadLeft', -0.42, 0.58, 0.98),
  point('foreheadCenter', 0, 0.57, 1),
  point('foreheadRight', 0.42, 0.58, 0.98),
  point('hairlineLeft', -0.56, 0.50, 0.96),
  point('hairlineCenter', 0, 0.49, 1),
  point('hairlineRight', 0.56, 0.50, 0.96),
  point('leftTempleFront', -0.88, 0.52, 0.48),
  point('rightTempleFront', 0.88, 0.52, 0.48),
  point('leftTempleSide', -1, 0.48, 0.02),
  point('rightTempleSide', 1, 0.48, 0.02),

  point('leftEarTop', -1, 0.38, 0.04),
  point('rightEarTop', 1, 0.38, 0.04),
  point('leftEarMid', -1, 0.30, 0),
  point('rightEarMid', 1, 0.30, 0),
  point('leftEarBottom', -0.96, 0.22, -0.02),
  point('rightEarBottom', 0.96, 0.22, -0.02),

  point('midBackLeft', -0.70, 0.48, -0.72),
  point('midBackCenter', 0, 0.48, -1),
  point('midBackRight', 0.70, 0.48, -0.72),
  point('lowerBackLeft', -0.52, 0.28, -0.88),
  point('lowerBackCenter', 0, 0.28, -1),
  point('lowerBackRight', 0.52, 0.28, -0.88),
  point('napeLeft', -0.34, 0.06, -0.72),
  point('napeCenter', 0, 0.04, -0.80),
  point('napeRight', 0.34, 0.06, -0.72),
]);

export const HEAD_LANDMARK_NAMES = Object.freeze(HEAD_CAGE_POINTS.map(({ name }) => name));

const sourceCage = (overrides = {}) => Object.freeze(Object.fromEntries(
  HEAD_CAGE_POINTS.map(({ name, source }) => [name, Object.freeze(overrides[name] || source)]),
));

// Moves the whole hairstyle forward while biasing the strongest movement toward
// forehead vertices. Back-of-head and nape vertices move less, preserving length.
const forwardSeatOffsets = (backShift = 0.02, frontBoost = 0.10, down = 0) => Object.freeze(Object.fromEntries(
  HEAD_CAGE_POINTS.map(({ name, source }) => {
    const frontness = Math.max(0, Math.min(1, (source[2] + 1) * 0.5));
    return [name, Object.freeze([0, down, backShift + frontBoost * frontness])];
  }),
));

const mergeOffsets = (...sets) => {
  const merged = {};
  for (const { name } of HEAD_CAGE_POINTS) {
    const sum = [0, 0, 0];
    for (const set of sets) {
      const value = set?.[name];
      if (!value) continue;
      sum[0] += value[0] || 0;
      sum[1] += value[1] || 0;
      sum[2] += value[2] || 0;
    }
    if (sum.some((value) => Math.abs(value) > 0.00001)) merged[name] = Object.freeze(sum);
  }
  return Object.freeze(merged);
};

const profile = (values = {}) => {
  const { sourceLandmarks = {}, targetOffsets = {}, ...overrides } = values;
  return Object.freeze({
    widthMul: 0.995,
    depthMul: 0.995,
    maxHeightMul: 1.10,
    topLiftMul: 0.008,
    bottomDropMul: 0.08,
    frontClearance: 0.003,
    backClearance: 0.004,
    sideClearance: 0.003,
    earClearance: 0.003,
    napeDropMul: 0.08,
    napeBackMul: 0.04,
    influencePower: 2.35,
    ...overrides,
    sourceLandmarks: sourceCage(sourceLandmarks),
    targetOffsets: Object.freeze(targetOffsets),
  });
};

export const DEFAULT_HAIR_FIT_PROFILE = profile({
  targetOffsets: forwardSeatOffsets(0.01, 0.08, -0.008),
});

export const HAIR_FIT_PROFILES = Object.freeze({
  'gltf-buzzed': profile({
    widthMul: 0.985,
    depthMul: 0.985,
    maxHeightMul: 0.48,
    topLiftMul: 0,
    bottomDropMul: -0.02,
    frontClearance: 0.0015,
    backClearance: 0.002,
    sideClearance: 0.0015,
    earClearance: 0.001,
    napeDropMul: 0,
    napeBackMul: 0,
    targetOffsets: forwardSeatOffsets(0.004, 0.045, -0.006),
  }),
  'gltf-buzzed-f': profile({
    widthMul: 0.99,
    depthMul: 0.99,
    maxHeightMul: 0.68,
    topLiftMul: 0.004,
    bottomDropMul: -0.01,
    frontClearance: 0.002,
    backClearance: 0.0025,
    sideClearance: 0.002,
    earClearance: 0.0015,
    napeDropMul: 0.02,
    napeBackMul: 0.01,
    targetOffsets: forwardSeatOffsets(0.006, 0.055, -0.008),
  }),
  'gltf-parted': profile({
    widthMul: 1.01,
    depthMul: 1.00,
    maxHeightMul: 1.06,
    topLiftMul: 0.012,
    bottomDropMul: 0.02,
    frontClearance: 0.0025,
    backClearance: 0.004,
    sideClearance: 0.003,
    earClearance: 0.003,
    napeDropMul: 0.03,
    napeBackMul: 0.02,
    influencePower: 2.20,
    sourceLandmarks: {
      crown: [0, 0.92, -0.04],
      foreheadCenter: [0, 0.48, 0.98],
      hairlineCenter: [0, 0.38, 0.99],
      hairlineLeft: [-0.56, 0.42, 0.96],
      hairlineRight: [0.56, 0.42, 0.96],
    },
    targetOffsets: forwardSeatOffsets(0.018, 0.14, -0.014),
  }),
  'gltf-long': profile({
    widthMul: 1.025,
    depthMul: 1.005,
    maxHeightMul: 2.35,
    topLiftMul: 0.008,
    bottomDropMul: 1.18,
    frontClearance: 0.0025,
    backClearance: 0.006,
    sideClearance: 0.004,
    earClearance: 0.003,
    napeDropMul: 1.22,
    napeBackMul: 0.18,
    influencePower: 2.45,
    sourceLandmarks: {
      crown: [0, 0.94, -0.02],
      foreheadCenter: [0, 0.57, 0.98],
      hairlineCenter: [0, 0.53, 0.98],
      hairlineLeft: [-0.54, 0.53, 0.96],
      hairlineRight: [0.54, 0.53, 0.96],
      leftEarBottom: [-0.98, 0.43, -0.04],
      rightEarBottom: [0.98, 0.43, -0.04],
      lowerBackLeft: [-0.52, 0.22, -0.92],
      lowerBackCenter: [0, 0.20, -1],
      lowerBackRight: [0.52, 0.22, -0.92],
      napeLeft: [-0.38, 0.02, -0.88],
      napeCenter: [0, 0, -0.96],
      napeRight: [0.38, 0.02, -0.88],
    },
    targetOffsets: forwardSeatOffsets(0.035, 0.18, -0.018),
  }),
  'gltf-buns': profile({
    widthMul: 1.035,
    depthMul: 0.995,
    maxHeightMul: 1.36,
    topLiftMul: 0.018,
    bottomDropMul: 0.01,
    frontClearance: 0.0025,
    backClearance: 0.005,
    sideClearance: 0.004,
    earClearance: 0.0025,
    napeDropMul: 0.02,
    napeBackMul: 0.01,
    influencePower: 2.35,
    sourceLandmarks: {
      crown: [0, 0.82, 0],
      crownLeft: [-0.50, 0.76, 0],
      crownRight: [0.50, 0.76, 0],
      foreheadCenter: [0, 0.48, 0.98],
      hairlineCenter: [0, 0.38, 0.96],
      leftTempleSide: [-0.78, 0.42, 0],
      rightTempleSide: [0.78, 0.42, 0],
    },
    targetOffsets: mergeOffsets(
      forwardSeatOffsets(0.065, 0.22, -0.035),
      Object.freeze({
        crownLeft: Object.freeze([-0.06, 0.045, 0]),
        crownRight: Object.freeze([0.06, 0.045, 0]),
      }),
    ),
  }),
});

// Higher sample counts make the generated links follow a smoother curve. The
// larger neck clearance also brings the neck-loop endpoints closer to the front
// drape, removing the two sharp dangling seams visible in the previous build.
export const NECK_RING_SEGMENTS = 24;
export const CHEST_DRAPE_SEGMENTS = 21;

export const JEWELRY_FIT = Object.freeze({
  chain: Object.freeze({
    linkRadius: 0.0088,
    linkTube: 0.0019,
    links: 76,
    drop: 0.078,
    neckClearance: 0.055,
    chestClearance: 0.016,
    pendantClearance: 0.018,
    pendantScale: 0.54,
    shoulderWidthMul: 0.20,
  }),
  cuban: Object.freeze({
    linkRadius: 0.0104,
    linkTube: 0.0028,
    links: 72,
    drop: 0.072,
    neckClearance: 0.060,
    chestClearance: 0.018,
    pendantClearance: 0.020,
    pendantScale: 0.58,
    shoulderWidthMul: 0.21,
  }),
  iced: Object.freeze({
    linkRadius: 0.0086,
    linkTube: 0.0021,
    links: 76,
    drop: 0.086,
    neckClearance: 0.058,
    chestClearance: 0.019,
    pendantClearance: 0.022,
    pendantScale: 0.50,
    shoulderWidthMul: 0.20,
  }),
});

export function hairFitProfile(styleId) {
  return HAIR_FIT_PROFILES[styleId] || DEFAULT_HAIR_FIT_PROFILE;
}
