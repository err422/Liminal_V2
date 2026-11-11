import * as THREE from 'three';
import { CONFIG } from '../config.js';
import EventBus from './EventBus.js';
import { SceneManager } from './SceneManager.js';
import { AssetManager } from './AssetManager.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { RoomManager } from '../world/RoomManager.js';
import { CreatureManager } from '../creatures/CreatureManager.js';

export class Game {
  constructor() {
    this.scene          = new THREE.Scene();
    this.camera         = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    this.renderer       = null;
    this.clock          = new THREE.Clock();
    this.state          = 'loading';
    this.player         = null;
    this.networkManager = null;
    this.playerSync     = null;
    this._animFrameId   = null;

    this.sceneManager     = new SceneManager();
    this.assetManager     = new AssetManager();
    this.inputManager     = new InputManager();
    this.audioManager     = new AudioManager();
    this.roomManager      = null;
    this.creatureManager  = null;
  }

  async init() {
    this._setupRenderer();
    this._setupScene();
    this.inputManager.init();
    this.audioManager.init();
    this.sceneManager.init(this);
    this.roomManager = new RoomManager(this);
    this.creatureManager = new CreatureManager(this);
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
    this.scene.background = new THREE.Color(0x060606);
    this.scene.fog = new THREE.FogExp2(0x060606, 0.05);

    const ambient = new THREE.AmbientLight(0x0e0e0e, 0.8);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x222233, 0x080808, 0.35);
    this.scene.add(hemi);
  }

  buildMaze(seed) {
    return this.roomManager.build(seed);
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
    if (this.roomManager) this.roomManager.update(delta);
    if (this.creatureManager) this.creatureManager.update(delta);
    this.sceneManager.update(delta);
    if (this.player) this.player.update(delta);
    if (this.networkManager) this.networkManager.update(delta);
    if (this.playerSync) this.playerSync.update(delta);
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
