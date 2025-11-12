// Socket.io event names - no magic strings!

// Socket.io room names
export const SOCKET_ROOMS = {
  ADMIN: 'room:admin',
  ALL_PLAYERS: 'room:all_players',
  GAME: (gameId: string) => `room:game:${gameId}`,
} as const

// Admin events (received from admin client)
export const ADMIN_EVENTS = {
  START_GAME: 'admin:startGame',
  STOP_GAME: 'admin:stopGame',
  PAUSE_TIMER: 'admin:pauseTimer',
  RESUME_TIMER: 'admin:resumeTimer',
  ADD_MINUTE: 'admin:addMinute',
  SUBTRACT_MINUTE: 'admin:subtractMinute',
  JOIN_ADMIN: 'admin:joinAdmin',
} as const

// User events (received from user client)
export const USER_EVENTS = {
  LOGIN: 'user:login',
  MAKE_MOVE: 'user:makeMove',
  REJOIN: 'user:rejoin',
} as const

// Broadcast events (emitted to clients)
export const BROADCAST_EVENTS = {
  TIMER_UPDATE: 'timer:update',
  GAME_STATE_UPDATE: 'game:stateUpdate',
  GAMES_LIST_UPDATE: 'games:listUpdate',
  GAME_MATCHED: 'game:matched',
  GAME_ENDED: 'game:ended',
  USER_LOGIN_RESPONSE: 'user:loginResponse',
} as const

