import * as THREE from 'three';
import EventBus from '../core/EventBus.js';
import { CONFIG } from '../config.js';

export class Weapon {
  constructor(camera, rifleModel = null) {
    this.camera = camera;
    this.ammo = CONFIG.WEAPON.STARTING_AMMO;
    this.maxAmmo = CONFIG.WEAPON.MAX_AMMO;
    this.cooldown = 0;
    this.recoilT = 0;

    this.group = new THREE.Group();
    this.group.name = 'FirstPersonRifle';
    this.camera.add(this.group);

    // Muzzle flash light
    this.flash = new THREE.PointLight(0xffcc44, 0, 10, 2);
    this.flash.position.set(0.24, -0.15, -1.0);
    this.camera.add(this.flash);

    if (rifleModel) {
      this.attachRifle(rifleModel);
    }

    this._ammoDisplay = document.getElementById('hud-ammo');
    this.updateHUD();
  }

  attachRifle(modelScene) {
    this.rifleMesh = modelScene;
    this.rifleMesh.scale.set(0.55, 0.55, 0.55);
    this.basePos = new THREE.Vector3(0.22, -0.22, -0.48);
    this.baseRot = new THREE.Euler(0, -Math.PI / 2, 0);

    this.rifleMesh.position.copy(this.basePos);
    this.rifleMesh.rotation.copy(this.baseRot);

    this.rifleMesh.traverse(n => {
      if (n.isMesh) n.castShadow = false;
    });
    this.group.add(this.rifleMesh);
  }

  updateHUD() {
    if (this._ammoDisplay) {
      this._ammoDisplay.textContent = `AMMO: ${this.ammo} / ${this.maxAmmo}`;
    }
  }

  addAmmo(amount) {
    this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
    this.updateHUD();
  }

  canShoot() {
    return this.ammo > 0 && this.cooldown <= 0;
  }

  shoot(raycaster, targetObjects = []) {
    if (!this.canShoot()) return null;

    this.ammo--;
    this.cooldown = CONFIG.WEAPON.COOLDOWN;
    this.recoilT = 0.12;
    this.flash.intensity = 8.0;

    this.updateHUD();
    EventBus.emit('weapon:fired', { ammo: this.ammo });

    // Perform hitscan
    raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = raycaster.intersectObjects(targetObjects, true);

    let hitResult = null;
    if (hits.length > 0 && hits[0].distance < CONFIG.WEAPON.RANGE) {
      hitResult = {
        point: hits[0].point,
        object: hits[0].object,
        distance: hits[0].distance
      };
    }

    return hitResult;
  }

  update(delta) {
    if (this.cooldown > 0) this.cooldown -= delta;
    if (this.flash.intensity > 0) {
      this.flash.intensity = Math.max(0, this.flash.intensity - delta * 45);
    }

    // Recoil animation
    if (this.rifleMesh) {
      if (this.recoilT > 0) {
        this.recoilT -= delta;
        this.rifleMesh.position.z = this.basePos.z + 0.08;
        this.rifleMesh.position.y = this.basePos.y + 0.02;
        this.rifleMesh.rotation.x = 0.15;
      } else {
        this.rifleMesh.position.lerp(this.basePos, delta * 15);
        this.rifleMesh.rotation.x = THREE.MathUtils.lerp(this.rifleMesh.rotation.x, 0, delta * 15);
      }
    }
  }

  dispose() {
    this.camera.remove(this.group);
    this.camera.remove(this.flash);
  }
}
