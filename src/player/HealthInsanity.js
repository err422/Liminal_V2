import { CONFIG } from '../config.js';
import EventBus from '../core/EventBus.js';

export class HealthInsanity {
  constructor() {
    this.health   = CONFIG.HEALTH.MAX;
    this.insanity = 0;
    this._healthEl   = document.getElementById('health-segment');
    this._insanityEl = document.getElementById('insanity-segment');
    this._update();
  }

  get maxHealth() {
    const consumed = (this.insanity / CONFIG.HEALTH.INSANITY_MAX)
      * CONFIG.HEALTH.MAX
      * CONFIG.HEALTH.INSANITY_HEALTH_RATIO;
    return CONFIG.HEALTH.MAX - consumed;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this._update();
    if (this.health <= 0) EventBus.emit('playerDied', {});
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this._update();
  }

  addInsanity(amount) {
    this.insanity = Math.min(CONFIG.HEALTH.INSANITY_MAX, this.insanity + amount);
    if (this.health > this.maxHealth) this.health = this.maxHealth;
    this._update();
  }

  reduceInsanity(amount) {
    this.insanity = Math.max(0, this.insanity - amount);
    this._update();
  }

  _update() {
    const healthPct   = (this.health   / CONFIG.HEALTH.MAX)          * 100;
    const insanityPct = (this.insanity / CONFIG.HEALTH.INSANITY_MAX) * 100;
    if (this._healthEl)   this._healthEl.style.flex   = `${Math.max(0, healthPct)}`;
    if (this._insanityEl) this._insanityEl.style.flex = `${Math.max(0, insanityPct)}`;
    EventBus.emit('healthUpdate', {
      health:    this.health,
      insanity:  this.insanity,
      maxHealth: this.maxHealth
    });
  }

  update(delta) {
    // Very slow passive insanity gain
    this.addInsanity(0.3 * delta);
  }

  reset() {
    this.health   = CONFIG.HEALTH.MAX;
    this.insanity = 0;
    this._update();
  }
}
