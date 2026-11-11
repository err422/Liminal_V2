import * as THREE from 'three';
import { CONFIG } from '../config.js';
import EventBus from '../core/EventBus.js';
import { PlayerController } from './PlayerController.js';
import { PlayerCamera }     from './PlayerCamera.js';
import { PlayerAnimation }  from './PlayerAnimation.js';
import { HealthInsanity }   from './HealthInsanity.js';
import { Flashlight }       from './Flashlight.js';
import { Inventory }        from './Inventory.js';
import { KEYS }             from '../core/InputManager.js';

export class Player {
  constructor(game, modelData) {
    this.game      = game;
    this.id        = null;
    this.name      = 'Player';
    this.rigidBody = null;

    // Body — the Object3D that moves through the world
    this.body = new THREE.Object3D();
    this.body.position.set(0, CONFIG.PLAYER.HEIGHT, 0);
    game.scene.add(this.body);

    // Attach the main camera to the body
    this.camera = game.camera;
    this.camera.position.set(0, 0, 0);
    this.body.add(this.camera);

    // Sub-systems
    this.cameraController = new PlayerCamera(this.camera);
    this.cameraController.setBaseY(0);  // relative to body

    this.controller     = new PlayerController(this);
    this.healthInsanity = new HealthInsanity();
    this.flashlight     = new Flashlight(this.camera);
    this.inventory      = new Inventory();

    // Character model (hidden locally — first-person)
    this.animation = null;
    if (modelData?.scene) {
      this._model = modelData.scene;
      this._model.visible = false;
      this.body.add(this._model);
      if (modelData.animations?.length) {
        this.animation = new PlayerAnimation(this._model, modelData.animations);
      }
    }

    // Interaction
    this._raycaster        = new THREE.Raycaster();
    this._interactPrompt   = document.getElementById('interaction-prompt');
    this._flashlightKeyHeld = false;

    // Wire E key for interact
    game.inputManager.on(KEYS.INTERACT, ({ down }) => { if (down) this.interact(); });
  }

  update(delta) {
    const input = this.game.inputManager;

    // Mouse look
    const { x: dx, y: dy } = input.consumeMouseDelta();
    this.cameraController.applyMouseDelta(dx, dy);

    // Movement
    const isMoving = this.controller.update(delta, input);

    // Rotate body by yaw (camera pitch done inside PlayerCamera)
    this.body.rotation.y = this.cameraController.yaw;

    // Camera bob + pitch
    this.cameraController.update(delta, isMoving);

    // Flashlight toggle on F press (edge trigger)
    const fDown = input.isKeyDown(KEYS.FLASHLIGHT);
    if (fDown && !this._flashlightKeyHeld) {
      this.flashlight.toggle();
      this._flashlightKeyHeld = true;
    } else if (!fDown) {
      this._flashlightKeyHeld = false;
    }
    this.flashlight.update(delta);

    // Health / insanity passive
    this.healthInsanity.update(delta);

    // Animations
    if (this.animation) {
      const animName = isMoving ? (this.animation.actions['Walk'] ? 'Walk' : Object.keys(this.animation.actions)[0]) : 'Idle';
      this.animation.play(animName);
      this.animation.update(delta);
    }

    // Interaction raycast
    this._checkInteraction();
  }

  _checkInteraction() {
    this._raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const interactables = [];
    this.game.scene.traverse(o => {
      if (o.userData?.interactable) interactables.push(o);
    });
    const hits = this._raycaster.intersectObjects(interactables, true);
    if (hits.length && hits[0].distance < 2.5) {
      if (this._interactPrompt) this._interactPrompt.style.display = 'block';
      this._nearInteractable = hits[0].object;
    } else {
      if (this._interactPrompt) this._interactPrompt.style.display = 'none';
      this._nearInteractable = null;
    }
  }

  interact() {
    if (this._nearInteractable) {
      EventBus.emit('interact', { object: this._nearInteractable, player: this });
    }
  }

  dispose() {
    this.game.scene.remove(this.body);
    this.flashlight.dispose();
    if (this.animation) this.animation.dispose();
  }
}
