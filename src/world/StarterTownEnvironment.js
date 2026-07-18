// ─────────────────────────────────────────────────────────────────────────────
// StarterTownEnvironment.js — district-aware lighting, ambience, weather, and
// simulation presentation values. This is a contract, not an audio renderer.
// ─────────────────────────────────────────────────────────────────────────────
import { DISTRICT_PROFILE_BY_ID } from '../config/starterTownDistrictProfiles.js';
import { worldRegistry } from '../runtime/WorldRegistry.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;

function timeState(timeMin = 720) {
  const normalized = ((Number(timeMin) || 0) % 1440 + 1440) % 1440;
  const hour = normalized / 60;
  const daylight = clamp(Math.sin(((hour - 6) / 12) * Math.PI), 0, 1);
  const dusk = clamp(1 - Math.abs(hour - 18.5) / 2.5, 0, 1);
  const night = 1 - daylight;
  return { timeMin: normalized, hour, daylight, dusk, night };
}

function weatherState(weather = 'clear') {
  const id = String(weather || 'clear').toLowerCase();
  if (id === 'rain' || id === 'storm') return { id, wet: 1, cloud: id === 'storm' ? 1 : 0.78, wind: id === 'storm' ? 0.9 : 0.46 };
  if (id === 'overcast') return { id, wet: 0, cloud: 0.82, wind: 0.28 };
  if (id === 'dust') return { id, wet: 0, cloud: 0.32, wind: 0.72 };
  return { id: 'clear', wet: 0, cloud: 0.08, wind: 0.18 };
}

function profileFor(districtId) {
  return DISTRICT_PROFILE_BY_ID[districtId] || DISTRICT_PROFILE_BY_ID['dreamdrop-district'];
}

export function starterTownEnvironmentForDistrict(districtId, {
  timeMin = 720,
  weather = 'clear',
  graphicsPreset = 'medium',
} = {}) {
  const profile = profileFor(districtId);
  const time = timeState(timeMin);
  const climate = weatherState(weather);
  const low = graphicsPreset === 'low';
  const high = graphicsPreset === 'high';
  const light = profile.lighting || {};
  const traffic = profile.traffic || {};
  const pedestrians = profile.pedestrians || {};
  const baseFog = districtId === 'northworks-auto-row' ? 0.82
    : districtId === 'civic-heights' ? 1.12
      : districtId === 'parkside-commons' ? 1.06
        : 1;
  const weatherFog = lerp(1, 0.66, climate.cloud * 0.8 + climate.wet * 0.2);

  return Object.freeze({
    districtId,
    time,
    weather: climate,
    palette: profile.palette,
    lighting: Object.freeze({
      ambientIntensity: Number((0.18 + time.daylight * 0.34 + (Number(light.intensity) || 1) * 0.08).toFixed(3)),
      sunIntensity: Number((0.22 + time.daylight * 2.35 * (1 - climate.cloud * 0.48)).toFixed(3)),
      windowEmission: Number((time.night * (Number(light.nightWindows) || 0.5) * (low ? 0.55 : high ? 1 : 0.82)).toFixed(3)),
      neonIntensity: Number((time.night * (Number(light.neon) || 0) * (low ? 0.45 : 1)).toFixed(3)),
      temperature: light.temperature || 'neutral',
      shadowScale: low ? 0 : high ? 1 : 0.72,
    }),
    atmosphere: Object.freeze({
      fogScale: Number((baseFog * weatherFog * (low ? 0.82 : 1)).toFixed(3)),
      wetSurface: climate.wet,
      wind: climate.wind,
      skylineVisibility: Number((clamp(1 - climate.cloud * 0.48, 0.42, 1) * (low ? 0.76 : 1)).toFixed(3)),
      weatherDetails: profile.weatherResponse || [],
    }),
    ambience: Object.freeze({
      loops: profile.ambience || [],
      masterVolume: Number((0.38 + (Number(profile.density) || 0.5) * 0.28).toFixed(3)),
      trafficVolume: Number(((Number(traffic.density) || 0.5) * 0.72).toFixed(3)),
      pedestrianVolume: Number(((Number(pedestrians.density) || 0.5) * 0.54).toFixed(3)),
      parkBias: districtId === 'parkside-commons' || districtId === 'scholars-quarter' ? 1 : 0,
      industrialBias: districtId === 'northworks-auto-row' ? 1 : 0,
    }),
    simulation: Object.freeze({
      trafficDensity: Number(traffic.density) || 0.5,
      trafficSpeedScale: Number(traffic.speedScale) || 1,
      trafficMix: traffic.mix || [],
      pedestrianDensity: Number(pedestrians.density) || 0.5,
      pedestrianMix: pedestrians.mix || [],
      policeCoverage: Number(profile.police?.coverage) || 0.5,
      policeResponseScale: Number(profile.police?.responseScale) || 1,
      cleanliness: Number(profile.cleanliness) || 0.5,
    }),
  });
}

export function starterTownEnvironmentAt(position, options = {}) {
  const district = worldRegistry.districtAt(position);
  return starterTownEnvironmentForDistrict(district?.id || 'dreamdrop-district', options);
}

export function blendStarterTownEnvironments(from, to, amount = 0.5) {
  const t = clamp(Number(amount) || 0, 0, 1);
  return Object.freeze({
    districtId: t < 0.5 ? from.districtId : to.districtId,
    transition: t,
    lighting: Object.freeze({
      ambientIntensity: lerp(from.lighting.ambientIntensity, to.lighting.ambientIntensity, t),
      sunIntensity: lerp(from.lighting.sunIntensity, to.lighting.sunIntensity, t),
      windowEmission: lerp(from.lighting.windowEmission, to.lighting.windowEmission, t),
      neonIntensity: lerp(from.lighting.neonIntensity, to.lighting.neonIntensity, t),
      shadowScale: lerp(from.lighting.shadowScale, to.lighting.shadowScale, t),
      temperature: t < 0.5 ? from.lighting.temperature : to.lighting.temperature,
    }),
    atmosphere: Object.freeze({
      fogScale: lerp(from.atmosphere.fogScale, to.atmosphere.fogScale, t),
      wetSurface: lerp(from.atmosphere.wetSurface, to.atmosphere.wetSurface, t),
      wind: lerp(from.atmosphere.wind, to.atmosphere.wind, t),
      skylineVisibility: lerp(from.atmosphere.skylineVisibility, to.atmosphere.skylineVisibility, t),
    }),
    ambience: t < 0.5 ? from.ambience : to.ambience,
    simulation: t < 0.5 ? from.simulation : to.simulation,
  });
}

export const STARTER_TOWN_ENVIRONMENT_PRESETS = Object.freeze(Object.fromEntries(
  Object.keys(DISTRICT_PROFILE_BY_ID).map((districtId) => [districtId, starterTownEnvironmentForDistrict(districtId)]),
));

if (typeof window !== 'undefined') {
  window.__ZW_STARTER_ENVIRONMENT_AT__ = starterTownEnvironmentAt;
}

export default starterTownEnvironmentAt;
