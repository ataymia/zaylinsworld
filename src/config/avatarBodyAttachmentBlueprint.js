// Pack-independent reference map for every future wearable slot.
//
// Native Sunbox pieces are the fit blueprints. Imported assets should be baked
// into their source rig/bone frame, mapped to the matching target anchor, and
// scaled against the listed native reference nodes. This prevents future hair,
// clothing, shoe, hat, glasses, and facial-hair packs from needing one-off world
// offsets.

const slot = (values) => Object.freeze({
  sourceFrame: null,
  targetAnchor: null,
  referenceNodes: Object.freeze([]),
  surfaceRegions: Object.freeze([]),
  bilateral: false,
  preserveAuthoredShape: true,
  collisionPolicy: 'surface-clearance',
  ...values,
});

const region = (bone, landmarks, values = {}) => Object.freeze({
  bone,
  landmarks: Object.freeze(landmarks),
  clearance: 0.006,
  preserveVolume: true,
  ...values,
});

// Canonical body surface vocabulary. Runtime importers can sample the native
// player mesh around these bones and cache a morph-aware vertex cloud. Outside
// wearables then bind to a named region rather than to anonymous world offsets.
export const AVATAR_BODY_SURFACE_MAP = Object.freeze({
  scalp: region('Head', [
    'hairline-center', 'hairline-left', 'hairline-right',
    'temple-left', 'temple-right', 'crown', 'back-crown',
    'ear-root-left', 'ear-root-right', 'nape',
  ], { clearance: 0.003 }),
  face: region('Head', [
    'brow-left', 'brow-right', 'bridge', 'nose-tip',
    'cheek-left', 'cheek-right', 'jaw-left', 'jaw-right', 'chin',
  ], { clearance: 0.002 }),
  neck: region('Neck', [
    'throat', 'neck-left', 'neck-right', 'nape',
    'collar-left', 'collar-right',
  ], { clearance: 0.004 }),
  upperTorso: region('UpperChest', [
    'sternum-top', 'sternum-center', 'chest-left', 'chest-right',
    'shoulder-left', 'shoulder-right', 'upper-back-center',
    'upper-back-left', 'upper-back-right',
  ], { clearance: 0.008 }),
  lowerTorso: region('Spine', [
    'rib-left', 'rib-right', 'waist-front', 'waist-back',
    'waist-left', 'waist-right',
  ], { clearance: 0.008 }),
  hips: region('Hips', [
    'hip-front', 'hip-back', 'hip-left', 'hip-right',
    'seat-left', 'seat-right', 'crotch',
  ], { clearance: 0.008 }),
  leftArm: region('UpperArm_L', [
    'shoulder-left', 'upper-arm-left', 'elbow-left', 'forearm-left', 'wrist-left',
  ], { clearance: 0.006 }),
  rightArm: region('UpperArm_R', [
    'shoulder-right', 'upper-arm-right', 'elbow-right', 'forearm-right', 'wrist-right',
  ], { clearance: 0.006 }),
  leftHand: region('Hand_L', [
    'palm-left', 'thumb-root-left', 'knuckle-left', 'fingertip-left',
  ], { clearance: 0.003 }),
  rightHand: region('Hand_R', [
    'palm-right', 'thumb-root-right', 'knuckle-right', 'fingertip-right',
  ], { clearance: 0.003 }),
  leftLeg: region('UpperLeg_L', [
    'hip-left', 'thigh-left', 'knee-left', 'calf-left', 'ankle-left',
  ], { clearance: 0.007 }),
  rightLeg: region('UpperLeg_R', [
    'hip-right', 'thigh-right', 'knee-right', 'calf-right', 'ankle-right',
  ], { clearance: 0.007 }),
  leftFoot: region('Foot_L', [
    'heel-left', 'instep-left', 'toe-left', 'sole-left',
  ], { clearance: 0.004 }),
  rightFoot: region('Foot_R', [
    'heel-right', 'instep-right', 'toe-right', 'sole-right',
  ], { clearance: 0.004 }),
});

export const AVATAR_ATTACHMENT_BLUEPRINT = Object.freeze({
  hair: slot({
    sourceFrame: 'Head',
    targetAnchor: 'Head',
    referenceNodes: Object.freeze(['ZW_Hair_CrewCut', 'ZW_Hair_CloseCrop']),
    surfaceRegions: Object.freeze(['scalp']),
    bilateral: true,
  }),
  facialHair: slot({
    sourceFrame: 'Head',
    targetAnchor: 'Head',
    referenceNodes: Object.freeze(['ZW_FacialHair_Beard', 'ZW_FacialHair_Goatee']),
    surfaceRegions: Object.freeze(['face']),
    bilateral: true,
  }),
  hat: slot({
    sourceFrame: 'Head',
    targetAnchor: 'Head',
    referenceNodes: Object.freeze(['ZW_Hat_Beanie', 'ZW_Hat_BaseballCap']),
    surfaceRegions: Object.freeze(['scalp']),
    bilateral: true,
  }),
  glasses: slot({
    sourceFrame: 'Head',
    targetAnchor: 'Head',
    referenceNodes: Object.freeze(['ZW_Glasses_Pilot', 'ZW_Glasses_Square']),
    surfaceRegions: Object.freeze(['face']),
    bilateral: true,
  }),
  top: slot({
    sourceFrame: 'UpperChest',
    targetAnchor: 'ZW_Anchor_Chest',
    referenceNodes: Object.freeze(['ZW_Top_TShirt', 'ZW_Top_Hoodie']),
    surfaceRegions: Object.freeze(['neck', 'upperTorso', 'lowerTorso', 'leftArm', 'rightArm']),
    bilateral: true,
  }),
  bottom: slot({
    sourceFrame: 'Hips',
    targetAnchor: 'Hips',
    referenceNodes: Object.freeze(['ZW_Bottom_Jeans', 'ZW_Bottom_CargoShorts']),
    surfaceRegions: Object.freeze(['hips', 'leftLeg', 'rightLeg']),
    bilateral: true,
  }),
  leftShoe: slot({
    sourceFrame: 'Foot_L',
    targetAnchor: 'Foot_L',
    referenceNodes: Object.freeze(['ZW_Shoes_Basketball', 'ZW_Shoes_FlipFlops']),
    surfaceRegions: Object.freeze(['leftFoot']),
  }),
  rightShoe: slot({
    sourceFrame: 'Foot_R',
    targetAnchor: 'Foot_R',
    referenceNodes: Object.freeze(['ZW_Shoes_Basketball', 'ZW_Shoes_FlipFlops']),
    surfaceRegions: Object.freeze(['rightFoot']),
  }),
  jewelry: slot({
    sourceFrame: 'UpperChest',
    targetAnchor: 'ZW_Anchor_Chest',
    referenceNodes: Object.freeze([]),
    surfaceRegions: Object.freeze(['neck', 'upperTorso']),
    bilateral: true,
  }),
});

export function attachmentBlueprint(slotId) {
  return AVATAR_ATTACHMENT_BLUEPRINT[slotId] || null;
}

export function bodySurfaceRegion(regionId) {
  return AVATAR_BODY_SURFACE_MAP[regionId] || null;
}
