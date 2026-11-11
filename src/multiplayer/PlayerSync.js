import * as THREE from 'three';
import EventBus from '../core/EventBus.js';
import { MSG } from './MessageTypes.js';

const wrapAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return a + d * t;
};

class RemotePlayer {
  constructor(peerId, name, modelData) {
    this.peerId = peerId;
    this.name = name;
    this.root = new THREE.Group();
    this.root.name = `RemotePlayer_${peerId}`;

    this.mixer = null;
    this.actions = {};
    this.currentAnim = 'Idle';

    if (modelData?.scene) {
      this.model = modelData.scene;
      this.model.scale.set(1.5, 1.5, 1.5);
      this.model.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      this.root.add(this.model);

      if (modelData.animations?.length) {
        this.mixer = new THREE.AnimationMixer(this.model);
        for (const clip of modelData.animations) {
          this.actions[clip.name] = this.mixer.clipAction(clip);
        }
        if (this.actions['Idle']) this.actions['Idle'].play();
      }
    }

    // Flashlight representation
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 1.4;
    this.spot = new THREE.SpotLight(0xffeedd, 0, 25, 0.45, 0.5, 2);
    this.spot.position.set(0, 0, -0.1);
    const target = new THREE.Object3D();
    target.position.set(0, 0, -5);
    this.headGroup.add(this.spot, target);
    this.spot.target = target;
    this.root.add(this.headGroup);

    // Floating nametag canvas sprite
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8d8b8';
    ctx.fillText(name || 'Survivor', 128, 42);

    this.label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(cv),
      transparent: true,
      opacity: 0.9
    }));
    this.label.scale.set(1.4, 0.35, 1);
    this.label.position.y = 2.1;
    this.root.add(this.label);

    // Snapshot buffer for 110ms interpolated playback
    this.buffer = [];
    this.flashlightOn = false;
  }

  pushSnapshot(snap) {
    this.buffer.push({
      t: performance.now(),
      px: snap.px,
      py: snap.py,
      pz: snap.pz,
      yaw: snap.yaw,
      pitch: snap.pitch,
      fl: snap.fl
    });
    if (this.buffer.length > 25) this.buffer.shift();
    this.flashlightOn = snap.fl;
  }

  update(delta, camPos) {
    const INTERP_MS = 100;
    const renderTime = performance.now() - INTERP_MS;

    if (this.buffer.length > 0) {
      let i = this.buffer.length - 1;
      while (i > 0 && this.buffer[i - 1].t > renderTime) i--;

      const a = this.buffer[Math.max(0, i - 1)];
      const b = this.buffer[i];
      const k = (b.t > a.t) ? Math.min(1, Math.max(0, (renderTime - a.t) / (b.t - a.t))) : 1;

      const prevX = this.root.position.x;
      const prevZ = this.root.position.z;

      const nextX = a.px + (b.px - a.px) * k;
      const nextZ = a.pz + (b.pz - a.pz) * k;

      this.root.position.set(nextX, 0, nextZ);
      this.root.rotation.y = wrapAngle(a.yaw, b.yaw, k);
      this.headGroup.rotation.x = a.pitch + (b.pitch - a.pitch) * k;

      this.spot.intensity = this.flashlightOn ? 35 : 0;

      // Fade nametag based on camera distance
      if (camPos) {
        const dist = this.root.position.distanceTo(camPos);
        this.label.material.opacity = Math.max(0, 1 - (dist - 4) / 8);
      }

      // Drive skeletal walk/run/idle animations by velocity
      if (this.mixer && this.actions) {
        const speed = Math.hypot(nextX - prevX, nextZ - prevZ) / (delta || 0.016);
        const targetAnim = speed > 2.5
          ? (this.actions['Run'] ? 'Run' : 'Walk')
          : speed > 0.08 ? 'Walk' : 'Idle';

        if (this.currentAnim !== targetAnim && this.actions[targetAnim]) {
          if (this.actions[this.currentAnim]) this.actions[this.currentAnim].fadeOut(0.2);
          this.actions[targetAnim].reset().fadeIn(0.2).play();
          this.currentAnim = targetAnim;
        }
        this.mixer.update(delta);
      }
    }
  }

  dispose() {
    if (this.mixer) this.mixer.stopAllAction();
  }
}

export class PlayerSync {
  constructor(game, networkManager, sceneManager) {
    this.game = game;
    this.net = networkManager;
    this.scene = sceneManager;
    this.remotePlayers = new Map(); // peerId -> RemotePlayer

    EventBus.on('network:tick', () => this._sendTransform());
    EventBus.on('peer:message', ({ peerId, msg }) => this._onMessage(peerId, msg));
    EventBus.on('peer:close', ({ peerId }) => this._removeRemotePlayer(peerId));
  }

  _sendTransform() {
    if (!this.game.player) return;
    const body = this.game.player.body;
    const cam = this.game.player.cameraController;
    const fl = this.game.player.flashlight?.isOn ?? false;

    const transformMsg = {
      px: +body.position.x.toFixed(2),
      py: +body.position.y.toFixed(2),
      pz: +body.position.z.toFixed(2),
      yaw: +cam.yaw.toFixed(3),
      pitch: +cam.pitch.toFixed(3),
      fl
    };

    if (this.net.isHost) {
      // Host broadcasts to all clients
      this.net.broadcast(MSG.PLAYER_TRANSFORM, {
        peerId: this.net.peerId,
        ...transformMsg
      });
    } else {
      // Client sends to host, who will relay
      this.net.sendToHost(MSG.PLAYER_TRANSFORM, {
        peerId: this.net.peerId,
        ...transformMsg
      });
    }
  }

  async _onMessage(peerId, msg) {
    if (msg.type !== MSG.PLAYER_TRANSFORM) return;

    const senderId = msg.payload.peerId || peerId;
    if (senderId === this.net.peerId) return;

    // Host relays movement to other connected clients
    if (this.net.isHost) {
      this.net.broadcast(MSG.PLAYER_TRANSFORM, msg.payload, peerId);
    }

    let rp = this.remotePlayers.get(senderId);
    if (!rp) {
      const modelData = await this.game.assetManager.loadGLB('assets/models/players/character_01.glb');
      rp = new RemotePlayer(senderId, 'Survivor', modelData);
      this.scene.addRemotePlayer(senderId, rp);
      this.remotePlayers.set(senderId, rp);
    }

    rp.pushSnapshot(msg.payload);
  }

  update(delta) {
    const camPos = this.game.camera?.position;
    for (const [, rp] of this.remotePlayers) {
      rp.update(delta, camPos);
    }
  }

  _removeRemotePlayer(peerId) {
    const rp = this.remotePlayers.get(peerId);
    if (rp) {
      rp.dispose();
      this.scene.removeRemotePlayer(peerId);
      this.remotePlayers.delete(peerId);
    }
  }

  clear() {
    for (const [id] of this.remotePlayers) {
      this._removeRemotePlayer(id);
    }
  }
}
