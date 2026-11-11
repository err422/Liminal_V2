import * as THREE from 'three';
import { CONFIG } from '../config.js';
import EventBus from '../core/EventBus.js';

export class Flashlight {
  constructor(camera) {
    this.camera  = camera;
    this.battery = CONFIG.VISION.FLASHLIGHT_BATTERY_MAX;
    this.isOn    = false;

    this.light = new THREE.SpotLight(0xfff5e0, 0, 25, Math.PI / 10, 0.25, 1.5);
    this.light.castShadow = false;

    // Target sits 1 unit in front of camera (local space)
    this.light.target.position.set(0, 0, -1);
    camera.add(this.light);
    camera.add(this.light.target);

    this._batteryFill = document.getElementById('battery-fill');
  }

  toggle() {
    if (this.battery <= 0 && !this.isOn) return;
    this.isOn = !this.isOn;
    this.light.intensity = this.isOn ? 4 : 0;
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
