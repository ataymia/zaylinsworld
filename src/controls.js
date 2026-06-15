// ───────────────────────────────────────────────────────────────────────────
//  controls.js — keyboard/mouse input + camera system (3rd / 1st / free)
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

export const CAM = { THIRD: 'third', FIRST: 'first', OVERHEAD: 'overhead', FREE: 'free' };

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
    this.bounds = null;     // optional {min,max} AABB to keep the camera inside (interiors)
    this.mouse = new Set();        // mouse buttons currently held (0=L,1=M,2=R)
    this.justClicked = new Set();  // mouse buttons pressed this frame
    this.shoulder = 0;             // over-the-shoulder camera offset (set by main when armed)
    this._shoulder = 0;            // smoothed shoulder offset
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

    // Pointer lock + mouse-look are intentionally DISABLED. The mouse stays a
    // free cursor for clicking objects, shooting and UI; the view is turned with
    // A/D (or ←/→). This avoids the browser "pointer lock cannot be acquired
    // immediately after exiting" error and stops the mouse fighting the camera
    // while you try to click trash / NPCs.
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.dom;
    });
    this.dom.addEventListener('wheel', e => {
      this.distance = Math.max(2, Math.min(14, this.distance + Math.sign(e.deltaY) * 0.6));
      e.preventDefault();
    }, { passive: false });

    // Mouse buttons drive shooting (left) and aim/zoom (right). Tracked without
    // pointer lock now — the cursor is free, so any click on the canvas counts.
    this.dom.addEventListener('mousedown', e => {
      if (!this.mouse.has(e.button)) this.justClicked.add(e.button);
      this.mouse.add(e.button);
    });
    window.addEventListener('mouseup', e => this.mouse.delete(e.button));
    this.dom.addEventListener('contextmenu', e => e.preventDefault());
  }

  // True while a mouse button is held (0=left, 2=right). Used for auto-fire/aim.
  mouseHeld(b = 0) { return this.mouse.has(b); }
  // True once on the frame a mouse button is first pressed (semi-auto fire).
  consumeClick(b = 0) {
    if (this.justClicked.has(b)) { this.justClicked.delete(b); return true; }
    return false;
  }

  consumePress(k) {
    if (this.justPressed.has(k)) { this.justPressed.delete(k); return true; }
    return false;
  }
  endFrame() { this.justPressed.clear(); this.justClicked.clear(); }
  cycleMode() {
    this.mode = this.mode === CAM.THIRD ? CAM.FIRST
      : this.mode === CAM.FIRST ? CAM.OVERHEAD : CAM.THIRD;
    return this.mode;
  }

  // Reset the orbit to a known-good third-person pose (used when entering an
  // interior so the camera never starts outside the room or facing a wall).
  resetView(yaw = 0, pitch = 0.22, distance = 5) {
    this.yaw = yaw; this.pitch = pitch; this.distance = distance;
  }

  // Constrain a desired camera position to the room AABB (with an inset) so the
  // third-person camera can't slip through interior walls and reveal the void.
  _clampToBounds(p) {
    const b = this.bounds; if (!b) return;
    const inset = 0.45;
    p.x = Math.max(b.min.x + inset, Math.min(b.max.x - inset, p.x));
    p.z = Math.max(b.min.z + inset, Math.min(b.max.z - inset, p.z));
    p.y = Math.max(b.min.y + 0.4, Math.min(b.max.y - 0.3, p.y));
  }

  // Snap the camera to its target pose immediately (no lerp) — avoids a frame of
  // void when teleporting between city and interiors.
  snapTo(targetPos, eyeHeight) {
    this.update(targetPos, eyeHeight, 999);
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
    } else if (this.mode === CAM.OVERHEAD) {
      // tactical top-down: high above the player, looking straight down with a
      // slight backward tilt so you can read the streets around you.
      desired.copy(targetPos);
      desired.y += 26;
      desired.z += Math.cos(this.yaw) * 5;
      desired.x += Math.sin(this.yaw) * 5;
      this._clampToBounds(desired);
      this.camera.position.lerp(desired, Math.min(1, dt * 8));
      const look = targetPos.clone(); look.y += 0.5;
      this.camera.lookAt(look);
    } else {
      const dist = this.mode === CAM.FREE ? this.distance + 2 : this.distance;
      const offset = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch));
      desired.copy(targetPos)
        .add(offset.multiplyScalar(dist));
      desired.y = Math.max(0.6, targetPos.y + eyeHeight * 0.7 + this.pitch * 3 + dist * 0.35);
      // Over-the-shoulder offset when a gun is up: slide the camera + look point
      // to the right so the player body no longer sits under the centre crosshair
      // (which is exactly where shots go). Smoothed so it eases in/out.
      this._shoulder += ((this.shoulder || 0) - this._shoulder) * Math.min(1, dt * 8);
      const look = targetPos.clone(); look.y += eyeHeight * 0.6;
      if (Math.abs(this._shoulder) > 0.001) {
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        desired.addScaledVector(right, this._shoulder);
        look.addScaledVector(right, this._shoulder);
      }
      this._clampToBounds(desired);
      const a = Math.min(1, dt * 10);
      this.camera.position.lerp(desired, a);
      this.camera.lookAt(look);
    }
  }

  // Yaw the player should face when moving (camera-relative).
  cameraYaw() { return this.yaw; }
}
