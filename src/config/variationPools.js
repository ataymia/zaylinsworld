// ───────────────────────────────────────────────────────────────────────────
//  variationPools.js — named "give me an X" asset pools (Phase 2A)
//
//  A variation pool answers a semantic request ("give me a restaurant counter",
//  "give me any diner seating", "give me a gas pump", "give me a couch") by
//  describing WHICH assets are eligible — not by hard-coding one file. The
//  resolver in prefabRegistry.js filters the live asset registry (built from
//  asset-index-v2.json by assetRegistry.js) with a pool's query and then picks a
//  variation (random / weighted / seeded / tiered / fallback).
//
//  Design rule: never one asset per thing. Every pool is a CATEGORY (or set of
//  categories) plus optional tag/pack/theme/size/tier filters, so dropping new
//  GLBs into the index automatically grows the pool — no gameplay code changes.
//
//  Pure data (no THREE / no DOM): consumed in-game AND by tooling.
//
//  Pool shape:
//    {
//      categories: [semanticCategory, ...],   // from assetRegistry.SEMANTIC_CATEGORIES
//      tags:       [keyword, ...],             // OR-match against name/path/pack
//      packs:      [packSlug, ...],            // restrict to certain source packs
//      excludeTags:[keyword, ...],             // drop anything matching these
//      themes:     { themeName: weightMultiplier },  // bias by town/location theme
//      tier:       'low' | 'mid' | 'high' | null,    // quality bias (size-based proxy)
//      size:       'small' | 'medium' | 'large' | null,
//      requireSafe:true,                       // only assets flagged safe in the registry
//      min:        1,                          // how many to place (a builder hint)
//      max:        1,
//      fallbackCategory: semanticCategory,     // procedural fallback domain if pool empty
//      weightBy:   'none' | 'texture' | 'tested', // simple weighting strategies
//    }
// ───────────────────────────────────────────────────────────────────────────

export const VARIATION_POOLS = {
  // ── food / restaurant ────────────────────────────────────────────────────
  restaurant_counter: {
    categories: ['restaurant_counter', 'counter'], tags: ['counter', 'register', 'bar'],
    fallbackCategory: 'counter', min: 1, max: 1, requireSafe: true,
  },
  diner_seating: {
    categories: ['booth', 'table', 'chair'], tags: ['booth', 'table', 'chair', 'stool', 'bench'],
    fallbackCategory: 'table', min: 3, max: 8, requireSafe: true,
  },
  food_chicken: {
    categories: ['chicken_piece', 'food_tray', 'plate', 'basket'],
    tags: ['chicken', 'wing', 'drumstick', 'tray', 'plate', 'fries', 'nugget'],
    fallbackCategory: 'food_tray', min: 2, max: 6, requireSafe: true,
  },
  food_generic: {
    categories: ['plate', 'drink', 'packaged_food', 'produce', 'food_tray'],
    tags: ['food', 'drink', 'cup', 'bottle', 'snack', 'box'],
    fallbackCategory: 'plate', min: 2, max: 5, requireSafe: true,
  },
  fryer_kitchen: {
    categories: ['fryer', 'cooking', 'stove'], tags: ['fryer', 'grill', 'stove', 'oven', 'kitchen'],
    fallbackCategory: 'stove', min: 1, max: 2, requireSafe: true,
  },

  // ── furniture (homes / living rooms / offices) ────────────────────────────
  couch: { categories: ['couch'], tags: ['couch', 'sofa', 'settee'], fallbackCategory: 'couch', min: 1, max: 1, requireSafe: true },
  bed: { categories: ['bed'], tags: ['bed', 'mattress'], fallbackCategory: 'bed', min: 1, max: 1, requireSafe: true },
  dresser: { categories: ['dresser', 'cabinet'], tags: ['dresser', 'wardrobe', 'closet', 'drawer'], fallbackCategory: 'dresser', min: 1, max: 1, requireSafe: true },
  home_table: { categories: ['table'], tags: ['table', 'desk', 'dining'], fallbackCategory: 'table', min: 1, max: 2, requireSafe: true },
  bathroom_set: { categories: ['toilet', 'sink', 'shower'], tags: ['toilet', 'sink', 'shower', 'bath', 'mirror'], fallbackCategory: 'sink', min: 1, max: 3, requireSafe: true },
  office_desk: { categories: ['desk', 'table'], tags: ['desk', 'computer', 'workstation', 'monitor'], fallbackCategory: 'desk', min: 2, max: 6, requireSafe: true },

  // ── store props ───────────────────────────────────────────────────────────
  gas_pump: { categories: ['gas_pump'], tags: ['pump', 'fuel', 'gas'], fallbackCategory: 'gas_pump', min: 2, max: 4, requireSafe: true },
  price_sign: { categories: ['price_sign', 'sign'], tags: ['price', 'sign', 'board'], fallbackCategory: 'sign', min: 1, max: 1, requireSafe: true },
  register: { categories: ['cash_register'], tags: ['register', 'cashier', 'till', 'pos'], fallbackCategory: 'cash_register', min: 1, max: 1, requireSafe: true },
  shop_shelf: { categories: ['shelf'], tags: ['shelf', 'rack', 'aisle'], fallbackCategory: 'shelf', min: 2, max: 6, requireSafe: true },
  vending: { categories: ['vending'], tags: ['vending', 'cooler', 'fridge'], fallbackCategory: 'vending', min: 1, max: 2, requireSafe: true },

  // ── Block Supply (weapons displayed physically) ───────────────────────────
  weapon_wall: { categories: ['weapon_rack', 'rifle', 'shotgun'], tags: ['rack', 'wall', 'rifle', 'ar', 'shotgun', 'long'], fallbackCategory: 'weapon_rack', min: 3, max: 8, requireSafe: true },
  pistol_wall: { categories: ['pistol', 'compact'], tags: ['pistol', 'handgun', 'glock', 'mac', 'compact', 'smg'], fallbackCategory: 'display_case', min: 3, max: 8, requireSafe: true },
  melee_rack: { categories: ['melee'], tags: ['bat', 'pipe', 'wrench', 'plank', 'crowbar', 'knife', 'machete', 'melee'], fallbackCategory: 'weapon_rack', min: 2, max: 6, requireSafe: true },
  ammo_shelf: { categories: ['ammo_box', 'ammo'], tags: ['ammo', 'magazine', 'box', 'crate', 'rounds'], fallbackCategory: 'ammo_box', min: 2, max: 5, requireSafe: true },
  upgrade_counter: { categories: ['counter', 'cash_register'], tags: ['counter', 'bench', 'workbench'], fallbackCategory: 'counter', min: 1, max: 1, requireSafe: true },

  // ── Frostbox / jewelry ────────────────────────────────────────────────────
  jewelry_case: { categories: ['jewelry_case', 'display_case'], tags: ['case', 'display', 'jewelry', 'glass'], fallbackCategory: 'display_case', min: 2, max: 5, requireSafe: true },
  gem_display: { categories: ['decoration'], tags: ['gem', 'diamond', 'crystal', 'chain', 'ring', 'necklace'], fallbackCategory: 'decoration', min: 3, max: 8, requireSafe: true },

  // ── school ──────────────────────────────────────────────────────────────
  classroom_desk: { categories: ['desk', 'chair', 'table'], tags: ['desk', 'school', 'student', 'classroom'], fallbackCategory: 'desk', min: 4, max: 10, requireSafe: true },
  classroom_board: { categories: ['decoration', 'sign'], tags: ['board', 'chalk', 'whiteboard', 'blackboard'], fallbackCategory: 'sign', min: 1, max: 1, requireSafe: true },

  // ── gym ─────────────────────────────────────────────────────────────────
  gym_equipment: { categories: ['decoration'], tags: ['treadmill', 'weight', 'dumbbell', 'bench', 'barbell', 'machine', 'gym'], fallbackCategory: 'decoration', min: 3, max: 8, requireSafe: true },

  // ── police ────────────────────────────────────────────────────────────────
  police_props: { categories: ['desk', 'sign', 'decoration'], tags: ['police', 'cone', 'barrier', 'desk', 'locker', 'evidence'], fallbackCategory: 'desk', min: 2, max: 5, requireSafe: true },

  // ── world dressing / trash ─────────────────────────────────────────────────
  trash: { categories: ['trash_bag', 'trash_can', 'dumpster'], tags: ['trash', 'garbage', 'debris', 'bag', 'can', 'litter', 'bin', 'dumpster'], fallbackCategory: 'trash_bag', min: 3, max: 7, requireSafe: true },
  street_dressing: { categories: ['cone', 'hydrant', 'mailbox', 'bench', 'traffic_sign'], tags: ['cone', 'hydrant', 'mailbox', 'bench', 'sign', 'barrier'], fallbackCategory: 'cone', min: 1, max: 4, requireSafe: true },

  // ── vehicles (dealership display variation) ────────────────────────────────
  display_car: { categories: ['dealership_display_car', 'sedan', 'sports_car', 'luxury_car'], tags: ['car', 'vehicle', 'sedan', 'coupe', 'sport'], fallbackCategory: 'sedan', min: 1, max: 5, requireSafe: true },
};

// Aliases — friendly request strings → pool ids (so callers can ask naturally).
export const POOL_ALIASES = {
  'restaurant counter': 'restaurant_counter',
  'diner seating': 'diner_seating',
  'chicken spot seating': 'diner_seating',
  'food tray': 'food_chicken',
  'chicken prop': 'food_chicken',
  'gas pump': 'gas_pump',
  'small house exterior': 'house_small_ext',
  'police station props': 'police_props',
  'weapon wall display': 'weapon_wall',
  'melee rack items': 'melee_rack',
  'trash bag': 'trash',
  'trash can': 'trash',
  'debris': 'trash',
  'classroom desks': 'classroom_desk',
  'gym equipment': 'gym_equipment',
};

export function resolvePoolAlias(name) {
  if (!name) return null;
  if (VARIATION_POOLS[name]) return name;
  const k = String(name).toLowerCase().trim();
  return POOL_ALIASES[k] || (VARIATION_POOLS[k] ? k : null);
}

export default VARIATION_POOLS;
