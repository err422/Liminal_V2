import * as THREE from 'three';
import { CONFIG } from '../config.js';
import EventBus from '../core/EventBus.js';
import { Creature } from './Creature.js';
import { MSG } from '../multiplayer/MessageTypes.js';

export class CreatureManager {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.creatures = new Map(); // id -> Creature
    this.spawnTimer = 0;
    this.nextId = 1;
    this._bindEvents();
  }

  _bindEvents() {
    EventBus.on('creature:attack', ({ damage }) => {
      if (this.game.player) {
        this.game.player.healthInsanity.takeDamage(damage);
        this.game.player.healthInsanity.addInsanity(15);
      }
    });

    EventBus.on('peer:message', ({ peerId, msg }) => {
      this._onNetworkMessage(peerId, msg);
    });
  }

  spawnCreature(x, z, id = null) {
    const creatureId = id !== null ? id : this.nextId++;
    const pos = new THREE.Vector3(x, 0, z);
    const creature = new Creature(creatureId, pos, this.scene);
    this.creatures.set(creatureId, creature);

    // Host notifies clients of spawn
    if (this.game.networkManager?.isHost) {
      this.game.networkManager.broadcast(MSG.CREATURE_SPAWN, {
        id: creatureId,
        x, z
      });
    }

    return creature;
  }

  handleHitscan(hitObject) {
    let curr = hitObject;
    let creatureId = null;

    while (curr && curr !== this.scene) {
      if (curr.userData && curr.userData.creatureId !== undefined) {
        creatureId = curr.userData.creatureId;
        break;
      }
      curr = curr.parent;
    }

    if (creatureId !== null && this.creatures.has(creatureId)) {
      const creature = this.creatures.get(creatureId);
      creature.takeDamage(CONFIG.WEAPON.DAMAGE);

      // Replicate hit to peers
      this.game.networkManager?.broadcast(MSG.CREATURE_HIT, {
        id: creatureId,
        damage: CONFIG.WEAPON.DAMAGE
      });
      return true;
    }
    return false;
  }

  _onNetworkMessage(peerId, msg) {
    if (msg.type === MSG.CREATURE_SPAWN) {
      if (!this.creatures.has(msg.payload.id)) {
        this.spawnCreature(msg.payload.x, msg.payload.z, msg.payload.id);
      }
    } else if (msg.type === MSG.CREATURE_STATE) {
      const c = this.creatures.get(msg.payload.id);
      if (c && !c.dead) {
        c.root.position.set(msg.payload.x, 0, msg.payload.z);
        c.root.rotation.y = msg.payload.rot;
      }
    } else if (msg.type === MSG.CREATURE_HIT) {
      const c = this.creatures.get(msg.payload.id);
      if (c) c.takeDamage(msg.payload.damage);
    }
  }

  update(delta) {
    const isHost = !this.game.networkManager || this.game.networkManager.isHost;
    const playerPos = this.game.player?.body?.position;
    const boxes = this.game.roomManager ? this.game.roomManager.getCollisionBoxes() : [];

    // Host controls AI spawning & movement
    if (isHost && playerPos) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= CONFIG.CREATURES.SPAWN_INTERVAL && this.creatures.size < CONFIG.CREATURES.MAX_COUNT) {
        this.spawnTimer = 0;
        this._trySpawnAtDistance(playerPos);
      }

      // Update AI
      for (const [id, c] of this.creatures) {
        c.update(delta, playerPos, boxes);

        // Sync position to clients
        if (this.game.networkManager && !c.dead) {
          this.game.networkManager.broadcast(MSG.CREATURE_STATE, {
            id,
            x: +c.root.position.x.toFixed(2),
            z: +c.root.position.z.toFixed(2),
            rot: +c.root.rotation.y.toFixed(3)
          });
        }
      }
    } else {
      // Non-host only animates local visual updates
      for (const [, c] of this.creatures) {
        if (!c.dead && playerPos) {
          const angle = Math.atan2(playerPos.x - c.root.position.x, playerPos.z - c.root.position.z);
          c.root.rotation.y = angle + Math.PI;
        }
      }
    }
  }

  _trySpawnAtDistance(playerPos) {
    const mazeData = this.game.roomManager?.mazeData;
    if (!mazeData) return;

    // Pick a distant room or cell
    const W = mazeData.W;
    const H = mazeData.H;
    const C = mazeData.C;

    for (let attempts = 0; attempts < 15; attempts++) {
      const rx = (Math.floor(Math.random() * W) + 0.5) * C;
      const rz = (Math.floor(Math.random() * H) + 0.5) * C;
      const dist = Math.hypot(rx - playerPos.x, rz - playerPos.z);

      // Must be at least 15m away so they don't materialize right in front of player
      if (dist > 15 && dist < 45) {
        this.spawnCreature(rx, rz);
        break;
      }
    }
  }

  getHitscanTargets() {
    const list = [];
    for (const [, c] of this.creatures) {
      if (!c.dead) list.push(c.root);
    }
    return list;
  }

  clear() {
    for (const [, c] of this.creatures) c.dispose();
    this.creatures.clear();
  }
}
