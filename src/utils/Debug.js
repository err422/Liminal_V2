import { CONFIG } from '../config.js';

export class Debug {
  constructor(game) {
    this.game    = game;
    this.enabled = CONFIG.DEBUG;
    this._panel  = null;
    this._frames = 0;
    this._last   = performance.now();
    this._fps    = 0;

    if (this.enabled) this._createPanel();
  }

  _createPanel() {
    this._panel = document.createElement('div');
    Object.assign(this._panel.style, {
      position:      'fixed',
      top:           '8px',
      left:          '8px',
      background:    'rgba(0,0,0,0.6)',
      color:         '#0f0',
      fontFamily:    'monospace',
      fontSize:      '11px',
      padding:       '8px',
      zIndex:        '999',
      pointerEvents: 'none',
      whiteSpace:    'pre',
      lineHeight:    '1.5',
    });
    document.body.appendChild(this._panel);
  }

  update() {
    if (!this.enabled || !this._panel) return;
    this._frames++;
    const now = performance.now();
    if (now - this._last >= 500) {
      this._fps    = Math.round(this._frames * 1000 / (now - this._last));
      this._frames = 0;
      this._last   = now;
    }

    const p      = this.game.player?.body?.position;
    const posStr = p ? `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}` : 'N/A';
    const sanity = this.game.player?.healthInsanity;
    const hpStr  = sanity ? `HP:${sanity.health.toFixed(0)} INS:${sanity.insanity.toFixed(0)}` : 'N/A';

    this._panel.textContent = [
      `LIMINAL ${CONFIG.VERSION} [DEBUG]`,
      `FPS: ${this._fps}`,
      `State: ${this.game.state}`,
      `Pos: ${posStr}`,
      `${hpStr}`,
      `Peers: ${this.game.networkManager?.connections?.size ?? 0}`,
    ].join('\n');
  }
}
