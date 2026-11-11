export const MSG = Object.freeze({
  // Lobby
  LOBBY_STATE:       'lobby_state',
  PLAYER_JOIN:       'player_join',
  PLAYER_LEAVE:      'player_leave',
  PLAYER_READY:      'player_ready',
  GAME_START:        'game_start',

  // World sync
  MAZE_DATA:         'maze_data',
  WORLD_STATE:       'world_state',
  ITEM_PICKUP:       'item_pickup',
  ITEM_DROP:         'item_drop',
  DOOR_STATE:        'door_state',
  ANOMALY_EVENT:     'anomaly_event',

  // Player sync
  PLAYER_TRANSFORM:  'player_transform',
  PLAYER_ANIM:       'player_anim',
  PLAYER_HEALTH:     'player_health',
  PLAYER_ACTION:     'player_action',
  PLAYER_DIED:       'player_died',

  // Creatures
  CREATURE_SPAWN:    'creature_spawn',
  CREATURE_STATE:    'creature_state',
  CREATURE_DESPAWN:  'creature_despawn',

  // Chat / signals
  CHAT:              'chat',
  PING:              'ping',
  PONG:              'pong',
  ERROR:             'error',
});
