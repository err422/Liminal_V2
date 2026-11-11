import * as THREE from 'three';
import EventBus   from '../core/EventBus.js';
import { MSG }    from './MessageTypes.js';

// Lightweight remote player representation
class RemotePlayer {
  constructor(peerId, modelData) {
    this.peerId = peerId;
    this.root   = new THREE.Object3D();
    this.root.name = `RemotePlayer_${peerId}`;

    // Target transform for interpolation
    this._targetPos = new THREE.Vector3();
    this._targetRot = new THREE.Euler();

    if (modelData?.scene) {
      this.root.add(modelData.scene);
      this._model = modelData.scene;
    }

    // Nametag (simple)
    this._nameLabel = null;
  }

  applySnapshot(snapshot) {
    this._targetPos.set(snapshot.px, snapshot.py, snapshot.pz);
    this._targetRot.set(snapshot.rx, snapshot.ry, snapshot.rz, 'YXZ');
  }

  update(delta) {
    // Smooth interpolation
    this.root.position.lerp(this._targetPos, Math.min(1, delta * 15));
    this.root.rotation.y = THREE.MathUtils.lerp(this.root.rotation.y, this._targetRot.y, Math.min(1, delta * 15));
  }
}

export class PlayerSync {
  constructor(game, networkManager, sceneManager) {
    this.game    = game;
    this.net     = networkManager;
    this.scene   = sceneManager;
    this.remotePlayers = new Map(); // peerId -> RemotePlayer

    EventBus.on('network:tick',    ()                     => this._sendTransform());
    EventBus.on('peer:message',    ({ peerId, msg })      => this._onMessage(peerId, msg));
    EventBus.on('peer:close',      ({ peerId })           => this._removeRemotePlayer(peerId));
  }

  _sendTransform() {
    if (!this.game.player) return;
    const body = this.game.player.body;
    const cam  = this.game.player.cameraController;
    this.net.broadcast(MSG.PLAYER_TRANSFORM, {
      px: body.position.x,
      py: body.position.y,
      pz: body.position.z,
      rx: cam.pitch,
      ry: cam.yaw,
      rz: 0,
    });
  }

  async _onMessage(peerId, msg) {
    if (msg.type !== MSG.PLAYER_TRANSFORM) return;
    let rp = this.remotePlayers.get(peerId);
    if (!rp) {
      // Spawn remote player with player model
      const modelData = await this.game.assetManager.loadGLB('assets/models/players/character_01.glb');
      rp = new RemotePlayer(peerId, modelData);
      this.scene.addRemotePlayer(peerId, rp);
      this.remotePlayers.set(peerId, rp);
    }
    rp.applySnapshot(msg.payload);
  }

  _removeRemotePlayer(peerId) {
    if (this.remotePlayers.has(peerId)) {
      this.scene.removeRemotePlayer(peerId);
      this.remotePlayers.delete(peerId);
    }
  }

  update(delta) {
    for (const [, rp] of this.remotePlayers) {
      rp.update(delta);
    }
  }
}
