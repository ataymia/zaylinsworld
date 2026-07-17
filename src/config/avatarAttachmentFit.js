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

export const DEFAULT_HAIR_FIT_PROFILE = hair({
  widthScale: 0.84,
  heightScale: 0.86,
  depthScale: 0.84,
  yOffsetMul: -0.10,
  zOffsetMul: 0.035,
});

// The full Head-matrix mapping now supplies the correct orientation. These are
// deliberately small final-fit calibrations that pull each authored style toward
// the scalp without flattening its silhouette. Short caps seat deepest; draped
// and bun styles retain slightly more volume.
export const HAIR_FIT_PROFILES = Object.freeze({
  'gltf-buzzed': hair({
    widthScale: 0.80,
    heightScale: 0.82,
    depthScale: 0.80,
    yOffsetMul: -0.12,
    zOffsetMul: 0.045,
  }),
  'gltf-buzzed-f': hair({
    widthScale: 0.81,
    heightScale: 0.83,
    depthScale: 0.81,
    yOffsetMul: -0.115,
    zOffsetMul: 0.045,
  }),
  'gltf-parted': hair({
    widthScale: 0.84,
    heightScale: 0.86,
    depthScale: 0.84,
    yOffsetMul: -0.10,
    zOffsetMul: 0.040,
  }),
  'gltf-long': hair({
    widthScale: 0.86,
    heightScale: 0.88,
    depthScale: 0.86,
    yOffsetMul: -0.09,
    zOffsetMul: 0.035,
  }),
  'gltf-buns': hair({
    widthScale: 0.84,
    heightScale: 0.86,
    depthScale: 0.84,
    yOffsetMul: -0.10,
    zOffsetMul: 0.040,
  }),
});

const jewelry = (values = {}) => Object.freeze({
  linkRadius: 0.0086,
  linkTube: 0.0019,
  links: 72,
  pathSamples: 72,
  drop: 0.072,
  backLift: 0.002,
  sideDrop: 0.010,
  neckHeightMul: 0.08,
  chestTopInsetMul: 0.07,
  neckWidthMul: 0.42,
  shoulderWidthMul: 0.20,
  frontWidthBoost: 0.06,
  frontDropPower: 1.55,
  chestClearance: 0.014,
  backClearance: 0.001,
  backWidthScale: 0.30,
  backForward: 0.050,
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
    chestClearance: 0.016,
    backClearance: 0.001,
    backWidthScale: 0.32,
    backForward: 0.052,
    pendantClearance: 0.018,
    pendantScale: 0.54,
    shoulderWidthMul: 0.21,
  }),
  iced: jewelry({
    linkRadius: 0.0084,
    linkTube: 0.0020,
    links: 74,
    pathSamples: 74,
    drop: 0.080,
    chestClearance: 0.017,
    backClearance: 0.001,
    backWidthScale: 0.30,
    backForward: 0.050,
    pendantClearance: 0.020,
    pendantScale: 0.47,
  }),
});

export function hairFitProfile(styleId) {
  return HAIR_FIT_PROFILES[styleId] || DEFAULT_HAIR_FIT_PROFILE;
}
