import EventBus from '../core/EventBus.js';
import { MSG }  from './MessageTypes.js';

export class WorldSync {
  constructor(networkManager) {
    this.net       = networkManager;
    this._mazeData = null;
    EventBus.on('peer:message',            ({ peerId, msg }) => this._onMessage(peerId, msg));
    EventBus.on('network:playerConnected', ({ peerId })      => this._onNewPlayer(peerId));
  }

  // Host: send maze to a newly connected player
  _onNewPlayer(peerId) {
    if (!this.net.isHost || !this._mazeData) return;
    this.net.sendTo(peerId, MSG.MAZE_DATA, this._mazeData);
  }

  // Host: broadcast maze data to all peers after generation
  broadcastMaze(mazeData) {
    this._mazeData = mazeData;
    this.net.broadcast(MSG.MAZE_DATA, mazeData);
  }

  broadcastItemPickup(itemId, peerId) {
    this.net.broadcast(MSG.ITEM_PICKUP, { itemId, peerId });
  }

  broadcastItemDrop(itemId, position) {
    this.net.broadcast(MSG.ITEM_DROP, { itemId, position });
  }

  broadcastDoorState(doorId, isOpen) {
    this.net.broadcast(MSG.DOOR_STATE, { doorId, isOpen });
  }

  broadcastAnomaly(anomalyData) {
    this.net.broadcast(MSG.ANOMALY_EVENT, anomalyData);
  }

  _onMessage(peerId, msg) {
    switch (msg.type) {
      case MSG.MAZE_DATA:
        EventBus.emit('world:mazeReceived', msg.payload);
        break;
      case MSG.ITEM_PICKUP:
        EventBus.emit('world:itemPickup', msg.payload);
        break;
      case MSG.ITEM_DROP:
        EventBus.emit('world:itemDrop', msg.payload);
        break;
      case MSG.DOOR_STATE:
        EventBus.emit('world:doorState', msg.payload);
        break;
      case MSG.ANOMALY_EVENT:
        EventBus.emit('world:anomaly', msg.payload);
        break;
    }
  }
}
