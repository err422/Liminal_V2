import { CONFIG } from '../config.js';
import EventBus from '../core/EventBus.js';
import { PeerConnection } from './PeerConnection.js';
import { MSG } from './MessageTypes.js';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');

export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.peer = null;
    this.peerId = null;
    this.roomCode = '';
    this.isHost = false;
    this.connections = new Map(); // peerId -> PeerConnection
    this.hostConn = null;
    this._ticker = 0;
    this._tickInterval = 1 / CONFIG.TICK_RATE;
  }

  // ——— Host Flow: creates peer with predictable room code liminal-v1-XXXXX ———
  async createRoom() {
    return new Promise((resolve, reject) => {
      const tryOpen = (attempt) => {
        const code = makeCode();
        const fullPeerId = `${CONFIG.PEER.PREFIX}${code}`;
        const peer = new Peer(fullPeerId, {
          config: CONFIG.PEER.CONFIG
        });

        let ready = false;

        peer.on('open', (id) => {
          ready = true;
          this.peer = peer;
          this.peerId = id;
          this.roomCode = code;
          this.isHost = true;

          peer.on('connection', (conn) => this._handleIncomingConn(conn));
          peer.on('error', (err) => {
            console.error('[NetworkManager] Host peer error:', err);
            EventBus.emit('network:error', err);
          });

          EventBus.emit('network:ready', { peerId: id, roomCode: code, isHost: true });
          resolve({ peerId: id, roomCode: code });
        });

        peer.on('error', (err) => {
          if (ready) return EventBus.emit('network:error', err);
          if (err.type === 'unavailable-id' && attempt < 5) {
            peer.destroy();
            tryOpen(attempt + 1);
          } else {
            reject(err);
          }
        });
      };

      tryOpen(0);
    });
  }

  // ——— Client Flow: connects to liminal-v1-XXXXX ———
  async joinRoom(shortCode) {
    return new Promise((resolve, reject) => {
      const code = shortCode.trim().toUpperCase();
      const targetPeerId = `${CONFIG.PEER.PREFIX}${code}`;
      const peer = new Peer(undefined, {
        config: CONFIG.PEER.CONFIG
      });

      this.peer = peer;
      this.isHost = false;
      this.roomCode = code;
      let connected = false;

      const timeout = setTimeout(() => {
        if (!connected) {
          reject(new Error('Connection timed out. Check room code.'));
        }
      }, 10000);

      peer.on('open', (myId) => {
        this.peerId = myId;
        const conn = peer.connect(targetPeerId, { reliable: true });
        const pc = new PeerConnection(conn, targetPeerId);
        this.hostConn = pc;
        this.connections.set(targetPeerId, pc);

        conn.on('open', () => {
          connected = true;
          clearTimeout(timeout);
          EventBus.emit('network:ready', { peerId: myId, roomCode: code, isHost: false });
          resolve({ peerId: myId, roomCode: code });
        });

        conn.on('close', () => {
          EventBus.emit('network:hostLost');
        });
      });

      peer.on('error', (err) => {
        if (!connected) {
          clearTimeout(timeout);
          reject(err);
        } else {
          EventBus.emit('network:error', err);
        }
      });
    });
  }

  _handleIncomingConn(conn) {
    const pc = new PeerConnection(conn, conn.peer);
    this.connections.set(conn.peer, pc);
    EventBus.emit('network:playerConnected', { peerId: conn.peer });
  }

  // Broadcast to all connected peers
  broadcast(type, payload, exceptPeerId = null) {
    for (const [id, pc] of this.connections) {
      if (id !== exceptPeerId) {
        pc.send(type, payload);
      }
    }
  }

  sendTo(peerId, type, payload) {
    this.connections.get(peerId)?.send(type, payload);
  }

  sendToHost(type, payload) {
    if (this.isHost) return;
    this.hostConn?.send(type, payload);
  }

  update(delta) {
    this._ticker += delta;
    if (this._ticker >= this._tickInterval) {
      this._ticker = 0;
      EventBus.emit('network:tick', { isHost: this.isHost });
    }
  }

  disconnect() {
    for (const [, pc] of this.connections) pc.close();
    this.peer?.destroy();
    this.connections.clear();
    this.hostConn = null;
    this.peerId = null;
    this.roomCode = '';
  }
}
