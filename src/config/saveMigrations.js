// Focused save-position repairs that stay independent from avatar/browser
// modules so they can be regression-tested in Node and reused by state.js.
import { worldRegistry } from '../runtime/WorldRegistry.js';

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

// Schema v5 briefly relocated the compact-map Dreamdrop Park from (15, 15) to
// the large-world park before fresh arrivals were moved to the new core. That
// transformed the legacy default spawn (9, 9) into (park.x - 6, park.z - 6),
// leaving affected players hundreds of metres from the starter vehicle. Repair
// only that exact, one-release artifact; intentional saves elsewhere are kept.
export function repairLegacyParkArrival(position, data = {}) {
  const safe = { x: finite(position?.x), z: finite(position?.z) };
  const world = data.world || {};
  if (Number(data.version) !== 5
    || data.createdCharacter !== true
    || world.largeWorldEnabled !== true
    || world.spawnId !== 'dreamdrop-core'
    || !Array.isArray(world.relocatedLocations)
    || !world.relocatedLocations.includes('dreamdrop-park')) return safe;

  const park = worldRegistry.location('dreamdrop-park')?.position;
  const core = worldRegistry.spawn('dreamdrop-core')?.position;
  if (!park || !core) return safe;
  const accidentalArrival = { x: park.x - 6, z: park.z - 6 };
  if (Math.hypot(safe.x - accidentalArrival.x, safe.z - accidentalArrival.z) > 3.5) return safe;
  return { x: core.x, z: core.z };
}

// Schema v6 placed Zaylins Prep directly over Scholar Road at x=-724. Move a
// player who saved on that affected campus footprint with the building when the
// road-safe x=-780 frontage ships. Unrelated saves are never touched.
export function repairSchoolRoadPlacement(position, data = {}) {
  const safe = { x: finite(position?.x), z: finite(position?.z) };
  if (Number(data.version) > 6
    || data.world?.largeWorldEnabled !== true
    || !data.world?.relocatedLocations?.includes('zaylins-prep')) return safe;
  const legacyTarget = { x: -724, z: 72 };
  if (Math.abs(safe.x - legacyTarget.x) > 30 || Math.abs(safe.z - legacyTarget.z) > 28) return safe;
  return { x: safe.x - 56, z: safe.z };
}

export default repairLegacyParkArrival;
