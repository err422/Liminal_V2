import * as THREE from 'three';
import { CONFIG } from '../config.js';
import EventBus from '../core/EventBus.js';

export class Creature {
  constructor(id, position, scene) {
    this.id = id;
    this.scene = scene;
    this.hp = 100;
    this.dead = false;
    this.state = 'stalk'; // 'stalk', 'hunt', 'flee', 'dead'

    this.root = new THREE.Group();
    this.root.name = `Creature_${id}`;
    this.root.position.copy(position);

    this.buildMesh();
    this.scene.add(this.root);

    this.target = null;
    this.speed = CONFIG.CREATURES.STALKER_SPEED;
    this.attackCooldown = 0;
  }

  buildMesh() {
    // Slender, uncanny silhouette
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x111113,
      roughness: 0.95,
      metalness: 0.1
    });

    // Torso / spine
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 1.3, 6, 12),
      bodyMat
    );
    torso.position.y = 1.1;
    torso.castShadow = true;
    this.root.add(torso);

    // Head
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x222225,
      roughness: 0.8
    });
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 10),
      headMat
    );
    head.position.y = 1.95;
    head.scale.set(0.9, 1.25, 0.9);
    this.root.add(head);

    // Glowing glowing eyes that reflect faintly in the dark
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
    eyeL.position.set(0.08, 1.98, -0.2);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
    eyeR.position.set(-0.08, 1.98, -0.2);
    this.root.add(eyeL, eyeR);

    // Subtle red aura light
    this.eyeGlow = new THREE.PointLight(0xcc1111, 0.8, 4, 2);
    this.eyeGlow.position.set(0, 1.95, -0.25);
    this.root.add(this.eyeGlow);

    // Mark children with creatureId for hitscan raycasting
    this.root.traverse(node => {
      if (node.isMesh) {
        node.userData.creatureId = this.id;
        node.userData.isCreature = true;
      }
    });
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;

    // Flash white on hit
    this.root.traverse(node => {
      if (node.isMesh && node.material && node.material.color) {
        node.material.color.setHex(0xaa2222);
        setTimeout(() => {
          if (!this.dead) node.material.color.setHex(0x111113);
        }, 120);
      }
    });

    if (this.hp <= 0) {
      this.die();
    } else {
      // Enrage into aggressive hunt
      this.state = 'hunt';
      this.speed = CONFIG.CREATURES.HUNT_SPEED;
    }
  }

  die() {
    this.dead = true;
    this.state = 'dead';
    this.eyeGlow.intensity = 0;

    // Collapse to floor
    this.root.rotation.x = Math.PI / 2;
    this.root.position.y = 0.2;

    EventBus.emit('creature:died', { id: this.id });
  }

  update(delta, playerPos, collisionBoxes = []) {
    if (this.dead) return;
    if (this.attackCooldown > 0) this.attackCooldown -= delta;

    if (!playerPos) return;

    const dist = this.root.position.distanceTo(playerPos);

    // State machine
    if (dist < 12) {
      this.state = 'hunt';
      this.speed = CONFIG.CREATURES.HUNT_SPEED;
    } else {
      this.state = 'stalk';
      this.speed = CONFIG.CREATURES.STALKER_SPEED;
    }

    // Look at player
    const angle = Math.atan2(playerPos.x - this.root.position.x, playerPos.z - this.root.position.z);
    this.root.rotation.y = angle + Math.PI;

    // Move toward player
    if (dist > 1.2) {
      const dx = Math.sin(angle) * this.speed * delta;
      const dz = Math.cos(angle) * this.speed * delta;

      this.root.position.x += dx;
      this.root.position.z += dz;
      this.resolveCollision(collisionBoxes);
    } else if (this.attackCooldown <= 0) {
      // Attack player
      this.attackCooldown = 1.2;
      EventBus.emit('creature:attack', {
        id: this.id,
        damage: CONFIG.CREATURES.ATTACK_DAMAGE
      });
    }
  }

  resolveCollision(boxes) {
    if (!boxes || !boxes.length) return;
    const pos = this.root.position;
    const R = 0.4;

    for (const b of boxes) {
      if (
        pos.x < b.minX - R - 0.2 || pos.x > b.maxX + R + 0.2 ||
        pos.z < b.minZ - R - 0.2 || pos.z > b.maxZ + R + 0.2
      ) continue;

      const px = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const pz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      const dx = pos.x - px;
      const dz = pos.z - pz;
      const d2 = dx * dx + dz * dz;

      if (d2 < R * R && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = (R - d) / d;
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }
  }

  dispose() {
    this.scene.remove(this.root);
  }
}
