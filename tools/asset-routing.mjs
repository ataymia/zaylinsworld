// ───────────────────────────────────────────────────────────────────────────
//  asset-routing.mjs — the single source of truth for where a loose/staged
//  asset pack should land under public/assets/models/<domain>/<pack>/.
//
//  Both the loose-asset audit (tools/audit-loose-assets.mjs) and the organizer
//  (tools/organize-assets.mjs) consume this map so a folder named "Personajes
//  terror", "Cabañas", "Gas_station", etc. always routes to the same place and
//  every routable source is accounted for.
//
//  Each rule is matched (case-insensitively, accent-folded) against a source
//  folder/file name. The FIRST matching rule wins, so put more specific
//  keywords above broader ones (e.g. "personajes terror" before "personajes").
// ───────────────────────────────────────────────────────────────────────────

// Fold accents + lowercase so "Cabañas" matches "cabanas" and "caba".
export function normalizeName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// keyword (already accent-folded/lowercase) → { cat, slug }
// Order matters: specific keywords first.
export const ROUTING_RULES = [
  // ── characters ──────────────────────────────────────────────────────────
  { keyword: 'personajes terror', cat: 'characters', slug: 'spooky' },
  { keyword: 'terror',            cat: 'characters', slug: 'spooky' },
  { keyword: 'spooky',            cat: 'characters', slug: 'spooky' },
  { keyword: 'criaturas',         cat: 'characters', slug: 'creatures' },
  { keyword: 'creature',          cat: 'characters', slug: 'creatures' },
  { keyword: 'monster',           cat: 'characters', slug: 'creatures' },
  { keyword: 'characters_psx',    cat: 'characters', slug: 'psx' },
  { keyword: 'psx',               cat: 'characters', slug: 'psx' },
  { keyword: 'personajes',        cat: 'characters', slug: 'people' },

  // ── buildings / landmarks ────────────────────────────────────────────────
  { keyword: 'gas_station',       cat: 'buildings', slug: 'gas-station' },
  { keyword: 'gas station',       cat: 'buildings', slug: 'gas-station' },
  { keyword: 'mini market',       cat: 'buildings', slug: 'mini-market' },
  { keyword: 'market',            cat: 'buildings', slug: 'mini-market' },
  { keyword: 'diner',             cat: 'buildings', slug: 'diner' },
  { keyword: 'restaurant',        cat: 'buildings', slug: 'diner' },
  { keyword: 'cabanas',           cat: 'buildings', slug: 'cabins' },
  { keyword: 'caba',              cat: 'buildings', slug: 'cabins' },
  { keyword: 'cabin',             cat: 'buildings', slug: 'cabins' },
  { keyword: 'edificios',         cat: 'buildings', slug: 'misc' },
  { keyword: 'building',          cat: 'buildings', slug: 'misc' },
  { keyword: 'bui',               cat: 'buildings', slug: 'misc' },
  { keyword: 'shop',              cat: 'buildings', slug: 'shop' },
  { keyword: 'store',             cat: 'buildings', slug: 'shop' },

  // ── props / food / environment ────────────────────────────────────────────
  { keyword: 'comida',            cat: 'props', slug: 'food-extra' },
  { keyword: 'food',              cat: 'props', slug: 'food-extra' },
  { keyword: 'maquinas',          cat: 'props', slug: 'machines' },
  { keyword: 'machine',           cat: 'props', slug: 'machines' },
  { keyword: 'vending',           cat: 'props', slug: 'machines' },
  { keyword: 'arboles',           cat: 'props', slug: 'trees' },
  { keyword: 'arbol',             cat: 'props', slug: 'trees' },
  { keyword: 'tree',              cat: 'props', slug: 'trees' },
  { keyword: 'rocas',             cat: 'props', slug: 'rocks' },
  { keyword: 'rock',              cat: 'props', slug: 'rocks' },
  { keyword: 'pesca',             cat: 'props', slug: 'fishing' },
  { keyword: 'fishing',           cat: 'props', slug: 'fishing' },

  // ── weapons / vehicles / wearables ────────────────────────────────────────
  { keyword: 'weapon',            cat: 'weapons',  slug: null },
  { keyword: 'gun',               cat: 'weapons',  slug: null },
  { keyword: 'wp',                cat: 'weapons',  slug: null },
  { keyword: 'car',               cat: 'vehicles', slug: null },
  { keyword: 'vehicle',           cat: 'vehicles', slug: null },
  { keyword: 'hair',              cat: 'hair',     slug: null },
  { keyword: 'jewelry',           cat: 'jewelry',  slug: null },
  { keyword: 'chain',             cat: 'jewelry',  slug: null },
  { keyword: 'ring',              cat: 'jewelry',  slug: null },
];

// Turn a raw name into a clean pack slug (used when a rule has slug:null and
// the pack name itself becomes the destination folder).
export function slugifyPack(s) {
  return normalizeName(s)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'misc';
}

// Guess { cat, slug, dest, keyword } for a source folder/file name, or null if
// nothing matches. `dest` is the served path relative to public/assets/models.
export function routeFor(name) {
  const norm = normalizeName(name);
  for (const rule of ROUTING_RULES) {
    if (norm.includes(rule.keyword)) {
      const slug = rule.slug || slugifyPack(name);
      return { cat: rule.cat, slug, dest: `${rule.cat}/${slug}`, keyword: rule.keyword };
    }
  }
  return null;
}

export default { ROUTING_RULES, routeFor, slugifyPack, normalizeName };
