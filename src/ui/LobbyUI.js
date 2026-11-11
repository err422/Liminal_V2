import EventBus from '../core/EventBus.js';
import { MSG }  from '../multiplayer/MessageTypes.js';

export class LobbyUI {
  constructor(networkManager, lobbyManager) {
    this.net   = networkManager;
    this.lobby = lobbyManager;

    this._screen     = document.getElementById('lobby-ui');
    this._codeEl     = document.getElementById('room-code-display');
    this._playerList = document.getElementById('player-list');
    this._startBtn   = document.getElementById('btn-start-game');
    this._leaveBtn   = document.getElementById('btn-leave-lobby');
    this._joinForm   = document.getElementById('join-form');
    this._joinInput  = document.getElementById('room-code-input');
    this._joinBtn    = document.getElementById('btn-join-room');
  }

  init() {
    this._startBtn?.addEventListener('click', () => {
      if (this.net.isHost) this.lobby.startGame();
    });

    this._leaveBtn?.addEventListener('click', () => {
      this.net.disconnect();
      this.hide();
      document.getElementById('main-menu').style.display = 'flex';
    });

    this._joinBtn?.addEventListener('click', () => {
      const code = this._joinInput?.value.trim();
      if (code) EventBus.emit('lobby:joinRequest', { code });
    });

    EventBus.on('network:ready', ({ roomCode, isHost }) => {
      if (this._codeEl) this._codeEl.textContent = isHost
        ? `Room Code: ${roomCode}`
        : 'Connected!';
      if (this._startBtn) this._startBtn.style.display = isHost ? 'block' : 'none';
      if (this._joinForm) this._joinForm.style.display = isHost ? 'none' : 'none';
    });

    EventBus.on('lobby:playerList', ({ players }) => this._renderPlayerList(players));
  }

  _renderPlayerList(players) {
    if (!this._playerList) return;
    this._playerList.innerHTML = '';
    for (const player of players) {
      const li = document.createElement('li');
      li.className = 'player-entry';
      li.textContent = player.name ?? player.id ?? 'Unknown';
      if (player.ready) li.classList.add('ready');
      this._playerList.appendChild(li);
    }
  }

  show() { if (this._screen) this._screen.style.display = 'flex'; }
  hide() { if (this._screen) this._screen.style.display = 'none'; }
}
