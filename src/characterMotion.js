// ───────────────────────────────────────────────────────────────────────────
// characterMotion.js — procedural locomotion for rigged GLBs without real clips.
//
// The current character library is skinned to Mixamo-style skeletons, but its
// embedded `mixamo.com` tracks are only 0.033-second bind poses. This driver keeps
// the real character mesh and animates common humanoid bones from measured world
// movement. It is intentionally light: one position sample and a handful of bone
// quaternion writes per live-skinned character.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const tempWorld = new THREE.Vector3();
const deltaQuat = new THREE.Quaternion();
const deltaEuler = new THREE.Euler(0, 0, 0, 'XYZ');

const BONE_ALIASES = Object.freeze({
  hips: ['hips'],
  spine: ['spine', 'spine1'],
  spine2: ['spine2', 'upperchest', 'chest'],
  neck: ['neck'],
  head: ['head'],
  leftUpperLeg: ['leftupleg', 'leftthigh'],
  leftLowerLeg: ['leftleg', 'leftcalf'],
  leftFoot: ['leftfoot'],
  rightUpperLeg: ['rightupleg', 'rightthigh'],
  rightLowerLeg: ['rightleg', 'rightcalf'],
  rightFoot: ['rightfoot'],
  leftUpperArm: ['leftarm', 'leftupperarm'],
  leftLowerArm: ['leftforearm', 'leftlowerarm'],
  rightUpperArm: ['rightarm', 'rightupperarm'],
  rightLowerArm: ['rightforearm', 'rightlowerarm'],
});

function firstBone(bones, aliases) {
  for (const name of aliases) {
    if (bones?.[name]) return bones[name];
  }
  return null;
}

function resolveBones(bones) {
  const resolved = {};
  for (const [part, aliases] of Object.entries(BONE_ALIASES)) {
    resolved[part] = firstBone(bones, aliases);
  }
  return resolved;
}

function captureRest(bones) {
  const rest = {};
  for (const [part, bone] of Object.entries(bones)) {
    if (!bone) continue;
    rest[part] = {
      quaternion: bone.quaternion.clone(),
      position: bone.position.clone(),
    };
  }
  return rest;
}

function poseBone(bone, rest, x = 0, y = 0, z = 0) {
  if (!bone || !rest) return;
  deltaEuler.set(x, y, z);
  deltaQuat.setFromEuler(deltaEuler);
  bone.quaternion.copy(rest.quaternion).multiply(deltaQuat);
}

function restorePosition(bone, rest) {
  if (bone && rest) bone.position.copy(rest.position);
}

export function createCharacterMotionDriver(avatar, options = {}) {
  const group = avatar?.group;
  const bones = resolveBones(avatar?.skinBones || {});
  const rest = captureRest(bones);
  const role = options.role || group?.userData?.skinRole || 'civilian';
  const walkThreshold = options.walkThreshold ?? 0.12;
  const runThreshold = options.runThreshold ?? 3.4;
  const smoothing = options.smoothing ?? 9;

  let phase = Math.random() * Math.PI * 2;
  let visualAmount = 0;
  let smoothedSpeed = 0;
  let detachedFrames = 0;
  let initialized = false;
  const lastWorld = new THREE.Vector3();

  const driver = {
    role,
    state: 'idle',
    speed: 0,
    update(dt) {
      // Returning false asks manifest.updateMixers() to unregister this driver.
      if (!group || !group.parent) {
        detachedFrames++;
        return detachedFrames < 2 ? undefined : false;
      }
      detachedFrames = 0;

      const safeDt = Math.max(1 / 240, Math.min(0.1, Number(dt) || 0));
      group.getWorldPosition(tempWorld);
      if (!initialized) {
        lastWorld.copy(tempWorld);
        initialized = true;
      }

      const distance = tempWorld.distanceTo(lastWorld);
      lastWorld.copy(tempWorld);
      const rawSpeed = group.visible === false ? 0 : distance / safeDt;
      smoothedSpeed += (rawSpeed - smoothedSpeed) * Math.min(1, safeDt * smoothing);

      const forced = group.userData.motionState;
      let state = forced || (smoothedSpeed >= runThreshold ? 'run' : smoothedSpeed >= walkThreshold ? 'walk' : 'idle');
      if (group.rotation.x && Math.abs(group.rotation.x) > 0.8) state = 'downed';
      driver.state = state;
      driver.speed = smoothedSpeed;
      avatar.motionState = state;

      if (state === 'downed') {
        visualAmount += (0 - visualAmount) * Math.min(1, safeDt * 12);
        applyIdlePose(phase, visualAmount);
        return undefined;
      }

      const moving = state === 'walk' || state === 'run';
      const targetAmount = moving ? 1 : 0;
      visualAmount += (targetAmount - visualAmount) * Math.min(1, safeDt * 10);

      const strideRate = state === 'run' ? 10.5 : state === 'walk' ? 6.4 : 1.8;
      phase += safeDt * strideRate;

      if (moving || visualAmount > 0.02) applyLocomotionPose(phase, visualAmount, state === 'run');
      else applyIdlePose(phase, 0);
      return undefined;
    },
  };

  function applyIdlePose(time, transitionAmount) {
    const breath = Math.sin(time) * 0.018 * (1 - transitionAmount);
    const sway = Math.cos(time * 0.7) * 0.012 * (1 - transitionAmount);
    poseBone(bones.spine, rest.spine, breath, 0, sway);
    poseBone(bones.spine2, rest.spine2, breath * 0.6, 0, -sway * 0.6);
    poseBone(bones.neck, rest.neck, 0, 0, -sway * 0.3);
    poseBone(bones.head, rest.head, 0, 0, -sway * 0.5);
    poseBone(bones.leftUpperArm, rest.leftUpperArm, 0, 0, 0.025);
    poseBone(bones.rightUpperArm, rest.rightUpperArm, 0, 0, -0.025);
    poseBone(bones.leftLowerArm, rest.leftLowerArm);
    poseBone(bones.rightLowerArm, rest.rightLowerArm);
    poseBone(bones.leftUpperLeg, rest.leftUpperLeg);
    poseBone(bones.rightUpperLeg, rest.rightUpperLeg);
    poseBone(bones.leftLowerLeg, rest.leftLowerLeg);
    poseBone(bones.rightLowerLeg, rest.rightLowerLeg);
    restorePosition(bones.hips, rest.hips);
  }

  function applyLocomotionPose(time, amount, running) {
    const stride = Math.sin(time);
    const opposite = Math.sin(time + Math.PI);
    const strideSize = (running ? 0.72 : 0.46) * amount;
    const armSize = (running ? 0.62 : 0.4) * amount;
    const kneeSize = (running ? 0.82 : 0.55) * amount;
    const bounce = Math.abs(Math.sin(time)) * (running ? 0.035 : 0.018) * amount;
    const sway = Math.cos(time) * (running ? 0.065 : 0.04) * amount;

    poseBone(bones.leftUpperLeg, rest.leftUpperLeg, stride * strideSize);
    poseBone(bones.rightUpperLeg, rest.rightUpperLeg, opposite * strideSize);
    poseBone(bones.leftLowerLeg, rest.leftLowerLeg, Math.max(0, -stride) * kneeSize);
    poseBone(bones.rightLowerLeg, rest.rightLowerLeg, Math.max(0, -opposite) * kneeSize);
    poseBone(bones.leftFoot, rest.leftFoot, Math.max(0, stride) * -0.12 * amount);
    poseBone(bones.rightFoot, rest.rightFoot, Math.max(0, opposite) * -0.12 * amount);

    poseBone(bones.leftUpperArm, rest.leftUpperArm, opposite * armSize, 0, 0.035);
    poseBone(bones.rightUpperArm, rest.rightUpperArm, stride * armSize, 0, -0.035);
    poseBone(bones.leftLowerArm, rest.leftLowerArm, -0.12 - Math.max(0, stride) * 0.18 * amount);
    poseBone(bones.rightLowerArm, rest.rightLowerArm, -0.12 - Math.max(0, opposite) * 0.18 * amount);

    poseBone(bones.spine, rest.spine, running ? 0.08 * amount : 0.025 * amount, 0, sway);
    poseBone(bones.spine2, rest.spine2, running ? -0.035 * amount : 0, 0, -sway * 0.6);
    poseBone(bones.neck, rest.neck, 0, 0, -sway * 0.35);
    poseBone(bones.head, rest.head, 0, 0, -sway * 0.45);

    if (bones.hips && rest.hips) {
      bones.hips.position.copy(rest.hips.position);
      // Bone units vary, so convert the small world-space bob through skin scale.
      const skinScale = Math.max(1e-5, avatar.skin?.scale?.y || 1);
      bones.hips.position.addScaledVector(UP, bounce / skinScale);
    }
  }

  avatar.motionDriver = driver;
  avatar.motionBones = bones;
  return driver;
}

export function setCharacterMotionState(avatar, state = null) {
  if (!avatar?.group) return;
  if (state) avatar.group.userData.motionState = state;
  else delete avatar.group.userData.motionState;
}
