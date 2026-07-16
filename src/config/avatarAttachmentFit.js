// Canonical attachment fit contracts for cross-pack hair and jewelry.
// Source hair landmarks use normalized asset coordinates:
// x: -1 left to +1 right, y: 0 bottom to 1 top, z: -1 back to +1 front.

const source = (overrides = {}) => Object.freeze({
  crown: [0, 0.96, 0],
  forehead: [0, 0.46, 0.92],
  leftTemple: [-0.92, 0.48, 0.26],
  rightTemple: [0.92, 0.48, 0.26],
  leftEar: [-0.98, 0.28, 0],
  rightEar: [0.98, 0.28, 0],
  backScalp: [0, 0.48, -0.94],
  nape: [0, 0.04, -0.70],
  ...overrides,
});

const profile = (values) => Object.freeze({
  widthMul: 1.22,
  depthMul: 1.18,
  topLift: 0.16,
  bottomDrop: 0.10,
  frontClearance: 0.035,
  backClearance: 0.028,
  templeClearance: 0.022,
  earClearance: 0.018,
  napeBack: 0.04,
  influencePower: 2.2,
  sourceLandmarks: source(),
  ...values,
});

export const DEFAULT_HAIR_FIT_PROFILE = profile({});

export const HAIR_FIT_PROFILES = Object.freeze({
  'gltf-buzzed': profile({
    widthMul: 1.12,
    depthMul: 1.10,
    topLift: 0.07,
    bottomDrop: -0.02,
    frontClearance: 0.018,
    backClearance: 0.018,
    templeClearance: 0.012,
    earClearance: 0.008,
    napeBack: 0.015,
  }),
  'gltf-buzzed-f': profile({
    widthMul: 1.16,
    depthMul: 1.12,
    topLift: 0.11,
    bottomDrop: 0,
    frontClearance: 0.02,
    backClearance: 0.02,
    templeClearance: 0.015,
    earClearance: 0.01,
    napeBack: 0.02,
  }),
  'gltf-parted': profile({
    widthMul: 1.30,
    depthMul: 1.22,
    topLift: 0.34,
    bottomDrop: 0.02,
    frontClearance: 0.035,
    backClearance: 0.03,
    templeClearance: 0.03,
    earClearance: 0.018,
    napeBack: 0.025,
    sourceLandmarks: source({
      crown: [0, 0.90, -0.05],
      forehead: [0, 0.32, 0.96],
      leftTemple: [-0.94, 0.44, 0.32],
      rightTemple: [0.94, 0.44, 0.32],
    }),
  }),
  'gltf-long': profile({
    widthMul: 1.34,
    depthMul: 1.28,
    topLift: 0.22,
    bottomDrop: 1.55,
    frontClearance: 0.035,
    backClearance: 0.055,
    templeClearance: 0.032,
    earClearance: 0.022,
    napeBack: 0.12,
    sourceLandmarks: source({
      crown: [0, 0.91, -0.04],
      forehead: [0, 0.54, 0.90],
      leftTemple: [-0.92, 0.54, 0.20],
      rightTemple: [0.92, 0.54, 0.20],
      leftEar: [-0.98, 0.40, -0.06],
      rightEar: [0.98, 0.40, -0.06],
      backScalp: [0, 0.54, -0.96],
      nape: [0, 0.02, -0.90],
    }),
  }),
  'gltf-buns': profile({
    widthMul: 1.42,
    depthMul: 1.22,
    topLift: 0.62,
    bottomDrop: 0.03,
    frontClearance: 0.025,
    backClearance: 0.03,
    templeClearance: 0.035,
    earClearance: 0.018,
    napeBack: 0.03,
    sourceLandmarks: source({
      crown: [0, 0.78, 0],
      forehead: [0, 0.32, 0.90],
      leftTemple: [-0.72, 0.40, 0.22],
      rightTemple: [0.72, 0.40, 0.22],
      leftEar: [-0.78, 0.25, 0],
      rightEar: [0.78, 0.25, 0],
      backScalp: [0, 0.42, -0.90],
      nape: [0, 0.04, -0.70],
    }),
  }),
});

export const HEAD_LANDMARK_NAMES = Object.freeze([
  'crown',
  'forehead',
  'leftTemple',
  'rightTemple',
  'leftEar',
  'rightEar',
  'backScalp',
  'nape',
]);

export const JEWELRY_FIT = Object.freeze({
  chain: Object.freeze({ linkRadius: 0.0105, linkTube: 0.0023, links: 30, drop: 0.15, chestClearance: 0.045, pendantScale: 0.75 }),
  cuban: Object.freeze({ linkRadius: 0.013, linkTube: 0.0034, links: 28, drop: 0.135, chestClearance: 0.050, pendantScale: 0.82 }),
  iced: Object.freeze({ linkRadius: 0.0105, linkTube: 0.0025, links: 30, drop: 0.16, chestClearance: 0.052, pendantScale: 0.72 }),
});

export function hairFitProfile(styleId) {
  return HAIR_FIT_PROFILES[styleId] || DEFAULT_HAIR_FIT_PROFILE;
}
