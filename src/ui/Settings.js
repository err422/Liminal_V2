import { CONFIG } from '../config.js';
import EventBus   from '../core/EventBus.js';

export class Settings {
  constructor() {
    this._screen = document.getElementById('settings'); // may not exist yet, that's fine
    this.values = {
      masterVolume:     0.8,
      sfxVolume:        1.0,
      mouseSensitivity: 0.002,
      shadowQuality:    'medium',
    };
    this._load();
  }

  _load() {
    try {
      const saved = localStorage.getItem('liminal_settings');
      if (saved) Object.assign(this.values, JSON.parse(saved));
    } catch {}
  }

  save() {
    try { localStorage.setItem('liminal_settings', JSON.stringify(this.values)); } catch {}
    EventBus.emit('settingsChanged', this.values);
  }

  set(key, value) {
    this.values[key] = value;
    this.save();
  }

  get(key) { return this.values[key]; }

  show() { if (this._screen) this._screen.style.display = 'flex'; }
  hide() { if (this._screen) this._screen.style.display = 'none'; }
}
