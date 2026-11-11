import { CONFIG } from './config.js';
import EventBus from './core/EventBus.js';
import { Game } from './core/Game.js';
import { Player } from './player/Player.js';
import { CharacterSelect } from './ui/CharacterSelect.js';
import { HUD } from './ui/HUD.js';
import { LobbyUI } from './ui/LobbyUI.js';
import { MainMenu } from './ui/MainMenu.js';
import { Settings } from './ui/Settings.js';
import { NetworkManager } from './multiplayer/NetworkManager.js';
import { LobbyManager } from './multiplayer/LobbyManager.js';
import { PlayerSync } from './multiplayer/PlayerSync.js';
import { WorldSync } from './multiplayer/WorldSync.js';
import { Debug } from './utils/Debug.js';

async function bootstrap() {
  const loadingScreen = document.getElementById('loading-screen');
  const loadingStatus = document.getElementById('loading-status');
  const mainMenuEl = document.getElementById('main-menu');
  const charSelectEl = document.getElementById('character-select');
  const lobbyEl = document.getElementById('lobby-ui');

  const setStatus = (msg) => {
    if (loadingStatus) loadingStatus.textContent = msg;
  };

  setStatus('Initializing 3D Engine...');
  const game = new Game();
  await game.init();

  // Initialize UI & Multiplayer Subsystems
  setStatus('Setting up interface...');
  const hud = new HUD();
  hud.init();

  const mainMenu = new MainMenu(game);
  mainMenu.init();

  const settings = new Settings();

  const charSelect = new CharacterSelect(game.assetManager);
  charSelect.init();

  const networkManager = new NetworkManager(game);
  game.networkManager = networkManager;

  const lobbyManager = new LobbyManager(networkManager);
  const lobbyUI = new LobbyUI(networkManager, lobbyManager);
  lobbyUI.init();

  const playerSync = new PlayerSync(game, networkManager, game.sceneManager);
  game.playerSync = playerSync;
  const worldSync = new WorldSync(networkManager);

  const debug = new Debug(game);
  // Hook debug into animation loop
  const originalUpdate = game.update.bind(game);
  game.update = (delta) => {
    originalUpdate(delta);
    debug.update();
  };

  // State Transitions & Button Actions
  let selectedMode = 'host';
  let selectedCharacterData = null;

  document.getElementById('btn-create-lobby')?.addEventListener('click', () => {
    selectedMode = 'host';
    mainMenuEl.style.display = 'none';
    charSelectEl.style.display = 'flex';
    EventBus.emit('enterCharacterSelect', { mode: 'host' });
  });

  document.getElementById('btn-join-lobby')?.addEventListener('click', () => {
    selectedMode = 'join';
    mainMenuEl.style.display = 'none';
    charSelectEl.style.display = 'flex';
    EventBus.emit('enterCharacterSelect', { mode: 'join' });
  });

  // When survivor character confirmed
  EventBus.on('characterSelected', async ({ character, mode }) => {
    selectedCharacterData = character;
    setStatus('Preparing lobby...');

    if (mode === 'host') {
      lobbyUI.show();
      const { roomCode } = await networkManager.createRoom();
      lobbyManager.join('Host Player', character.name);
      document.getElementById('btn-start-game').style.display = 'block';
    } else {
      lobbyUI.show();
      document.getElementById('join-form').style.display = 'flex';
      document.getElementById('btn-start-game').style.display = 'none';
    }
  });

  // Client joining via room code
  EventBus.on('lobby:joinRequest', async ({ code }) => {
    try {
      setStatus(`Connecting to ${code}...`);
      await networkManager.joinRoom(code);
      lobbyManager.join('Player', selectedCharacterData?.name || 'Survivor');
      document.getElementById('join-form').style.display = 'none';
    } catch (err) {
      alert('Failed to connect to room. Check code and try again.');
      console.error(err);
    }
  });

  // Game start transition
  const startGameSession = async ({ seed = Date.now() } = {}) => {
    lobbyUI.hide();
    mainMenuEl.style.display = 'none';
    charSelectEl.style.display = 'none';

    // 1. Build procedural maze synchronously from seed
    const mazeData = game.buildMaze(seed);

    // 2. Spawn local player with character model, held lantern, and starting rifle
    const [charModel, lanternModel, rifleModel] = await Promise.all([
      game.assetManager.loadGLB('assets/models/players/character_01.glb'),
      game.assetManager.loadGLB('assets/models/items/Lantern.glb'),
      game.assetManager.loadGLB('assets/models/items/Rifle.glb')
    ]);

    charModel.lanternModel = lanternModel;
    charModel.rifleModel = rifleModel;
    game.player = new Player(game, charModel);

    // Set starting position at maze entrance (slightly offset for multiplayer spawns)
    if (mazeData && mazeData.start) {
      const mySlot = networkManager.isHost ? 0 : 1;
      const offsets = [[0, 0], [1.2, 0], [0, 1.2], [1.2, 1.2]];
      const off = offsets[mySlot % 4];
      game.player.body.position.set(
        mazeData.start.x + off[0],
        CONFIG.PLAYER.HEIGHT,
        mazeData.start.z + off[1]
      );
    }

    // Wire item interactions (Pickups)
    EventBus.on('interact', ({ object }) => {
      if (object?.userData) {
        const { id, type } = object.userData;
        if (type === 'ammo') {
          game.player.weapon.addAmmo(6);
          game.roomManager.removePickup(id);
          const prompt = document.getElementById('interaction-prompt');
          if (prompt) {
            prompt.textContent = '+6 RIFLE AMMO';
            setTimeout(() => { if (prompt.textContent === '+6 RIFLE AMMO') prompt.style.display = 'none'; }, 1500);
          }
        } else if (type === 'battery') {
          game.player.flashlight.battery = Math.min(
            CONFIG.VISION.FLASHLIGHT_BATTERY_MAX,
            game.player.flashlight.battery + 45
          );
          game.roomManager.removePickup(id);
          const prompt = document.getElementById('interaction-prompt');
          if (prompt) {
            prompt.textContent = '+45% BATTERY';
            setTimeout(() => { if (prompt.textContent === '+45% BATTERY') prompt.style.display = 'none'; }, 1500);
          }
        } else if (type === 'saxophone') {
          game.roomManager.removePickup(id);
          const prompt = document.getElementById('interaction-prompt');
          if (prompt) {
            prompt.textContent = 'YOU FOUND THE SAXOPHONE';
            setTimeout(() => { if (prompt.textContent === 'YOU FOUND THE SAXOPHONE') prompt.style.display = 'none'; }, 2000);
          }
        }
      }
    });

    // Request pointer lock for first-person controls
    game.inputManager.requestPointerLock();
    game.setState('playing');
  };

  EventBus.on('lobby:gameStart', ({ seed }) => {
    startGameSession({ seed });
  });

  // Ready!
  setStatus('Ready.');
  await new Promise(r => setTimeout(r, 400));
  loadingScreen.style.display = 'none';
  mainMenuEl.style.display = 'flex';
  game.setState('menu');
}

window.addEventListener('DOMContentLoaded', bootstrap);
