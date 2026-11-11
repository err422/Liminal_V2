import { CONFIG } from '../config.js';
import EventBus from '../core/EventBus.js';
import { MSG } from './MessageTypes.js';

export class LobbyManager {
  constructor(networkManager) {
    this.net = networkManager;
    this.players = new Map(); // peerId -> { peerId, name, characterName, ready }
    this.seed = 0;
    this._bind();
  }

  _bind() {
    EventBus.on('network:playerConnected', ({ peerId }) => this._onPlayerJoin(peerId));
    EventBus.on('peer:close', ({ peerId }) => this._onPlayerLeave(peerId));
    EventBus.on('peer:message', ({ peerId, msg }) => this._onMessage(peerId, msg));
  }

  join(name, characterName) {
    const me = {
      peerId: this.net.peerId,
      name: name || 'Survivor',
      characterName: characterName || 'Survivor 1',
      ready: true
    };
    this.players.set(this.net.peerId, me);

    if (!this.net.isHost) {
      this.net.sendToHost(MSG.PLAYER_JOIN, me);
    }
    this._updateLobbyUI();
  }

  startGame() {
    if (!this.net.isHost) return;
    this.seed = (Math.random() * 2 ** 31) | 0;
    this.net.broadcast(MSG.GAME_START, {
      seed: this.seed,
      players: [...this.players.values()]
    });
    EventBus.emit('lobby:gameStart', {
      seed: this.seed,
      players: [...this.players.values()]
    });
  }

  _onPlayerJoin(peerId) {
    if (!this.players.has(peerId)) {
      this.players.set(peerId, {
        peerId,
        name: 'Connecting...',
        characterName: 'Survivor',
        ready: false
      });
    }

    if (this.net.isHost) {
      // Send entire current roster to all peers
      this.net.broadcast(MSG.LOBBY_STATE, { players: [...this.players.values()] });
    }
    this._updateLobbyUI();
  }

  _onPlayerLeave(peerId) {
    this.players.delete(peerId);
    if (this.net.isHost) {
      this.net.broadcast(MSG.PLAYER_LEAVE, { peerId });
    }
    this._updateLobbyUI();
    EventBus.emit('lobby:playerLeft', { peerId });
  }

  _onMessage(peerId, msg) {
    switch (msg.type) {
      case MSG.PLAYER_JOIN: {
        const p = { ...msg.payload, peerId };
        this.players.set(peerId, p);
        if (this.net.isHost) {
          this.net.broadcast(MSG.LOBBY_STATE, { players: [...this.players.values()] });
        }
        this._updateLobbyUI();
        break;
      }

      case MSG.LOBBY_STATE: {
        for (const p of msg.payload.players) {
          this.players.set(p.peerId, p);
        }
        this._updateLobbyUI();
        break;
      }

      case MSG.PLAYER_LEAVE: {
        this.players.delete(msg.payload.peerId);
        this._updateLobbyUI();
        break;
      }

      case MSG.GAME_START: {
        this.seed = msg.payload.seed;
        EventBus.emit('lobby:gameStart', {
          seed: msg.payload.seed,
          players: msg.payload.players
        });
        break;
      }
    }
  }

  _updateLobbyUI() {
    const list = document.getElementById('player-list');
    if (!list) return;
    list.innerHTML = '';

    for (const [, p] of this.players) {
      const div = document.createElement('div');
      div.className = 'lobby-player';
      const isMe = p.peerId === this.net.peerId;
      div.textContent = `${p.name} (${p.characterName})${isMe ? ' [YOU]' : ''}`;
      list.appendChild(div);
    }

    const codeEl = document.getElementById('room-code-display');
    if (codeEl && this.net.roomCode) {
      codeEl.textContent = `Room Code: ${this.net.roomCode}`;
    }
  }
}
