// Canonical attachment fit contracts for cross-pack hair and jewelry.
// Hair source points use normalized asset coordinates:
// x: -1 left to +1 right, y: 0 bottom to 1 top, z: -1 back to +1 front.

const point = (name, x, y, z) => Object.freeze({ name, source: Object.freeze([x, y, z]) });

// Dense head cage. Future hair imports use this same contract, with optional
// per-style source overrides for unusual silhouettes such as buns or long hair.
export const HEAD_CAGE_POINTS = Object.freeze([
  point('crown', 0, 0.98, 0),
  point('crownFront', 0, 0.84, 0.62),
  point('crownBack', 0, 0.84, -0.62),
  point('crownLeft', -0.62, 0.84, 0),
  point('crownRight', 0.62, 0.84, 0),
  point('upperFrontLeft', -0.48, 0.68, 0.82),
  point('upperFrontCenter', 0, 0.68, 0.92),
  point('upperFrontRight', 0.48, 0.68, 0.82),
  point('upperBackLeft', -0.48, 0.68, -0.82),
  point('upperBackCenter', 0, 0.68, -0.94),
  point('upperBackRight', 0.48, 0.68, -0.82),
  point('hairlineLeft', -0.52, 0.48, 0.92),
  point('hairlineCenter', 0, 0.46, 1),
  point('hairlineRight', 0.52, 0.48, 0.92),
  point('leftTempleFront', -0.88, 0.50, 0.44),
  point('rightTempleFront', 0.88, 0.50, 0.44),
  point('leftTempleSide', -1, 0.46, 0),
  point('rightTempleSide', 1, 0.46, 0),
  point('leftEarTop', -1, 0.36, 0.04),
  point('rightEarTop', 1, 0.36, 0.04),
  point('leftEarBottom', -0.96, 0.22, -0.02),
  point('rightEarBottom', 0.96, 0.22, -0.02),
  point('lowerBackLeft', -0.48, 0.28, -0.86),
  point('lowerBackCenter', 0, 0.28, -1),
  point('lowerBackRight', 0.48, 0.28, -0.86),
  point('napeLeft', -0.34, 0.06, -0.72),
  point('napeCenter', 0, 0.04, -0.80),
  point('napeRight', 0.34, 0.06, -0.72),
]);

export const HEAD_LANDMARK_NAMES = Object.freeze(HEAD_CAGE_POINTS.map(({ name }) => name));

const sourceCage = (overrides = {}) => Object.freeze(Object.fromEntries(
  HEAD_CAGE_POINTS.map(({ name, source }) => [name, Object.freeze(overrides[name] || source)]),
));

const profile = (values = {}) => Object.freeze({
  widthMul: 1.06,
  depthMul: 1.06,
  maxHeightMul: 1.10,
  topLiftMul: 0.04,
  bottomDropMul: 0.08,
  frontClearance: 0.018,
  backClearance: 0.018,
  sideClearance: 0.012,
  earClearance: 0.010,
  napeDropMul: 0.08,
  napeBackMul: 0.06,
  influencePower: 2.65,
  sourceLandmarks: sourceCage(values.sourceLandmarks || {}),
  targetOffsets: Object.freeze(values.targetOffsets || {}),
  ...values,
});

export const DEFAULT_HAIR_FIT_PROFILE = profile({});

export const HAIR_FIT_PROFILES = Object.freeze({
  'gltf-buzzed': profile({
    widthMul: 1.01,
    depthMul: 1.01,
    maxHeightMul: 0.48,
    topLiftMul: 0.015,
    bottomDropMul: -0.02,
    frontClearance: 0.010,
    backClearance: 0.010,
    sideClearance: 0.006,
    earClearance: 0.004,
    napeDropMul: 0,
    napeBackMul: 0.01,
  }),
  'gltf-buzzed-f': profile({
    widthMul: 1.04,
    depthMul: 1.03,
    maxHeightMul: 0.68,
    topLiftMul: 0.025,
    bottomDropMul: -0.01,
    frontClearance: 0.012,
    backClearance: 0.012,
    sideClearance: 0.008,
    earClearance: 0.006,
    napeDropMul: 0.02,
    napeBackMul: 0.02,
  }),
  'gltf-parted': profile({
    widthMul: 1.08,
    depthMul: 1.08,
    maxHeightMul: 1.08,
    topLiftMul: 0.07,
    bottomDropMul: 0.02,
    frontClearance: 0.018,
    backClearance: 0.018,
    sideClearance: 0.014,
    earClearance: 0.010,
    napeDropMul: 0.03,
    napeBackMul: 0.03,
    sourceLandmarks: {
      crown: [0, 0.92, -0.04],
      hairlineCenter: [0, 0.38, 0.98],
      hairlineLeft: [-0.56, 0.42, 0.94],
      hairlineRight: [0.56, 0.42, 0.94],
    },
  }),
  'gltf-long': profile({
    widthMul: 1.10,
    depthMul: 1.10,
    maxHeightMul: 2.35,
    topLiftMul: 0.06,
    bottomDropMul: 1.18,
    frontClearance: 0.016,
    backClearance: 0.032,
    sideClearance: 0.014,
    earClearance: 0.012,
    napeDropMul: 1.22,
    napeBackMul: 0.20,
    influencePower: 3.0,
    sourceLandmarks: {
      crown: [0, 0.94, -0.02],
      hairlineCenter: [0, 0.56, 0.94],
      leftEarBottom: [-0.98, 0.43, -0.04],
      rightEarBottom: [0.98, 0.43, -0.04],
      lowerBackLeft: [-0.52, 0.22, -0.92],
      lowerBackCenter: [0, 0.20, -1],
      lowerBackRight: [0.52, 0.22, -0.92],
      napeLeft: [-0.38, 0.02, -0.88],
      napeCenter: [0, 0, -0.96],
      napeRight: [0.38, 0.02, -0.88],
    },
  }),
  'gltf-buns': profile({
    widthMul: 1.10,
    depthMul: 1.08,
    maxHeightMul: 1.42,
    topLiftMul: 0.10,
    bottomDropMul: 0.01,
    frontClearance: 0.014,
    backClearance: 0.018,
    sideClearance: 0.012,
    earClearance: 0.008,
    napeDropMul: 0.02,
    napeBackMul: 0.02,
    influencePower: 2.9,
    sourceLandmarks: {
      crown: [0, 0.82, 0],
      crownLeft: [-0.50, 0.76, 0],
      crownRight: [0.50, 0.76, 0],
      hairlineCenter: [0, 0.38, 0.94],
      leftTempleSide: [-0.78, 0.42, 0],
      rightTempleSide: [0.78, 0.42, 0],
    },
    targetOffsets: {
      crownLeft: [-0.08, 0.10, 0],
      crownRight: [0.08, 0.10, 0],
    },
  }),
});

// Necklace fitting uses a dense loop around the neck plus a projected front
// drape. Each visible link is generated along the resulting closed path.
export const NECK_RING_SEGMENTS = 14;
export const CHEST_DRAPE_SEGMENTS = 13;

export const JEWELRY_FIT = Object.freeze({
  chain: Object.freeze({
    linkRadius: 0.0092,
    linkTube: 0.0020,
    links: 64,
    drop: 0.145,
    neckClearance: 0.010,
    chestClearance: 0.014,
    pendantClearance: 0.020,
    pendantScale: 0.58,
    shoulderWidthMul: 0.29,
  }),
  cuban: Object.freeze({
    linkRadius: 0.0110,
    linkTube: 0.0030,
    links: 60,
    drop: 0.132,
    neckClearance: 0.012,
    chestClearance: 0.016,
    pendantClearance: 0.022,
    pendantScale: 0.62,
    shoulderWidthMul: 0.30,
  }),
  iced: Object.freeze({
    linkRadius: 0.0090,
    linkTube: 0.0022,
    links: 64,
    drop: 0.155,
    neckClearance: 0.011,
    chestClearance: 0.017,
    pendantClearance: 0.024,
    pendantScale: 0.54,
    shoulderWidthMul: 0.29,
  }),
});

export function hairFitProfile(styleId) {
  return HAIR_FIT_PROFILES[styleId] || DEFAULT_HAIR_FIT_PROFILE;
}
