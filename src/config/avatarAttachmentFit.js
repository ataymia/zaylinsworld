// Canonical attachment contracts for modular hair and jewelry.
//
// The mini-kit hairstyles are already authored around the same humanoid Head
// bone. Runtime fitting therefore preserves each source mesh exactly and maps its
// source-head coordinate frame onto the pack-native Crew Cut that already fits
// the current player head. No vertex cage, shell inference, or scalp deformation.

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

// These are intentionally conservative. Because every mini-kit style shares the
// same source rig/head frame, style shape and root placement come from the asset,
// not a pile of hand-guessed offsets.
export const DEFAULT_HAIR_FIT_PROFILE = hair({});

export const HAIR_FIT_PROFILES = Object.freeze({
  'gltf-buzzed': hair({}),
  'gltf-buzzed-f': hair({}),
  'gltf-parted': hair({}),
  'gltf-long': hair({}),
  'gltf-buns': hair({}),
});

const jewelry = (values = {}) => Object.freeze({
  linkRadius: 0.0086,
  linkTube: 0.0019,
  links: 72,
  pathSamples: 72,
  drop: 0.072,
  backLift: 0.010,
  sideDrop: 0.008,
  neckHeightMul: 0.08,
  chestTopInsetMul: 0.07,
  neckWidthMul: 0.42,
  shoulderWidthMul: 0.20,
  frontWidthBoost: 0.06,
  frontDropPower: 1.55,
  chestClearance: 0.014,
  backClearance: 0.004,
  backWidthScale: 0.58,
  backForward: 0.020,
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
    backClearance: 0.005,
    backWidthScale: 0.60,
    backForward: 0.021,
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
    backClearance: 0.004,
    backWidthScale: 0.58,
    backForward: 0.020,
    pendantClearance: 0.020,
    pendantScale: 0.47,
  }),
});

export function hairFitProfile(styleId) {
  return HAIR_FIT_PROFILES[styleId] || DEFAULT_HAIR_FIT_PROFILE;
}
