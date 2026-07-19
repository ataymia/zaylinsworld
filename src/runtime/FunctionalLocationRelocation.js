// Phase 7A: shared relocation contracts and cutover parity gate.
// Pure runtime data: no scene mutation and no save migration occurs until a
// location explicitly records every required piece of live evidence.
import { STARTER_TOWN_LOCATIONS } from '../config/starterTownRuntimePlan.js';
import { PARCEL_BY_LOCATION_ID } from '../config/starterTownParcelPlan.js';

const freeze = (value) => Object.freeze(value);

export const RELOCATION_PARITY_FIELDS = freeze([
  'exteriorPlaced',
  'doorInteraction',
  'interiorPreserved',
  'interiorReturn',
  'sidewalkAccess',
  'parkingAndService',
  'npcWorkPoints',
  'missionCheckpoints',
  'minimapMarker',
  'policeAccess',
  'deliveryAccess',
  'collision',
  'saveLoadInside',
  'oldCoordinateMigration',
  'assetReplacementById',
]);

const LEGACY_BINDINGS = freeze({
  frostbox: freeze({ sourceId: 'frostbox', x: -15, z: -15 }),
  'chicken-spot': freeze({ sourceId: 'chicken', x: 15, z: -15 }),
  'kicks-fits': freeze({ sourceId: 'kicks', x: -15, z: 15 }),
  'block-supply': freeze({ sourceId: 'blocksupply', x: -44, z: 0 }),
  'auto-haus': freeze({ sourceId: 'dealership', x: -15, z: -44 }),
  'city-garage': freeze({ sourceId: 'garage', x: 15, z: -44 }),
  'zaylins-prep': freeze({ sourceId: 'school', x: -44, z: -24 }),
  'police-station': freeze({ sourceId: 'police', x: 48, z: -24 }),
  worktower: freeze({ sourceId: 'office', x: 44, z: 24 }),
  'iron-city-gym': freeze({ sourceId: 'gym', x: 44, z: 0 }),
  '6twelve': freeze({ sourceId: 'gas', x: -46, z: 24 }),
  'zaylins-home': freeze({ sourceId: 'home', x: 0, z: 44 }),
  'dreamdrop-park': freeze({ sourceId: 'park', x: 15, z: 15 }),
});

export const FUNCTIONAL_LOCATION_CONTRACTS = freeze(STARTER_TOWN_LOCATIONS.map((location) => {
  const parcel = PARCEL_BY_LOCATION_ID[location.id];
  const legacy = LEGACY_BINDINGS[location.id];
  if (!parcel || !legacy) throw new Error(`Missing Phase 7A binding for ${location.id}`);
  return freeze({
    locationId: location.id,
    stableId: location.id,
    name: location.name,
    interiorId: location.interiorId || null,
    parcelId: parcel.id,
    districtId: location.districtId,
    legacy: freeze({ ...legacy, interiorId: location.interiorId || null }),
    target: freeze({ ...location.position }),
    assetRef: location.assetRef,
    parityFields: RELOCATION_PARITY_FIELDS,
  });
}));

export const FUNCTIONAL_LOCATION_CONTRACT_BY_ID = freeze(Object.fromEntries(
  FUNCTIONAL_LOCATION_CONTRACTS.map((contract) => [contract.locationId, contract]),
));

const emptyEvidence = () => Object.fromEntries(RELOCATION_PARITY_FIELDS.map((field) => [field, false]));

export class RelocationParityHarness {
  constructor(contracts = FUNCTIONAL_LOCATION_CONTRACTS) {
    this.contracts = freeze([...contracts]);
    this.evidence = new Map(contracts.map((contract) => [contract.locationId, emptyEvidence()]));
  }

  contract(locationId) {
    return this.contracts.find((entry) => entry.locationId === locationId) || null;
  }

  record(locationId, evidence = {}) {
    if (!this.contract(locationId)) throw new Error(`Unknown functional location: ${locationId}`);
    const current = this.evidence.get(locationId);
    for (const [field, value] of Object.entries(evidence)) {
      if (!RELOCATION_PARITY_FIELDS.includes(field)) throw new Error(`Unknown relocation evidence: ${field}`);
      current[field] = value === true;
    }
    return this.report(locationId);
  }

  report(locationId) {
    const contract = this.contract(locationId);
    if (!contract) return null;
    const evidence = { ...this.evidence.get(locationId) };
    const missing = RELOCATION_PARITY_FIELDS.filter((field) => !evidence[field]);
    return freeze({ contract, evidence: freeze(evidence), missing: freeze(missing), readyForCutover: missing.length === 0 });
  }

  assertReady(locationId) {
    const report = this.report(locationId);
    if (!report) throw new Error(`Unknown functional location: ${locationId}`);
    if (!report.readyForCutover) throw new Error(`${locationId} relocation blocked: ${report.missing.join(', ')}`);
    return report;
  }

  migrateLegacyPosition(locationId, position, { radius = 24 } = {}) {
    const report = this.assertReady(locationId);
    const { legacy, target } = report.contract;
    const dx = Number(position?.x) - legacy.x;
    const dz = Number(position?.z) - legacy.z;
    if (!Number.isFinite(dx) || !Number.isFinite(dz) || Math.hypot(dx, dz) > radius) return position;
    return freeze({ ...position, x: target.x + dx, z: target.z + dz });
  }

  snapshot() {
    const locations = this.contracts.map((contract) => this.report(contract.locationId));
    return freeze({
      total: locations.length,
      ready: locations.filter((entry) => entry.readyForCutover).length,
      blocked: locations.filter((entry) => !entry.readyForCutover).length,
      locations: freeze(locations),
    });
  }
}

export const functionalLocationRelocation = new RelocationParityHarness();

if (typeof window !== 'undefined') {
  window.__ZW_RELOCATION_PARITY__ = functionalLocationRelocation;
  window.__ZW_RELOCATION_REPORT__ = () => functionalLocationRelocation.snapshot();
}

export default functionalLocationRelocation;
