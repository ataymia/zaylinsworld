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
  bilateral: false,
  preserveAuthoredShape: true,
  ...values,
});

export const AVATAR_ATTACHMENT_BLUEPRINT = Object.freeze({
  hair: slot({
    sourceFrame: 'Head',
    targetAnchor: 'Head',
    referenceNodes: Object.freeze(['ZW_Hair_CrewCut', 'ZW_Hair_CloseCrop']),
    bilateral: true,
  }),
  facialHair: slot({
    sourceFrame: 'Head',
    targetAnchor: 'Head',
    referenceNodes: Object.freeze(['ZW_FacialHair_Beard', 'ZW_FacialHair_Goatee']),
    bilateral: true,
  }),
  hat: slot({
    sourceFrame: 'Head',
    targetAnchor: 'Head',
    referenceNodes: Object.freeze(['ZW_Hat_Beanie', 'ZW_Hat_BaseballCap']),
    bilateral: true,
  }),
  glasses: slot({
    sourceFrame: 'Head',
    targetAnchor: 'Head',
    referenceNodes: Object.freeze(['ZW_Glasses_Pilot', 'ZW_Glasses_Square']),
    bilateral: true,
  }),
  top: slot({
    sourceFrame: 'UpperChest',
    targetAnchor: 'ZW_Anchor_Chest',
    referenceNodes: Object.freeze(['ZW_Top_TShirt', 'ZW_Top_Hoodie']),
    bilateral: true,
  }),
  bottom: slot({
    sourceFrame: 'Hips',
    targetAnchor: 'Hips',
    referenceNodes: Object.freeze(['ZW_Bottom_Jeans', 'ZW_Bottom_CargoShorts']),
    bilateral: true,
  }),
  leftShoe: slot({
    sourceFrame: 'Foot_L',
    targetAnchor: 'Foot_L',
    referenceNodes: Object.freeze(['ZW_Shoes_Basketball', 'ZW_Shoes_FlipFlops']),
  }),
  rightShoe: slot({
    sourceFrame: 'Foot_R',
    targetAnchor: 'Foot_R',
    referenceNodes: Object.freeze(['ZW_Shoes_Basketball', 'ZW_Shoes_FlipFlops']),
  }),
  jewelry: slot({
    sourceFrame: 'UpperChest',
    targetAnchor: 'ZW_Anchor_Chest',
    referenceNodes: Object.freeze([]),
    bilateral: true,
  }),
});

export function attachmentBlueprint(slotId) {
  return AVATAR_ATTACHMENT_BLUEPRINT[slotId] || null;
}
