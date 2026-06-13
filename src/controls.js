// ───────────────────────────────────────────────────────────────────────────
//  controls.js — keyboard/mouse input + camera system (3rd / 1st / free)
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

export const CAM = { THIRD: 'third', FIRST: 'first', FREE: 'free' };

export class Controls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;
    this.keys = new Set();
    this.mode = CAM.THIRD;
    this.yaw = Math.PI;     // camera orbit yaw
    this.pitch = 0.25;      // camera orbit pitch
    this.distance = 6;      // third-person distance
    this.pointerLocked = false;
    this.justPressed = new Set();
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.justPressed.add(k);
      this.keys.add(k);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));

    this.dom.addEventListener('click', () => {
      if (!this.pointerLocked) this.dom.requestPointerLock?.();
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.dom;
    });
    document.addEventListener('mousemove', e => {
      if (!this.pointerLocked) return;
      const sens = 0.0024;
      this.yaw -= e.movementX * sens;
      this.pitch -= e.movementY * sens;
      const lim = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    });
    this.dom.addEventListener('wheel', e => {
      this.distance = Math.max(2, Math.min(14, this.distance + Math.sign(e.deltaY) * 0.6));
      e.preventDefault();
    }, { passive: false });
  }

  consumePress(k) {
    if (this.justPressed.has(k)) { this.justPressed.delete(k); return true; }
    return false;
  }
  endFrame() { this.justPressed.clear(); }

  cycleMode() {
    this.mode = this.mode === CAM.THIRD ? CAM.FIRST
      : this.mode === CAM.FIRST ? CAM.FREE : CAM.THIRD;
    return this.mode;
  }

  // movement input vector in camera space (x=strafe, z=forward)
  moveInput() {
    let f = 0, s = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) f += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) f -= 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) s -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) s += 1;
    return { f, s, run: this.keys.has('shift'), jump: this.keys.has(' ') };
  }

  // Update camera each frame given the player position + eye height.
  update(targetPos, eyeHeight, dt) {
    const desired = new THREE.Vector3();
    if (this.mode === CAM.FIRST) {
      desired.copy(targetPos);
      desired.y += eyeHeight - 0.05;
      this.camera.position.lerp(desired, Math.min(1, dt * 25));
      const dir = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch));
      this.camera.lookAt(this.camera.position.clone().add(dir));
    } else {
      const dist = this.mode === CAM.FREE ? this.distance + 2 : this.distance;
      const offset = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch));
      desired.copy(targetPos)
        .add(offset.multiplyScalar(dist));
      desired.y = Math.max(0.6, targetPos.y + eyeHeight * 0.7 + this.pitch * 3 + dist * 0.35);
      this.camera.position.lerp(desired, Math.min(1, dt * 10));
      const look = targetPos.clone(); look.y += eyeHeight * 0.6;
      this.camera.lookAt(look);
    }
  }

  // Yaw the player should face when moving (camera-relative).
  cameraYaw() { return this.yaw; }
}
