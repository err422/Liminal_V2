export class SceneManager {
  constructor() {
    this.game           = null;
    this.scene          = null;
    this.activeRooms    = new Map();
    this.activeCreatures = new Map();
    this.activePlayers  = new Map();
  }

  init(game) {
    this.game  = game;
    this.scene = game.scene;
  }

  update(delta) {
    for (const [, creature] of this.activeCreatures) {
      if (creature.update) creature.update(delta);
    }
    for (const [, rp] of this.activePlayers) {
      if (rp.update) rp.update(delta);
    }
  }

  addRoom(room) {
    if (!room?.id || !room?.group) return;
    this.scene.add(room.group);
    this.activeRooms.set(room.id, room);
  }

  removeRoom(roomId) {
    const room = this.activeRooms.get(roomId);
    if (room?.group) this.scene.remove(room.group);
    this.activeRooms.delete(roomId);
  }

  addCreature(creature) {
    if (!creature?.id) return;
    if (creature.mesh) this.scene.add(creature.mesh);
    this.activeCreatures.set(creature.id, creature);
  }

  removeCreature(id) {
    const c = this.activeCreatures.get(id);
    if (c?.mesh) this.scene.remove(c.mesh);
    this.activeCreatures.delete(id);
  }

  addRemotePlayer(peerId, playerObject) {
    if (playerObject.root) this.scene.add(playerObject.root);
    this.activePlayers.set(peerId, playerObject);
  }

  removeRemotePlayer(peerId) {
    const rp = this.activePlayers.get(peerId);
    if (rp?.root) this.scene.remove(rp.root);
    this.activePlayers.delete(peerId);
  }

  clear() {
    for (const [id] of this.activeRooms)    this.removeRoom(id);
    for (const [id] of this.activeCreatures) this.removeCreature(id);
    for (const [id] of this.activePlayers)  this.removeRemotePlayer(id);
  }
}
