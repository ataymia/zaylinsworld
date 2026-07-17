// Canonical attachment contracts for modular hair and jewelry.
//
// Mini-kit hairs are baked into the full local matrix of their authored Head
// bone, then mapped onto the Sunbox player's real Head bone and native fitted
// Crew Cut reference. The mapping preserves both sides of the source style and
// never depends on world-space offsets.

export const NATIVE_HAIR_REFERENCE_NODE = 'ZW_Hair_CrewCut';
export const FALLBACK_NATIVE_HAIR_REFERENCE_NODE = 'ZW_Hair_CloseCrop';
export const SOURCE_CANONICAL_HAIR_STYLE = 'gltf-buzzed';

export const HAIR_REFERENCE_SETTINGS = Object.freeze({
  minExtent: 0.01,
  minScale: 0.35,
  maxScale: 4.0,
});

const hair = (values = {}) => Object.freeze({
  widthScale: 1,
  heightScale: 1,
  depthScale: 1,
  xOffsetMul: 0,
  yOffsetMul: 0,
  zOffsetMul: 0,
  ...values,
});

// The silhouette and scale are approved. These values only seat the already
// fitted geometry onto the scalp. This final calibration moves each imported
// style one very small step downward while preserving its width, depth, and
// front/back placement.
export const DEFAULT_HAIR_FIT_PROFILE = hair({
  widthScale: 0.70,
  heightScale: 1.00,
  depthScale: 0.70,
  yOffsetMul: 0.10,
  zOffsetMul: -0.004,
});

export const HAIR_FIT_PROFILES = Object.freeze({
  'gltf-buzzed': hair({
    widthScale: 0.66,
    heightScale: 1.00,
    depthScale: 0.66,
    yOffsetMul: 0.14,
    zOffsetMul: 0.000,
  }),
  'gltf-buzzed-f': hair({
    widthScale: 0.67,
    heightScale: 1.00,
    depthScale: 0.67,
    yOffsetMul: 0.13,
    zOffsetMul: 0.000,
  }),
  'gltf-parted': hair({
    widthScale: 0.70,
    heightScale: 1.00,
    depthScale: 0.70,
    yOffsetMul: 0.10,
    zOffsetMul: -0.002,
  }),
  'gltf-long': hair({
    widthScale: 0.74,
    heightScale: 1.00,
    depthScale: 0.74,
    yOffsetMul: 0.08,
    zOffsetMul: -0.006,
  }),
  'gltf-buns': hair({
    widthScale: 0.72,
    heightScale: 1.00,
    depthScale: 0.72,
    yOffsetMul: 0.10,
    zOffsetMul: -0.004,
  }),
});

const jewelry = (values = {}) => Object.freeze({
  linkRadius: 0.0086,
  linkTube: 0.0019,
  links: 72,
  pathSamples: 72,
  drop: 0.072,
  backLift: 0.000,
  sideDrop: 0.004,
  neckHeightMul: 0.08,
  chestTopInsetMul: 0.07,
  // The approved front drape stays untouched. Only the rear half contracts
  // toward the neck and moves forward off the torso-back sample so it rests at
  // the nape instead of projecting behind the character.
  neckWidthMul: 0.30,
  shoulderWidthMul: 0.13,
  frontWidthBoost: 0.18,
  frontDropPower: 1.55,
  chestClearance: 0.014,
  backClearance: 0.0005,
  backWidthScale: 0.62,
  backForward: 0.038,
  pendantClearance: 0.016,
  pendantScale: 0.50,
  ...values,
});

export const JEWELRY_FIT = Object.freeze({
  chain: jewelry({}),
  cuban: jewelry({
    linkRadius: 0.0102,
    linkTube: 0.0027,
    links: 68,
    pathSamples: 68,
    drop: 0.068,
    neckWidthMul: 0.31,
    shoulderWidthMul: 0.14,
    frontWidthBoost: 0.17,
    chestClearance: 0.016,
    backClearance: 0.0005,
    backWidthScale: 0.64,
    backForward: 0.040,
    pendantClearance: 0.018,
    pendantScale: 0.54,
  }),
  iced: jewelry({
    linkRadius: 0.0084,
    linkTube: 0.0020,
    links: 74,
    pathSamples: 74,
    drop: 0.080,
    chestClearance: 0.017,
    backClearance: 0.0005,
    backWidthScale: 0.62,
    backForward: 0.038,
    pendantClearance: 0.020,
    pendantScale: 0.47,
  }),
});

export function hairFitProfile(styleId) {
  return HAIR_FIT_PROFILES[styleId] || DEFAULT_HAIR_FIT_PROFILE;
}
