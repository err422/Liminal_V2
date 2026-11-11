import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { KEYS } from '../core/InputManager.js';

export class PlayerController {
  constructor(player) {
    this.player    = player;
    this.velocity  = new THREE.Vector3();
    this.onGround  = true;
    this.stamina   = CONFIG.PLAYER.STAMINA_MAX;
    this._dir      = new THREE.Vector3();
    this._axis     = new THREE.Vector3(0, 1, 0);
  }

  update(delta, input) {
    const isSprinting = input.isKeyDown(KEYS.SPRINT) && this.stamina > 0;
    const speed = isSprinting ? CONFIG.PLAYER.SPRINT_SPEED : CONFIG.PLAYER.WALK_SPEED;

    const moveX = (input.isKeyDown(KEYS.RIGHT) ? 1 : 0) - (input.isKeyDown(KEYS.LEFT)    ? 1 : 0);
    const moveZ = (input.isKeyDown(KEYS.BACK)  ? 1 : 0) - (input.isKeyDown(KEYS.FORWARD) ? 1 : 0);
    const isMoving = moveX !== 0 || moveZ !== 0;

    if (isMoving) {
      this._dir.set(moveX, 0, moveZ).normalize();
      this._dir.applyAxisAngle(this._axis, this.player.cameraController.yaw);
      this.velocity.x = this._dir.x * speed;
      this.velocity.z = this._dir.z * speed;
    } else {
      this.velocity.x *= 0.82;
      this.velocity.z *= 0.82;
    }

    // Stamina
    if (isSprinting && isMoving) {
      this.stamina = Math.max(0, this.stamina - 20 * delta);
    } else {
      this.stamina = Math.min(CONFIG.PLAYER.STAMINA_MAX, this.stamina + 10 * delta);
    }

    // Gravity
    if (!this.onGround) {
      this.velocity.y -= 20 * delta;
    }

    // Jump
    if (input.isKeyDown(KEYS.JUMP) && this.onGround) {
      this.velocity.y  = CONFIG.PLAYER.JUMP_FORCE;
      this.onGround    = false;
    }

    // Apply movement (direct THREE position — Rapier slot left open)
    if (this.player.rigidBody) {
      this.player.rigidBody.setLinvel(
        { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z }, true
      );
    } else {
      const pos = this.player.body.position;
      pos.x += this.velocity.x * delta;
      pos.y += this.velocity.y * delta;
      pos.z += this.velocity.z * delta;

      // Simple floor
      if (pos.y < CONFIG.PLAYER.HEIGHT) {
        pos.y         = CONFIG.PLAYER.HEIGHT;
        this.velocity.y = 0;
        this.onGround   = true;
      }
    }

    return isMoving;
  }
}
