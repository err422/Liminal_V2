import EventBus from '../core/EventBus.js';

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
      if (this.net.isHost) {
        this.lobby.startGame();
      }
    });

    this._leaveBtn?.addEventListener('click', () => {
      this.net.disconnect();
      this.hide();
      const mm = document.getElementById('main-menu');
      if (mm) mm.style.display = 'flex';
    });

    this._joinBtn?.addEventListener('click', () => {
      const code = this._joinInput?.value.trim().toUpperCase();
      if (code) {
        EventBus.emit('lobby:joinRequest', { code });
      }
    });

    // Enter key support on join input
    this._joinInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const code = this._joinInput.value.trim().toUpperCase();
        if (code) EventBus.emit('lobby:joinRequest', { code });
      }
    });

    EventBus.on('network:ready', ({ roomCode, isHost }) => {
      if (this._codeEl) {
        this._codeEl.textContent = isHost
          ? `Room Code: ${roomCode}`
          : `Joined Room: ${roomCode}`;
      }
      if (this._startBtn) {
        this._startBtn.style.display = isHost ? 'block' : 'none';
      }
      if (this._joinForm) {
        this._joinForm.style.display = 'none';
      }
    });

    EventBus.on('network:hostLost', () => {
      alert('The host has disconnected. Returning to main menu.');
      this.hide();
      const mm = document.getElementById('main-menu');
      if (mm) mm.style.display = 'flex';
    });
  }

  show() {
    if (this._screen) this._screen.style.display = 'flex';
  }

  hide() {
    if (this._screen) this._screen.style.display = 'none';
  }
}
