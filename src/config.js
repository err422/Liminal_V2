export const CONFIG = Object.freeze({
  VERSION:   '0.1.0',
  GAME_NAME: 'LIMINAL',
  DEBUG:     true,

  PEER: {
    PREFIX: 'liminal-v1-',
    CONFIG: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
  },

  MAZE: {
    WIDTH:  16,
    HEIGHT: 16,
    CELL_SIZE: 4,
    WALL_HEIGHT: 3.2,
    WALL_THICKNESS: 0.3,
    LOOP_FACTOR: 0.22, // 22% loops for open corridors & multiple paths
    ROOM_COUNT: 4,     // larger connected chambers/clearing rooms
  },

  WEAPON: {
    STARTING_AMMO: 6,
    MAX_AMMO: 18,
    DAMAGE: 45,
    RANGE: 40,
    COOLDOWN: 0.9,
  },

  CREATURES: {
    STALKER_SPEED: 2.8,
    HUNT_SPEED: 4.8,
    ATTACK_RANGE: 1.5,
    ATTACK_DAMAGE: 28,
    SPAWN_INTERVAL: 18,
    MAX_COUNT: 3
  },

  MAX_PLAYERS: 4,
  TICK_RATE:   20,

  ASSETS: {
    PLAYER_MODELS: [
      'assets/models/players/character_01.glb'
    ],
    ITEMS: {
      saxophone: 'assets/models/items/Saxophone.glb',
      rifle:     'assets/models/items/Rifle.glb',
      lantern:   'assets/models/items/Lantern.glb'
    },
    CREATURES: {
      monster: 'assets/models/creatures/Monster.glb'
    }
  },

  VISION: {
    FLASHLIGHT_BATTERY_MAX: 100,
    FLASHLIGHT_DRAIN_RATE:  2,
    DARK_ADAPT_TIME:        30
  },

  PLAYER: {
    WALK_SPEED:   4,
    SPRINT_SPEED: 7,
    JUMP_FORCE:   5,
    HEIGHT:       1.7,
    STAMINA_MAX:  100
  },

  HEALTH: {
    MAX:                   100,
    INSANITY_MAX:          100,
    INSANITY_HEALTH_RATIO: 0.8
  }
});
