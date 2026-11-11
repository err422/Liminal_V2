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
    this.radius    = 0.35;
  }

  resolveCollision(boxes) {
    if (!boxes || !boxes.length) return;
    const pos = this.player.body.position;
    const R = this.radius;

    // 2 iterations for smooth sliding around corners
    for (let k = 0; k < 2; k++) {
      for (const b of boxes) {
        if (
          pos.x < b.minX - R - 0.5 || pos.x > b.maxX + R + 0.5 ||
          pos.z < b.minZ - R - 0.5 || pos.z > b.maxZ + R + 0.5
        ) continue;

        const px = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const pz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        const dx = pos.x - px;
        const dz = pos.z - pz;
        const d2 = dx * dx + dz * dz;

        if (d2 < R * R) {
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            const push = (R - d) / d;
            pos.x += dx * push;
            pos.z += dz * push;
          } else {
            pos.x += R;
          }
        }
      }
    }
  }

  update(delta, input, collisionBoxes = null) {
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

    // Direct THREE position movement
    const pos = this.player.body.position;
    pos.x += this.velocity.x * delta;
    pos.y += this.velocity.y * delta;
    pos.z += this.velocity.z * delta;

    // Floor height clamp
    if (pos.y < CONFIG.PLAYER.HEIGHT) {
      pos.y         = CONFIG.PLAYER.HEIGHT;
      this.velocity.y = 0;
      this.onGround   = true;
    }

    // Solve wall collisions against procedural maze boxes
    if (collisionBoxes) {
      this.resolveCollision(collisionBoxes);
    }

    return isMoving;
  }
}
