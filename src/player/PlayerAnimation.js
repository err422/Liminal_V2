import * as THREE from 'three';

export class PlayerAnimation {
  constructor(model, animations) {
    this.mixer   = new THREE.AnimationMixer(model);
    this.actions = {};
    this.current = null;

    for (const clip of animations) {
      this.actions[clip.name] = this.mixer.clipAction(clip);
    }
  }

  play(name, options = {}) {
    const action = this.actions[name];
    if (!action || this.current === action) return;
    if (this.current) this.current.fadeOut(options.fadeDuration ?? 0.2);
    action.reset().fadeIn(options.fadeDuration ?? 0.2).play();
    this.current = action;
  }

  update(delta) {
    this.mixer.update(delta);
  }

  stop() {
    if (this.current) this.current.fadeOut(0.2);
    this.current = null;
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }

  getActionNames() {
    return Object.keys(this.actions);
  }
}
