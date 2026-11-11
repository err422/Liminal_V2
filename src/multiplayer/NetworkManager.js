import { CONFIG }         from '../config.js';
import EventBus           from '../core/EventBus.js';
import { PeerConnection } from './PeerConnection.js';
import { MSG }            from './MessageTypes.js';

export class NetworkManager {
  constructor(game) {
    this.game        = game;
    this.peer        = null;     // PeerJS Peer instance
    this.peerId      = null;     // our own ID
    this.isHost      = false;
    this.connections = new Map(); // peerId -> PeerConnection
    this.roomCode    = null;
    this._ticker     = 0;
    this._tickInterval = 1 / CONFIG.TICK_RATE;
  }

  // ——— Host flow ———
  async createRoom() {
    return new Promise((resolve, reject) => {
      const peer = new Peer(undefined, {
        host:   CONFIG.PEER.HOST,
        port:   CONFIG.PEER.PORT,
        secure: CONFIG.PEER.SECURE,
        key:    CONFIG.PEER.KEY,
        config: CONFIG.PEER.CONFIG,
      });
      this.peer   = peer;
      this.isHost = true;

      peer.on('open', (id) => {
        this.peerId   = id;
        this.roomCode = id.slice(-6).toUpperCase(); // short code from PeerJS id
        EventBus.emit('network:ready', { peerId: id, roomCode: this.roomCode, isHost: true });
        resolve({ peerId: id, roomCode: this.roomCode });
      });

      peer.on('connection', (conn) => this._handleIncomingConn(conn));
      peer.on('error', reject);
    });
  }

  // ——— Client flow ———
  async joinRoom(roomCode) {
    // roomCode IS the host's peer ID (or the last-6 portion — for now use full ID)
    return new Promise((resolve, reject) => {
      const peer = new Peer(undefined, {
        host:   CONFIG.PEER.HOST,
        port:   CONFIG.PEER.PORT,
        secure: CONFIG.PEER.SECURE,
        key:    CONFIG.PEER.KEY,
        config: CONFIG.PEER.CONFIG,
      });
      this.peer   = peer;
      this.isHost = false;

      peer.on('open', (myId) => {
        this.peerId = myId;
        const conn = peer.connect(roomCode, { reliable: true, serialization: 'raw' });
        const pc   = new PeerConnection(conn, roomCode);
        this.connections.set(roomCode, pc);
        pc.conn.on('open', () => {
          EventBus.emit('network:ready', { peerId: myId, roomCode, isHost: false });
          resolve({ peerId: myId });
        });
      });

      peer.on('error', reject);
    });
  }

  _handleIncomingConn(conn) {
    const pc = new PeerConnection(conn, conn.peer);
    this.connections.set(conn.peer, pc);
    EventBus.emit('network:playerConnected', { peerId: conn.peer });
  }

  // ——— Messaging ———
  broadcast(type, payload) {
    for (const [, pc] of this.connections) pc.send(type, payload);
  }

  sendTo(peerId, type, payload) {
    this.connections.get(peerId)?.send(type, payload);
  }

  sendToHost(type, payload) {
    if (this.isHost) return; // we ARE the host
    const hostConn = [...this.connections.values()][0];
    hostConn?.send(type, payload);
  }

  // ——— Update loop (called by Game.update) ———
  update(delta) {
    this._ticker += delta;
    if (this._ticker >= this._tickInterval) {
      this._ticker = 0;
      this._tick();
    }
  }

  _tick() {
    // Emit event so PlayerSync etc. can send their data
    EventBus.emit('network:tick', { isHost: this.isHost });
  }

  disconnect() {
    for (const [, pc] of this.connections) pc.close();
    this.peer?.destroy();
    this.connections.clear();
  }
}
