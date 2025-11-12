// Redis key patterns - no magic strings!
export const REDIS_KEYS = {
  // User keys
  USER: (userId: string) => `user:${userId}`,
  USER_STATS: (userId: string) => `user_stats:${userId}`,

  // Game keys
  GAME: (gameId: string) => `game:${gameId}`,
  WAITING_QUEUE: 'waiting_queue',

  // Timer state
  TIMER_STATE: 'timer_state',
} as const

// Redis pub/sub channel names
export const REDIS_CHANNELS = {
  GAME_UPDATE: 'channel:game_update',
  TIMER_TICK: 'channel:timer_tick',
  GAMES_LIST: 'channel:games_list',
} as const

