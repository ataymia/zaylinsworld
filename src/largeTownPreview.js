// ─────────────────────────────────────────────────────────────────────────────
// largeTownPreview.js — isolated Phase 2–6 city-skeleton inspection page.
//
// This page never reads or writes the normal player save. It exists so terrain,
// roads, districts, streaming, assets, and performance can be reviewed before
// functional locations are moved in Phase 7.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { graphics } from './graphics.js';
import { createStarterTownRuntime } from './runtime/StarterTownRuntime.js';
import { runtimeDiagnostics } from './runtime/RuntimeDiagnostics.js';

const loading = document.getElementById('preview-loading');
const bar = document.getElementById('preview-bar');
const status = document.getElementById('preview-status');
const hud = document.getElementById('preview-hud');
const errorBox = document.getElementById('preview-error');

function progress(percent, label) {
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  if (status) status.textContent = label;
}

function fail(error) {
  console.error('[large-town-preview]', error);
  if (errorBox) {
    errorBox.style.display = 'block';
    errorBox.textContent = `Starter Town preview failed\n\n${error?.stack || error?.message || error}`;
  }
  progress(100, 'Preview failed');
}

const renderer = new THREE.WebGLRenderer({ ...graphics.rendererInitOptions(), powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = 'large-town-preview-canvas';
document.body.prepend(renderer.domElement);
graphics.applyToRenderer(renderer);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#9ab5ce');
scene.fog = new THREE.Fog('#9ab5ce', 520, Math.min(1700, graphics.viewDistance * 5.5));

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 4500);
const resetPosition = new THREE.Vector3(0, 270, 760);
camera.position.copy(resetPosition);

const hemi = new THREE.HemisphereLight('#d9edff', '#4c4f42', 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3d7', 2.3);
sun.position.set(520, 760, 340);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -520;
sun.shadow.camera.right = 520;
sun.shadow.camera.top = 520;
sun.shadow.camera.bottom = -520;
sun.shadow.camera.far = 1800;
scene.add(sun, sun.target);
graphics.applyToSun(sun);

const grid = new THREE.GridHelper(2400, 24, '#56687c', '#8797a5');
grid.position.y = 0.025;
grid.material.transparent = true;
grid.material.opacity = 0.22;
scene.add(grid);

const runtime = createStarterTownRuntime({ graphicsPreset: graphics.effectivePreset(), maxJobsPerFrame: 4 });
const query = new URLSearchParams(location.search);
const placeReadyAssets = query.get('assets') === '1';

const keys = new Set();
let yaw = Math.PI;
let pitch = -0.42;
let topView = false;
let districtOverlay = false;
let lastTime = performance.now();
let lastHudAt = 0;
let fpsSamples = [];
let previousPosition = camera.position.clone();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();
const velocity = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function applyCameraLook() {
  forward.set(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ).normalize();
  lookTarget.copy(camera.position).add(forward);
  camera.lookAt(lookTarget);
}
applyCameraLook();

renderer.domElement.addEventListener('click', () => renderer.domElement.requestPointerLock?.());
window.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement || topView) return;
  yaw -= event.movementX * 0.0024;
  pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.002, -1.45, 1.15);
});
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (event.repeat) return;
  if (key === 'g') {
    districtOverlay = !districtOverlay;
    if (runtime.largeTown?.districtLayer) runtime.largeTown.districtLayer.visible = districtOverlay;
  }
  if (key === 't') {
    topView = !topView;
    if (topView) {
      camera.position.set(0, 1550, 0.01);
      pitch = -Math.PI / 2 + 0.001;
      yaw = Math.PI;
    } else {
      camera.position.copy(resetPosition);
      pitch = -0.42;
      yaw = Math.PI;
    }
  }
  if (key === 'r') {
    camera.position.copy(resetPosition);
    pitch = -0.42;
    yaw = Math.PI;
    topView = false;
  }
  if (['1', '2', '3'].includes(key)) {
    const preset = key === '1' ? 'low' : key === '2' ? 'medium' : 'high';
    graphics.setPreset(preset);
    graphics.applyToRenderer(renderer);
    graphics.applyToSun(sun);
    runtime.setGraphicsPreset(preset);
  }
  if (key === 'p') {
    const text = JSON.stringify(runtimeDiagnostics.snapshot(), null, 2);
    navigator.clipboard?.writeText?.(text).catch(() => {});
    console.info('[large-town-preview] runtime report', JSON.parse(text));
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

function updateMovement(dt) {
  if (topView) {
    camera.lookAt(0, 0, 0);
    velocity.set(0, 0, 0);
    return;
  }
  applyCameraLook();
  const planarForward = forward.clone();
  planarForward.y = 0;
  planarForward.normalize();
  right.crossVectors(planarForward, camera.up).normalize();
  move.set(0, 0, 0);
  if (keys.has('w')) move.add(planarForward);
  if (keys.has('s')) move.sub(planarForward);
  if (keys.has('d')) move.add(right);
  if (keys.has('a')) move.sub(right);
  if (keys.has('e')) move.y += 1;
  if (keys.has('q')) move.y -= 1;
  if (move.lengthSq()) move.normalize();
  const speed = keys.has('shift') ? 360 : 105;
  velocity.copy(move).multiplyScalar(speed);
  camera.position.addScaledVector(velocity, dt);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, 4, 1800);
}

function updateHud(timestamp, frameMs) {
  if (timestamp - lastHudAt < 250) return;
  lastHudAt = timestamp;
  fpsSamples.push(frameMs);
  if (fpsSamples.length > 90) fpsSamples.shift();
  const averageMs = fpsSamples.length ? fpsSamples.reduce((sum, value) => sum + value, 0) / fpsSamples.length : 0;
  const fps = averageMs ? 1000 / averageMs : 0;
  const snapshot = runtime.snapshot();
  const district = runtime.worldRegistry.districtAt(camera.position);
  const cell = runtime.cellIndex.idAt(camera.position);
  const visual = snapshot.visualAudit;
  const assets = runtime.largeTown?.placementReport;
  hud.innerHTML = `
    <strong>Starter Town Phase 2–6 Preview</strong><br>
    <span class="muted">This page does not touch the normal game save.</span><br>
    Position: ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}<br>
    District: ${district?.name || district?.id || 'outside'} · Cell: ${cell}<br>
    FPS: ${fps.toFixed(1)} · Preset: ${graphics.effectivePreset()} · Pending stream jobs: ${snapshot.streaming.pending}<br>
    Roads: ${snapshot.roads.routes} routes / ${snapshot.roads.segments} segments · Graph components: ${snapshot.routeGraph.components}<br>
    Asset models placed: ${assets?.placedAssets?.length || 0} · Placeholders: ${assets?.placeholders?.length || 0}<br>
    Visual audit: ${visual?.warnings?.length || 0} warning(s) · Draw estimate: ${visual?.meshes ?? '—'} meshes<br>
    <span class="${placeReadyAssets ? '' : 'warn'}">Asset hydration: ${placeReadyAssets ? 'enabled' : 'off for fast preview; add ?assets=1 to the URL'}</span><br>
    District overlay: ${districtOverlay ? 'on' : 'off'} · Next phase: ${runtimeDiagnostics.snapshot().buildPhases?.next || '—'}
  `;
}

function animate(timestamp) {
  const dt = Math.min(0.05, Math.max(0.001, (timestamp - lastTime) / 1000));
  const frameMs = timestamp - lastTime;
  lastTime = timestamp;
  previousPosition.copy(camera.position);
  updateMovement(dt);
  const observedVelocity = camera.position.clone().sub(previousPosition).multiplyScalar(1 / dt);
  runtime.update({
    position: camera.position,
    velocity: observedVelocity,
    timestamp,
    timeMin: 780,
    weather: query.get('weather') || 'clear',
  });
  renderer.render(scene, camera);
  updateHud(timestamp, frameMs);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

(async () => {
  try {
    progress(14, 'Creating the world registry…');
    await Promise.resolve();
    progress(28, 'Building terrain and graded roads…');
    const installPromise = runtime.install({
      scene,
      renderer,
      playerPosition: camera.position,
      forceBuild: true,
      placeReadyAssets,
      showDistricts: false,
    });
    await installPromise;
    progress(82, 'Indexing streaming cells and diagnostics…');
    runtime.update({ position: camera.position, velocity: { x: 0, z: 0 }, processJobs: true });
    progress(100, 'Starter Town preview ready');
    setTimeout(() => loading?.classList.add('done'), 260);
    setTimeout(() => { if (loading) loading.style.display = 'none'; }, 850);
    requestAnimationFrame(animate);
  } catch (error) {
    fail(error);
  }
})();

window.__ZW_LARGE_TOWN_PREVIEW__ = Object.freeze({
  runtime,
  scene,
  renderer,
  camera,
  report: () => runtimeDiagnostics.snapshot(),
});
