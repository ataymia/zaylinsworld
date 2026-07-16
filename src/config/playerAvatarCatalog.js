// ─────────────────────────────────────────────────────────────────────────────
// playerAvatarCatalog.js — pack-agnostic player creator schema.
//
// The UI and save format use Zaylins-owned ids. Imported packs only supply the
// meshes/textures behind those ids, so a later Genies/full-pack migration does
// not require rebuilding the wardrobe or invalidating saved outfits.
// ─────────────────────────────────────────────────────────────────────────────
import { SKIN_TONES, JEWELRY } from '../avatar.js';

export const PLAYER_MODEL_URL = './assets/models/characters/player/sunbox-male-free.glb';
export const PLAYER_TEXTURE_ROOT = './assets/models/characters/player/sunbox-male-free/textures/';

const item = (id, name, extra = {}) => Object.freeze({ id, name, owned: true, ...extra });
const variant = (id, name, path, swatch = null) => Object.freeze({
  id, name, path: PLAYER_TEXTURE_ROOT + path, swatch,
});

export const PLAYER_AVATAR_CATALOG = Object.freeze({
  source: Object.freeze({
    creator: 'Sunbox Games',
    marketplace: 'CGTrader',
    modelId: '3901952',
    license: 'Royalty Free License (no AI)',
  }),
  bases: Object.freeze([
    item('sunbox-male-free', 'Male Base', { modelUrl: PLAYER_MODEL_URL, status: 'available' }),
    item('future-base', 'More Bases', { status: 'coming-soon', disabled: true }),
  ]),
  skinTones: SKIN_TONES,
  jewelry: JEWELRY,
  slots: Object.freeze({
    hair: Object.freeze([
      item('none', 'No Hair'),
      item('crew-cut', 'Crew Cut', { node: 'ZW_Hair_CrewCut' }),
      item('close-crop', 'Close Crop', { node: 'ZW_Hair_CloseCrop' }),
    ]),
    facialHair: Object.freeze([
      item('none', 'Clean Shave'),
      item('beard', 'Full Beard', { node: 'ZW_FacialHair_Beard' }),
      item('goatee', 'Goatee', { node: 'ZW_FacialHair_Goatee' }),
    ]),
    top: Object.freeze([
      item('tshirt', 'T-Shirt', { node: 'ZW_Top_TShirt' }),
      item('hoodie', 'Hoodie', { node: 'ZW_Top_Hoodie' }),
    ]),
    bottom: Object.freeze([
      item('jeans', 'Jeans', { node: 'ZW_Bottom_Jeans' }),
      item('cargo-shorts', 'Cargo Shorts', { node: 'ZW_Bottom_CargoShorts' }),
    ]),
    shoes: Object.freeze([
      item('basketball', 'Basketball Shoes', { node: 'ZW_Shoes_Basketball' }),
      item('flipflops', 'Flip-Flops', { node: 'ZW_Shoes_FlipFlops' }),
    ]),
    hat: Object.freeze([
      item('none', 'No Hat'),
      item('beanie', 'Beanie', { node: 'ZW_Hat_Beanie' }),
      item('baseball-cap', 'Baseball Cap', { node: 'ZW_Hat_BaseballCap' }),
    ]),
    glasses: Object.freeze([
      item('none', 'No Glasses'),
      item('pilot', 'Pilot Glasses', { node: 'ZW_Glasses_Pilot' }),
      item('square', 'Classic Square', { node: 'ZW_Glasses_Square' }),
    ]),
  }),
  variants: Object.freeze({
    eyes: Object.freeze([
      variant('blue01', 'Ice Blue', 'eyes/eyes-blue01.webp', '#75b9ff'),
      variant('blue02', 'Ocean Blue', 'eyes/eyes-blue02.webp', '#3578c9'),
      variant('blue03', 'Deep Blue', 'eyes/eyes-blue03.webp', '#244f9a'),
      variant('brown01', 'Golden Brown', 'eyes/eyes-brown01.webp', '#8b5a2b'),
      variant('brown02', 'Warm Brown', 'eyes/eyes-brown02.webp', '#5d3924'),
      variant('brown03', 'Dark Brown', 'eyes/eyes-brown03.webp', '#342218'),
      variant('brown04', 'Honey Brown', 'eyes/eyes-brown04.webp', '#a66b31'),
      variant('green01', 'Emerald', 'eyes/eyes-green01.webp', '#2f8c5a'),
      variant('green02', 'Olive', 'eyes/eyes-green02.webp', '#6c7c3f'),
      variant('orange', 'Amber', 'eyes/eyes-orange.webp', '#d47b27'),
      variant('pink01', 'Rose', 'eyes/eyes-pink01.webp', '#e06b9f'),
      variant('pink02', 'Hot Pink', 'eyes/eyes-pink02.webp', '#ef3f97'),
      variant('purple01', 'Violet', 'eyes/eyes-purple01.webp', '#7b4ab7'),
      variant('purple02', 'Deep Purple', 'eyes/eyes-purple02.webp', '#4f2a8b'),
      variant('red01', 'Ruby', 'eyes/eyes-red01.webp', '#ba3030'),
      variant('red02', 'Crimson', 'eyes/eyes-red02.webp', '#7e1818'),
      variant('teal01', 'Teal', 'eyes/eyes-teal01.webp', '#2aa5a2'),
    ]),
    eyelashes: Object.freeze([
      variant('01', 'Natural', 'eyelashes/eyelashes-01.webp'),
      variant('02', 'Soft', 'eyelashes/eyelashes-02.webp'),
      variant('03', 'Full', 'eyelashes/eyelashes-03.webp'),
      variant('04', 'Dramatic', 'eyelashes/eyelashes-04.webp'),
    ]),
    hair: Object.freeze([
      variant('natural', 'Natural', 'hair/hair-diffuse.webp', '#20140d'),
      variant('rainbow', 'Rainbow', 'hair/hair-rainbow-diffuse.webp'),
    ]),
    tshirt: Object.freeze([
      variant('white', 'White', 'tshirt/tshirt-white.webp', '#f0f0f0'),
      variant('black', 'Black', 'tshirt/tshirt-black.webp', '#161616'),
      variant('pink', 'Pink', 'tshirt/tshirt-pink.webp', '#db6b9a'),
      variant('logo', 'Graphic Logo', 'tshirt/tshirt-logo.webp'),
    ]),
    hoodie: Object.freeze([
      variant('grey', 'Grey', 'hoodie/hoodie-grey.webp', '#77777e'),
      variant('white', 'White', 'hoodie/hoodie-white.webp', '#f0f0f0'),
    ]),
    jeans: Object.freeze([
      variant('blue', 'Blue Denim', 'jeans/jeans-blue.webp', '#38527a'),
      variant('black', 'Black Denim', 'jeans/jeans-black.webp', '#202126'),
      variant('pink', 'Pink Denim', 'jeans/jeans-pink.webp', '#b65e82'),
      variant('white', 'White Denim', 'jeans/jeans-white.webp', '#e7e7e7'),
    ]),
    'cargo-shorts': Object.freeze([
      variant('black', 'Black', 'shorts/cargo-shorts-black.webp', '#202020'),
      variant('blue', 'Blue', 'shorts/cargo-shorts-blue.webp', '#3d5b83'),
      variant('pink', 'Pink', 'shorts/cargo-shorts-pink.webp', '#bf6b8c'),
      variant('white', 'White', 'shorts/cargo-shorts-white.webp', '#ededed'),
    ]),
    basketball: Object.freeze([
      variant('white', 'White', 'basketball-shoes/basketball-shoes-white.webp', '#f0f0f0'),
      variant('black', 'Black', 'basketball-shoes/basketball-shoes-black.webp', '#151515'),
      variant('pink', 'Pink', 'basketball-shoes/basketball-shoes-pink.webp', '#d85f93'),
      variant('blue', 'Blue', 'basketball-shoes/sneakers-blue.webp', '#416fc1'),
    ]),
    flipflops: Object.freeze([
      variant('white', 'White', 'flipflops/flip-flops-white.webp', '#ededed'),
    ]),
    beanie: Object.freeze([
      variant('black', 'Black', 'beanie/beanie-black.webp', '#151515'),
      variant('white', 'White', 'beanie/beanie-white.webp', '#ededed'),
    ]),
    'baseball-cap': Object.freeze([
      variant('black', 'Black', 'baseball-cap/baseball-cap-black.webp', '#151515'),
      variant('white', 'White', 'baseball-cap/baseball-cap-white.webp', '#ededed'),
    ]),
  }),
  bodySliders: Object.freeze([
    Object.freeze({ key: 'heightScale', label: 'Height', min: 0.88, max: 1.12, step: 0.01, defaultValue: 1 }),
    Object.freeze({ key: 'bodyMass', label: 'Body Build', min: -1, max: 1, step: 0.02, defaultValue: 0 }),
    Object.freeze({ key: 'bodyMuscle', label: 'Muscle', min: 0, max: 1, step: 0.02, defaultValue: 0.18 }),
    Object.freeze({ key: 'nailsLength', label: 'Nail Length', min: 0, max: 1, step: 0.02, defaultValue: 0 }),
    Object.freeze({ key: 'nailsCurve', label: 'Nail Curve', min: 0, max: 1, step: 0.02, defaultValue: 0 }),
  ]),
  faceSliders: Object.freeze([
    ['noseWidth', 'Nose Width', 'Face_NoseWidth_Min', 'Face_NoseWidth_Max'],
    ['noseLength', 'Nose Length', 'Face_NoseLength_Min', 'Face_NoseLength_Max'],
    ['noseHeight', 'Nose Height', 'Face_NoseHeight_Min', 'Face_NoseHeight_Max'],
    ['noseBridge', 'Nose Bridge', 'Face_NoseBridge_Min', 'Face_NoseBridge_Max'],
    ['noseTilt', 'Nose Tilt', 'Face_NoseTilt_Min', 'Face_NoseTilt_Max'],
    ['mouthWidth', 'Mouth Width', 'Face_MouthWidth_Min', 'Face_MouthWidth_Max'],
    ['lipsWidth', 'Lip Fullness', 'Face_LipsWidth_Min', 'Face_LipsWidth_Max'],
    ['cheeks', 'Cheeks', 'Face_Cheeks_Min', 'Face_Cheeks_Max'],
    ['browHeight', 'Brow Height', 'Face_BrowHeight_Min', 'Face_BrowHeight_Max'],
    ['browThickness', 'Brow Thickness', 'Face_BrowThickness_Min', 'Face_BrowThickness_Max'],
    ['browWidth', 'Brow Width', 'Face_BrowWidth_Min', 'Face_BrowWidth_Max'],
    ['browCurve', 'Brow Curve', 'Face_BrowCurve_Min', 'Face_BrowCurve_Max'],
    ['eyeSize', 'Eye Size', 'Face_EyesSize_Min', 'Face_EyesSize_Max'],
    ['earSize', 'Ear Size', 'Face_EarsSize_Min', 'Face_EarsSize_Max'],
    ['earFlare', 'Ear Flare', 'Face_EarsFlare_Min', 'Face_EarsFlare_Max'],
    ['jawWidth', 'Jaw Width', 'Face_JawWidth_Min', 'Face_JawWidth_Max'],
    ['chinWidth', 'Chin Width', 'Face_ChinWidth_Min', 'Face_ChinWidth_Max'],
    ['chinProjection', 'Chin Projection', 'Face_ChinProtrusion_Min', 'Face_ChinProtrusion_Max'],
  ].map(([key, label, minTarget, maxTarget]) => Object.freeze({
    key, label, min: -1, max: 1, step: 0.02, defaultValue: 0, minTarget, maxTarget,
  }))),
});

export const PLAYER_CUSTOM_DEFAULTS = Object.freeze({
  avatarBase: 'sunbox-male-free',
  heightScale: 1,
  bodyMass: 0,
  bodyMuscle: 0.18,
  nailsLength: 0,
  nailsCurve: 0,
  eyeTexture: 'brown02',
  eyelashTexture: '01',
  modularHair: 'crew-cut',
  hairTexture: 'natural',
  facialHair: 'none',
  modularTop: 'tshirt',
  topTexture: 'white',
  modularBottom: 'jeans',
  bottomTexture: 'blue',
  modularShoes: 'basketball',
  shoesTexture: 'white',
  hat: 'none',
  hatTexture: 'black',
  glasses: 'none',
  faceMorphs: Object.freeze(Object.fromEntries(PLAYER_AVATAR_CATALOG.faceSliders.map((s) => [s.key, 0]))),
});

const BODY_MIGRATION = Object.freeze({
  slim: { bodyMass: -0.55, bodyMuscle: 0.08 },
  average: { bodyMass: 0, bodyMuscle: 0.18 },
  athletic: { bodyMass: 0.05, bodyMuscle: 0.72 },
  heavy: { bodyMass: 0.68, bodyMuscle: 0.18 },
});
const HEIGHT_MIGRATION = Object.freeze({ short: 0.92, average: 1, tall: 1.08 });

function hasItem(slot, id) {
  return PLAYER_AVATAR_CATALOG.slots[slot].some((entry) => entry.id === id);
}
function hasVariant(group, id) {
  return (PLAYER_AVATAR_CATALOG.variants[group] || []).some((entry) => entry.id === id);
}

export function ensurePlayerCustom(custom = {}) {
  const out = custom;
  const oldBody = BODY_MIGRATION[out.body] || BODY_MIGRATION.average;
  if (!PLAYER_AVATAR_CATALOG.skinTones.some((entry) => entry.id === out.skin)) {
    out.skin = PLAYER_AVATAR_CATALOG.skinTones.find((entry) => entry.id === 'umber')?.id
      || PLAYER_AVATAR_CATALOG.skinTones[0]?.id;
  }
  if (!PLAYER_AVATAR_CATALOG.jewelry.some((entry) => entry.id === out.jewelry)) out.jewelry = 'none';
  if (!Number.isFinite(out.heightScale)) out.heightScale = HEIGHT_MIGRATION[out.height] || PLAYER_CUSTOM_DEFAULTS.heightScale;
  if (!Number.isFinite(out.bodyMass)) out.bodyMass = oldBody.bodyMass;
  if (!Number.isFinite(out.bodyMuscle)) out.bodyMuscle = oldBody.bodyMuscle;
  if (!Number.isFinite(out.nailsLength)) out.nailsLength = PLAYER_CUSTOM_DEFAULTS.nailsLength;
  if (!Number.isFinite(out.nailsCurve)) out.nailsCurve = PLAYER_CUSTOM_DEFAULTS.nailsCurve;
  if (!out.avatarBase) out.avatarBase = PLAYER_CUSTOM_DEFAULTS.avatarBase;
  if (!hasVariant('eyes', out.eyeTexture)) out.eyeTexture = PLAYER_CUSTOM_DEFAULTS.eyeTexture;
  if (!hasVariant('eyelashes', out.eyelashTexture)) out.eyelashTexture = PLAYER_CUSTOM_DEFAULTS.eyelashTexture;
  if (!hasItem('hair', out.modularHair)) out.modularHair = PLAYER_CUSTOM_DEFAULTS.modularHair;
  if (!hasVariant('hair', out.hairTexture)) out.hairTexture = PLAYER_CUSTOM_DEFAULTS.hairTexture;
  if (!hasItem('facialHair', out.facialHair)) out.facialHair = PLAYER_CUSTOM_DEFAULTS.facialHair;
  if (!hasItem('top', out.modularTop)) out.modularTop = PLAYER_CUSTOM_DEFAULTS.modularTop;
  if (!hasVariant(out.modularTop, out.topTexture)) out.topTexture = PLAYER_CUSTOM_DEFAULTS.topTexture;
  if (!hasItem('bottom', out.modularBottom)) out.modularBottom = PLAYER_CUSTOM_DEFAULTS.modularBottom;
  if (!hasVariant(out.modularBottom, out.bottomTexture)) out.bottomTexture = PLAYER_CUSTOM_DEFAULTS.bottomTexture;
  if (!hasItem('shoes', out.modularShoes)) out.modularShoes = PLAYER_CUSTOM_DEFAULTS.modularShoes;
  if (!hasVariant(out.modularShoes, out.shoesTexture)) out.shoesTexture = PLAYER_CUSTOM_DEFAULTS.shoesTexture;
  if (!hasItem('hat', out.hat)) out.hat = PLAYER_CUSTOM_DEFAULTS.hat;
  if (out.hat !== 'none' && !hasVariant(out.hat, out.hatTexture)) out.hatTexture = PLAYER_CUSTOM_DEFAULTS.hatTexture;
  if (!hasItem('glasses', out.glasses)) out.glasses = PLAYER_CUSTOM_DEFAULTS.glasses;
  out.faceMorphs = { ...PLAYER_CUSTOM_DEFAULTS.faceMorphs, ...(out.faceMorphs || {}) };
  return out;
}

export function clonePlayerAppearance(custom = {}) {
  const c = ensurePlayerCustom({ ...custom, faceMorphs: { ...(custom.faceMorphs || {}) } });
  return {
    avatarBase: c.avatarBase,
    skin: c.skin,
    hairColor: c.hairColor,
    jewelry: c.jewelry,
    heightScale: c.heightScale,
    bodyMass: c.bodyMass,
    bodyMuscle: c.bodyMuscle,
    nailsLength: c.nailsLength,
    nailsCurve: c.nailsCurve,
    eyeTexture: c.eyeTexture,
    eyelashTexture: c.eyelashTexture,
    modularHair: c.modularHair,
    hairTexture: c.hairTexture,
    facialHair: c.facialHair,
    modularTop: c.modularTop,
    topTexture: c.topTexture,
    modularBottom: c.modularBottom,
    bottomTexture: c.bottomTexture,
    modularShoes: c.modularShoes,
    shoesTexture: c.shoesTexture,
    hat: c.hat,
    hatTexture: c.hatTexture,
    glasses: c.glasses,
    faceMorphs: { ...c.faceMorphs },
  };
}

export function applyPlayerAppearance(target, appearance) {
  if (!target || !appearance) return target;
  Object.assign(target, appearance, { faceMorphs: { ...(appearance.faceMorphs || {}) } });
  return ensurePlayerCustom(target);
}

export function variantFor(group, id) {
  const list = PLAYER_AVATAR_CATALOG.variants[group] || [];
  return list.find((entry) => entry.id === id) || list[0] || null;
}
