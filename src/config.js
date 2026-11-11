export const CONFIG = Object.freeze({
  VERSION:   '0.1.0',
  GAME_NAME: 'LIMINAL',
  DEBUG:     true,

  PEER: {
    HOST:   '0.peerjs.com',
    KEY:    'peerjs',
    PORT:   443,
    SECURE: true,
    CONFIG: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
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
