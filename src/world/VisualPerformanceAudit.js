// ─────────────────────────────────────────────────────────────────────────────
// VisualPerformanceAudit.js — inspects a built world for costly visual patterns.
// ─────────────────────────────────────────────────────────────────────────────
import { performanceBudget } from '../config/performanceBudgets.js';

function materialList(node) {
  if (!node?.material) return [];
  return Array.isArray(node.material) ? node.material : [node.material];
}

export function auditVisualPerformance(root, {
  preset = 'medium',
  includeInvisible = false,
} = {}) {
  const budget = performanceBudget(preset === 'custom' ? 'medium' : preset);
  const materials = new Set();
  const geometries = new Set();
  const textures = new Set();
  const placeholders = [];
  const unculled = [];
  const shadowCasters = [];
  const nonInstancedRepeated = new Map();
  let objects = 0;
  let meshes = 0;
  let instancedMeshes = 0;
  let instances = 0;
  let estimatedTriangles = 0;

  root?.traverse?.((node) => {
    if (!includeInvisible && node.visible === false) return;
    objects += 1;
    if (!node.isMesh) return;
    meshes += 1;
    geometries.add(node.geometry);
    if (node.isInstancedMesh) {
      instancedMeshes += 1;
      instances += Number(node.count) || 0;
    } else {
      const geometryName = node.geometry?.uuid || node.geometry?.type || 'unknown';
      nonInstancedRepeated.set(geometryName, (nonInstancedRepeated.get(geometryName) || 0) + 1);
    }
    const indexCount = node.geometry?.index?.count;
    const positionCount = node.geometry?.getAttribute?.('position')?.count;
    const triangles = indexCount ? indexCount / 3 : positionCount ? positionCount / 3 : 0;
    estimatedTriangles += triangles * (node.isInstancedMesh ? Math.max(1, Number(node.count) || 1) : 1);
    if (node.userData?.placeholder) placeholders.push(node.name || node.uuid);
    if (node.frustumCulled === false) unculled.push(node.name || node.uuid);
    if (node.castShadow) shadowCasters.push(node.name || node.uuid);
    for (const material of materialList(node)) {
      if (!material) continue;
      materials.add(material);
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']) {
        if (material[key]) textures.add(material[key]);
      }
    }
  });

  const repeatedCandidates = [...nonInstancedRepeated.entries()]
    .filter(([, count]) => count >= 8)
    .map(([geometryId, count]) => ({ geometryId, count }))
    .sort((a, b) => b.count - a.count);

  const warnings = [];
  if (unculled.length > 24) warnings.push(`${unculled.length} visible meshes disable frustum culling`);
  if (shadowCasters.length > 180) warnings.push(`${shadowCasters.length} objects cast shadows`);
  if (repeatedCandidates.length) warnings.push(`${repeatedCandidates.length} repeated geometry groups may need instancing`);
  if (budget.maxTriangles && estimatedTriangles > budget.maxTriangles) warnings.push(`estimated triangles ${Math.round(estimatedTriangles)} exceed ${budget.maxTriangles}`);
  if (budget.maxDrawCalls && meshes - instancedMeshes > budget.maxDrawCalls) warnings.push(`estimated mesh draw count ${meshes - instancedMeshes} exceeds ${budget.maxDrawCalls}`);

  return Object.freeze({
    preset,
    objects,
    meshes,
    instancedMeshes,
    instances,
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size,
    estimatedTriangles: Math.round(estimatedTriangles),
    placeholders: Object.freeze(placeholders),
    unculled: Object.freeze(unculled),
    shadowCasters: Object.freeze(shadowCasters),
    repeatedCandidates: Object.freeze(repeatedCandidates),
    warnings: Object.freeze(warnings),
    ok: warnings.length === 0,
  });
}

export default auditVisualPerformance;
