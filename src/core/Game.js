import * as THREE from 'three';
import { CONFIG } from '../config.js';
import EventBus from './EventBus.js';
import { SceneManager } from './SceneManager.js';
import { AssetManager } from './AssetManager.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';

export class Game {
  constructor() {
    this.scene         = new THREE.Scene();
    this.camera        = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    this.renderer      = null;
    this.clock         = new THREE.Clock();
    this.state         = 'loading';
    this.player        = null;
    this.networkManager = null;
    this._animFrameId  = null;

    this.sceneManager  = new SceneManager();
    this.assetManager  = new AssetManager();
    this.inputManager  = new InputManager();
    this.audioManager  = new AudioManager();
  }

  async init() {
    this._setupRenderer();
    this._setupScene();
    this.inputManager.init();
    this.audioManager.init();
    this.sceneManager.init(this);
    await this.assetManager.init();
    window.addEventListener('resize', () => this.onWindowResize());
    this.animate();
  }

  _setupRenderer() {
    let canvas = document.getElementById('game-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      document.body.prepend(canvas);
    }
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _setupScene() {
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.06);

    const ambient = new THREE.AmbientLight(0x111111, 0.8);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x222233, 0x110000, 0.4);
    this.scene.add(hemi);

    // Temporary test floor so there's something to see
    const floorGeo  = new THREE.PlaneGeometry(40, 40);
    const floorMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const floor     = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Test corridor walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const makeWall = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      this.scene.add(m);
    };
    makeWall(40, 4, 0.3,  0, 2, -20);  // far wall
    makeWall(40, 4, 0.3,  0, 2,  20);  // near wall
    makeWall(0.3, 4, 40, -20, 2,   0); // left wall
    makeWall(0.3, 4, 40,  20, 2,   0); // right wall

    // A dim point light for atmosphere
    const lamp = new THREE.PointLight(0xfff5c0, 0.8, 15, 2);
    lamp.position.set(0, 3, 0);
    this.scene.add(lamp);
  }

  setState(newState) {
    const prev = this.state;
    this.state = newState;
    EventBus.emit('stateChange', { prev, next: newState });
    if (CONFIG.DEBUG) console.log(`[Game] State: ${prev} → ${newState}`);
  }

  animate() {
    this._animFrameId = requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.update(delta);
    this.render();
  }

  update(delta) {
    this.sceneManager.update(delta);
    if (this.player) this.player.update(delta);
    if (this.networkManager) this.networkManager.update(delta);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
    this.inputManager.destroy();
    this.renderer.dispose();
  }
}
