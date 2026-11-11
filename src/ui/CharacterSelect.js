import * as THREE from 'three';
import { CONFIG } from '../config.js';
import EventBus   from '../core/EventBus.js';

export class CharacterSelect {
  constructor(assetManager) {
    this.assetManager   = assetManager;
    this.selectedIndex  = 0;
    this.characters     = CONFIG.ASSETS.PLAYER_MODELS.map((path, i) => ({
      id:    i,
      path,
      name:  `Survivor ${i + 1}`,
      desc:  'Standard issue survivor. No special advantages. No special weaknesses.',
    }));
    // Pad to 3 entries if fewer than 3 models are defined
    while (this.characters.length < 3) {
      const i = this.characters.length;
      this.characters.push({
        id:   i,
        path: this.characters[0].path, // reuse first model until more are added
        name: `Survivor ${i + 1}`,
        desc: 'Standard issue survivor.',
      });
    }

    this._previewRenderer = null;
    this._previewScene    = null;
    this._previewCamera   = null;
    this._previewModel    = null;
    this._animFrame       = null;
    this._mixer           = null;
    this._clock           = new THREE.Clock();
    this._mode            = 'host'; // set by enterCharacterSelect event
  }

  init() {
    this._buildCards();
    this._initPreview();
    this._bindEvents();
    this._selectCharacter(0);
  }

  _buildCards() {
    const container = document.getElementById('character-cards');
    if (!container) return;
    container.innerHTML = '';
    for (const char of this.characters) {
      const card = document.createElement('div');
      card.className = 'character-card';
      card.dataset.id = char.id;
      card.innerHTML = `
        <h3 class="char-name">${char.name}</h3>
        <p class="char-desc">${char.desc}</p>
      `;
      card.addEventListener('click', () => this._selectCharacter(char.id));
      container.appendChild(card);
    }
  }

  _initPreview() {
    const canvas = document.getElementById('char-preview-canvas');
    if (!canvas) return;

    this._previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this._previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._previewRenderer.setSize(canvas.clientWidth || 400, canvas.clientHeight || 600);
    this._previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this._previewRenderer.setClearColor(0x000000, 0);

    this._previewScene = new THREE.Scene();

    // Lighting for preview
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this._previewScene.add(ambient);
    const key = new THREE.DirectionalLight(0xfff5e0, 1.5);
    key.position.set(2, 4, 3);
    this._previewScene.add(key);
    const fill = new THREE.DirectionalLight(0x334455, 0.5);
    fill.position.set(-2, 2, -1);
    this._previewScene.add(fill);

    this._previewCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    this._previewCamera.position.set(0, 1.4, 3);
    this._previewCamera.lookAt(0, 1, 0);

    this._startPreviewLoop();
  }

  _startPreviewLoop() {
    const loop = () => {
      this._animFrame = requestAnimationFrame(loop);
      const delta = this._clock.getDelta();
      if (this._previewModel) {
        this._previewModel.rotation.y += delta * 0.6; // slow rotate
      }
      if (this._mixer) this._mixer.update(delta);
      if (this._previewRenderer && this._previewScene && this._previewCamera) {
        this._previewRenderer.render(this._previewScene, this._previewCamera);
      }
    };
    loop();
  }

  async _selectCharacter(id) {
    this.selectedIndex = id;
    // Update card highlight
    document.querySelectorAll('.character-card').forEach(c => {
      c.classList.toggle('selected', parseInt(c.dataset.id) === id);
    });

    // Load model into preview
    const char = this.characters[id];
    const data = await this.assetManager.loadGLB(char.path);
    this._setPreviewModel(data);
  }

  _setPreviewModel(data) {
    // Remove old model
    if (this._previewModel) {
      this._previewScene.remove(this._previewModel);
      this._mixer = null;
    }
    this._previewModel = data.scene;

    // Auto-scale: fit to ~2 units height
    const box = new THREE.Box3().setFromObject(this._previewModel);
    const size = box.getSize(new THREE.Vector3());
    const scale = 2 / Math.max(size.y, 0.1);
    this._previewModel.scale.setScalar(scale);

    // Center at origin
    const center = box.getCenter(new THREE.Vector3());
    this._previewModel.position.sub(center.multiplyScalar(scale));
    this._previewModel.position.y = 0;

    this._previewScene.add(this._previewModel);

    // Animations
    if (data.animations?.length) {
      this._mixer = new THREE.AnimationMixer(this._previewModel);
      const idleClip = data.animations.find(a => /idle/i.test(a.name)) || data.animations[0];
      if (idleClip) this._mixer.clipAction(idleClip).play();
    }
  }

  _bindEvents() {
    EventBus.on('enterCharacterSelect', ({ mode }) => { this._mode = mode; });

    const confirmBtn = document.getElementById('btn-confirm-character');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this._confirm());
    }
  }

  _confirm() {
    const char = this.characters[this.selectedIndex];
    EventBus.emit('characterSelected', {
      character: char,
      mode: this._mode,
    });
    this._hide();
  }

  _hide() {
    const el = document.getElementById('character-select');
    if (el) el.style.display = 'none';
    // Stop preview loop — it resumes when screen opens again
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
  }

  destroy() {
    this._hide();
    this._previewRenderer?.dispose();
  }
}
