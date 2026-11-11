import { CONFIG } from '../config.js';
import EventBus   from '../core/EventBus.js';

export class HUD {
  constructor() {
    this._hud         = document.getElementById('hud');
    this._healthSeg   = document.getElementById('health-segment');
    this._insanitySeg = document.getElementById('insanity-segment');
    this._batteryFill = document.getElementById('battery-fill');
    this._prompt      = document.getElementById('interaction-prompt');
  }

  show() { if (this._hud) this._hud.style.display = 'flex'; }
  hide() { if (this._hud) this._hud.style.display = 'none'; }

  init() {
    EventBus.on('healthUpdate', ({ health, insanity }) => this._updateBar(health, insanity));
    EventBus.on('flashlightToggle', ({ battery }) => this._updateBattery(battery));
    EventBus.on('flashlightDead', () => this._updateBattery(0));
    EventBus.on('stateChange', ({ next }) => {
      if (next === 'playing') this.show();
      else this.hide();
    });
  }

  _updateBar(health, insanity) {
    const healthPct   = (health   / CONFIG.HEALTH.MAX)          * 100;
    const insanityPct = (insanity / CONFIG.HEALTH.INSANITY_MAX) * 100;
    if (this._healthSeg)   this._healthSeg.style.flex   = `${Math.max(0, healthPct)}`;
    if (this._insanitySeg) this._insanitySeg.style.flex = `${Math.max(0, insanityPct)}`;
  }

  _updateBattery(battery) {
    if (this._batteryFill) {
      this._batteryFill.style.width = `${(battery / CONFIG.VISION.FLASHLIGHT_BATTERY_MAX) * 100}%`;
    }
  }

  showPrompt(text) {
    if (this._prompt) { this._prompt.textContent = text; this._prompt.style.display = 'block'; }
  }

  hidePrompt() {
    if (this._prompt) this._prompt.style.display = 'none';
  }
}
