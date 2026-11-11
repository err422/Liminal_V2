import * as THREE from 'three';
import { CONFIG } from '../config.js';
import EventBus from '../core/EventBus.js';

export class Flashlight {
  constructor(camera, lanternModel = null) {
    this.camera  = camera;
    this.battery = CONFIG.VISION.FLASHLIGHT_BATTERY_MAX;
    this.isOn    = false;

    // SpotLight attached directly to the camera facing forward along -Z
    this.light = new THREE.SpotLight(0xffeedd, 0, 35, Math.PI / 7, 0.35, 1.2);
    this.light.position.set(0.2, -0.2, -0.1);
    this.camera.add(this.light);

    // Target placed in front of camera
    this.target = new THREE.Object3D();
    this.target.position.set(0, 0, -5);
    this.camera.add(this.target);
    this.light.target = this.target;

    // PointLight for ambient glow when lantern is on
    this.glow = new THREE.PointLight(0xff9933, 0, 8, 2);
    this.glow.position.set(0.35, -0.3, -0.6);
    this.camera.add(this.glow);

    // Lantern hand-held mesh
    this.lanternMesh = null;
    if (lanternModel) {
      this.attachLantern(lanternModel);
    }

    this._batteryFill = document.getElementById('battery-fill');
  }

  attachLantern(modelScene) {
    this.lanternMesh = modelScene;
    // Scale and position as a first-person held item on the bottom right
    this.lanternMesh.scale.set(0.25, 0.25, 0.25);
    this.lanternMesh.position.set(0.35, -0.38, -0.65);
    this.lanternMesh.rotation.set(0, Math.PI / 8, 0);
    this.camera.add(this.lanternMesh);
  }

  toggle() {
    if (this.battery <= 0 && !this.isOn) return;
    this.isOn = !this.isOn;
    this.light.intensity = this.isOn ? 5.0 : 0;
    this.glow.intensity  = this.isOn ? 2.0 : 0;
    EventBus.emit('flashlightToggle', { isOn: this.isOn, battery: this.battery });
  }

  update(delta) {
    if (this.isOn && this.battery > 0) {
      this.battery = Math.max(0, this.battery - CONFIG.VISION.FLASHLIGHT_DRAIN_RATE * delta);
      if (this.battery <= 0) {
        this.isOn = false;
        this.light.intensity = 0;
        EventBus.emit('flashlightDead', {});
      }
    } else if (!this.isOn) {
      // Recharge slowly when off
      this.battery = Math.min(
        CONFIG.VISION.FLASHLIGHT_BATTERY_MAX,
        this.battery + (CONFIG.VISION.FLASHLIGHT_DRAIN_RATE * 0.25) * delta
      );
    }

    if (this._batteryFill) {
      this._batteryFill.style.width =
        `${(this.battery / CONFIG.VISION.FLASHLIGHT_BATTERY_MAX) * 100}%`;
    }
  }

  dispose() {
    this.camera.remove(this.light);
    this.camera.remove(this.light.target);
    this.light.dispose();
  }
}
