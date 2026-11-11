export class AudioManager {
  constructor() {
    this.sounds         = new Map();
    this.ambiences      = new Map();
    this.masterVolume   = 0.8;
    this.sfxVolume      = 1.0;
    this.ambienceVolume = 0.5;
  }

  init() {
    if (typeof Howler !== 'undefined') {
      Howler.volume(this.masterVolume);
    }
  }

  loadSound(id, path, options = {}) {
    if (this.sounds.has(id)) return;
    if (typeof Howl === 'undefined') return;
    const cfg = {
      src:     [path],
      loop:    options.loop    ?? false,
      volume:  options.volume  ?? this.sfxVolume,
      preload: true,
    };
    if (options.spatial) {
      cfg.pannerAttr = { panningModel: 'HRTF', rolloffFactor: 1.5, refDistance: 1 };
    }
    this.sounds.set(id, new Howl(cfg));
  }

  play(id, options = {}) {
    const h = this.sounds.get(id);
    if (!h) return null;
    if (options.x !== undefined) {
      h.pos(options.x, options.y || 0, options.z || 0);
    }
    return h.play();
  }

  stop(id) {
    this.sounds.get(id)?.stop();
  }

  playAmbience(id, path) {
    if (this.ambiences.has(id)) return;
    if (typeof Howl === 'undefined') return;
    const h = new Howl({ src: [path], loop: true, volume: this.ambienceVolume });
    h.play();
    this.ambiences.set(id, h);
  }

  stopAmbience(id) {
    const h = this.ambiences.get(id);
    if (h) { h.stop(); h.unload(); this.ambiences.delete(id); }
  }

  setMasterVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (typeof Howler !== 'undefined') Howler.volume(this.masterVolume);
  }

  fade(id, fromVol, toVol, duration) {
    this.sounds.get(id)?.fade(fromVol, toVol, duration);
  }
}
