import { CONFIG } from '../config.js';
import EventBus   from '../core/EventBus.js';
import { MSG }    from './MessageTypes.js';

export class LobbyManager {
  constructor(networkManager) {
    this.net     = networkManager;
    this.players = new Map(); // peerId -> { peerId, name, character, ready }
    this._bind();
  }

  _bind() {
    EventBus.on('network:playerConnected', ({ peerId }) => this._onPlayerJoin(peerId));
    EventBus.on('peer:close',             ({ peerId }) => this._onPlayerLeave(peerId));
    EventBus.on('peer:message',           ({ peerId, msg }) => this._onMessage(peerId, msg));
  }

  join(name, character) {
    const me = { peerId: this.net.peerId, name, character, ready: false };
    this.players.set(this.net.peerId, me);
    // If we're not host, announce ourselves
    if (!this.net.isHost) {
      this.net.sendToHost(MSG.PLAYER_JOIN, me);
    }
    this._updateLobbyUI();
  }

  setReady(ready) {
    const me = this.players.get(this.net.peerId);
    if (me) me.ready = ready;
    this.net.broadcast(MSG.PLAYER_READY, { peerId: this.net.peerId, ready });
    this._updateLobbyUI();
  }

  startGame() {
    if (!this.net.isHost) return;
    this.net.broadcast(MSG.GAME_START, { seed: Math.floor(Math.random() * 999999) });
    EventBus.emit('lobby:gameStart', { players: [...this.players.values()] });
  }

  _onPlayerJoin(peerId) {
    if (!this.players.has(peerId)) {
      this.players.set(peerId, { peerId, name: 'Unknown', character: null, ready: false });
    }
    // Send current lobby state to the new player
    if (this.net.isHost) {
      this.net.sendTo(peerId, MSG.LOBBY_STATE, { players: [...this.players.values()] });
    }
    this._updateLobbyUI();
  }

  _onPlayerLeave(peerId) {
    this.players.delete(peerId);
    this._updateLobbyUI();
    EventBus.emit('lobby:playerLeft', { peerId });
  }

  _onMessage(peerId, msg) {
    switch (msg.type) {
      case MSG.PLAYER_JOIN:
        this.players.set(peerId, { ...msg.payload, peerId });
        if (this.net.isHost) this.net.broadcast(MSG.LOBBY_STATE, { players: [...this.players.values()] });
        this._updateLobbyUI();
        break;
      case MSG.LOBBY_STATE:
        for (const p of msg.payload.players) this.players.set(p.peerId, p);
        this._updateLobbyUI();
        break;
      case MSG.PLAYER_READY: {
        const p = this.players.get(msg.payload.peerId);
        if (p) p.ready = msg.payload.ready;
        this._updateLobbyUI();
        break;
      }
      case MSG.GAME_START:
        EventBus.emit('lobby:gameStart', { players: [...this.players.values()], seed: msg.payload.seed });
        break;
    }
  }

  _updateLobbyUI() {
    const list = document.getElementById('player-list');
    if (!list) return;
    list.innerHTML = '';
    for (const [, p] of this.players) {
      const div = document.createElement('div');
      div.className = 'lobby-player';
      div.textContent = `${p.name}${p.ready ? ' ✓' : ''}`;
      list.appendChild(div);
    }
    // Show room code
    const codeEl = document.getElementById('room-code-display');
    if (codeEl && this.net.roomCode) codeEl.textContent = `Room: ${this.net.roomCode}`;
  }

  get playerCount() { return this.players.size; }
  get allReady()    { return [...this.players.values()].every(p => p.ready); }
}
