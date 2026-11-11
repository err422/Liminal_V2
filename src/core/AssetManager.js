import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { CONFIG } from '../config.js';

export class AssetManager {
  constructor() {
    this.cache          = new Map();
    this.loader         = new GLTFLoader();
    this._preloadTotal  = 0;
    this._preloadDone   = 0;
  }

  async init() {
    const essential = [...CONFIG.ASSETS.PLAYER_MODELS];
    this._preloadTotal = essential.length;
    await this.preloadList(essential);
  }

  async loadGLB(path) {
    if (this.cache.has(path)) {
      return this._cloneGLTF(this.cache.get(path));
    }
    const gltf = await new Promise((resolve, reject) => {
      this.loader.load(path, resolve, undefined, reject);
    });
    this.cache.set(path, gltf);
    return this._cloneGLTF(gltf);
  }

  _cloneGLTF(gltf) {
    let hasSkinned = false;
    gltf.scene.traverse(n => { if (n.isSkinnedMesh) hasSkinned = true; });
    const clonedScene = hasSkinned
      ? SkeletonUtils.clone(gltf.scene)
      : gltf.scene.clone(true);
    return { scene: clonedScene, animations: gltf.animations || [] };
  }

  async preloadList(paths) {
    const bar = document.getElementById('loading-bar-fill');
    const promises = paths.map(async path => {
      try {
        await this.loadGLB(path);
      } catch (e) {
        console.warn(`[AssetManager] Could not load ${path}:`, e);
      }
      this._preloadDone++;
      if (bar) bar.style.width = `${this.getProgress() * 100}%`;
    });
    await Promise.all(promises);
    if (bar) bar.style.width = '100%';
  }

  getProgress() {
    if (this._preloadTotal === 0) return 1;
    return this._preloadDone / this._preloadTotal;
  }

  isLoaded(path) {
    return this.cache.has(path);
  }
}
