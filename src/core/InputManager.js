export const KEYS = {
  FORWARD:    'KeyW',
  BACK:       'KeyS',
  LEFT:       'KeyA',
  RIGHT:      'KeyD',
  JUMP:       'Space',
  SPRINT:     'ShiftLeft',
  INTERACT:   'KeyE',
  FLASHLIGHT: 'KeyF',
  DROP:       'KeyQ'
};

export class InputManager {
  constructor() {
    this.keys           = new Map();
    this.mouseX         = 0;
    this.mouseY         = 0;
    this.isPointerLocked = false;
    this._callbacks     = new Map();

    this._onKeyDown   = this._onKeyDown.bind(this);
    this._onKeyUp     = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPLChange  = this._onPLChange.bind(this);
  }

  init() {
    document.addEventListener('keydown',          this._onKeyDown);
    document.addEventListener('keyup',            this._onKeyUp);
    document.addEventListener('mousemove',        this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPLChange);
    document.addEventListener('pointerlockerror', () => console.warn('[Input] Pointer lock error'));

    // Click on canvas to request pointer lock
    const canvas = document.getElementById('game-canvas');
    canvas?.addEventListener('click', () => {
      if (!this.isPointerLocked) this.requestPointerLock();
    });
  }

  _onKeyDown(e) {
    this.keys.set(e.code, true);
    this._emit(e.code, { down: true });
    // ESC releases pointer lock
    if (e.code === 'Escape') this.exitPointerLock();
  }

  _onKeyUp(e) {
    this.keys.set(e.code, false);
    this._emit(e.code, { down: false });
  }

  _onMouseMove(e) {
    if (!this.isPointerLocked) return;
    this.mouseX += e.movementX || 0;
    this.mouseY += e.movementY || 0;
  }

  _onPLChange() {
    const canvas = document.getElementById('game-canvas');
    this.isPointerLocked = document.pointerLockElement === canvas
                        || document.pointerLockElement === document.body;
    this._emit('pointerLockChange', { locked: this.isPointerLocked });
  }

  requestPointerLock() {
    document.getElementById('game-canvas')?.requestPointerLock();
  }

  exitPointerLock() {
    document.exitPointerLock();
  }

  isKeyDown(key) {
    return this.keys.get(key) === true;
  }

  consumeMouseDelta() {
    const d = { x: this.mouseX, y: this.mouseY };
    this.mouseX = 0;
    this.mouseY = 0;
    return d;
  }

  on(event, cb) {
    if (!this._callbacks.has(event)) this._callbacks.set(event, new Set());
    this._callbacks.get(event).add(cb);
  }

  _emit(event, data) {
    this._callbacks.get(event)?.forEach(cb => cb(data));
  }

  destroy() {
    document.removeEventListener('keydown',           this._onKeyDown);
    document.removeEventListener('keyup',             this._onKeyUp);
    document.removeEventListener('mousemove',         this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPLChange);
  }
}
