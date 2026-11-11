import EventBus from '../core/EventBus.js';

export class MainMenu {
  constructor(game) {
    this.game    = game;
    this._screen = document.getElementById('main-menu');
  }

  init() {
    // Button wiring is done in main.js for bootstrap simplicity.
    // MainMenu handles any additional menu-layer logic here.
    EventBus.on('stateChange', ({ next }) => {
      if (next === 'menu') this.show();
      else this.hide();
    });
  }

  show() { if (this._screen) this._screen.style.display = 'flex'; }
  hide() { if (this._screen) this._screen.style.display = 'none'; }
}
