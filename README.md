# LIMINAL

> *"You know you came here with three friends. So why are there four of you?"*

LIMINAL is a first-person multiplayer psychological survival horror game set inside an anomalous, shifting maze of liminal spaces.

Trapped in an impossible architecture where hallways stretch, doors shift, and rooms duplicate, players must work together, manage their health and deteriorating sanity, and find a way out before being replaced by something imitating them.

## Tech Stack
- **Engine**: Three.js (r165 via ES Modules & importmap)
- **Multiplayer**: WebRTC peer-to-peer data channels via PeerJS
- **Audio**: Howler.js (HRTF 3D Spatial Audio & ambient soundscapes)
- **Architecture**: Vanilla JavaScript (ES modules, no bundler, direct static hosting)
- **Deployment**: Static GitHub Pages compatible

## Project Structure
```text
liminal/
├── index.html
├── style.css
├── README.md
├── src/
│   ├── main.js
│   ├── config.js
│   ├── core/          (Game, SceneManager, AssetManager, InputManager, AudioManager, EventBus)
│   ├── player/        (Player, PlayerController, PlayerCamera, PlayerAnimation, HealthInsanity, Flashlight, Inventory)
│   ├── world/         (MazeGenerator, RoomManager, Room, Environment, AnomalyManager)
│   ├── creatures/     (Creature, CreatureManager, Mimic, AI/)
│   ├── systems/       (VisionSystem, SanitySystem, HallucinationSystem, InteractionSystem, SpawnDirector, ObjectiveSystem)
│   ├── multiplayer/   (NetworkManager, LobbyManager, PeerConnection, PlayerSync, WorldSync, MessageTypes)
│   ├── ui/            (MainMenu, HUD, LobbyUI, Settings, CharacterSelect)
│   └── utils/         (MathUtils, Random, Debug)
└── assets/
    └── models/        (players, creatures, environment, items)
```

## Running the Game
Run a static HTTP server from the project directory (required for WebGL assets and ES modules):

```bash
# Using python:
python3 -m http.server 8000

# Or using npx:
npx serve .
```

Open `http://localhost:8000` in any modern desktop browser.
