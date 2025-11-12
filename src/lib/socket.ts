import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { redisRepo, Game } from './redis-repository'
import { SOCKET_ROOMS, ADMIN_EVENTS, USER_EVENTS, BROADCAST_EVENTS } from './socket-events'
import { REDIS_CHANNELS } from './redis-keys'
import { checkWinner, isValidMove, getPlayerSymbol, getNextTurn } from './game-logic'
import { v4 as uuidv4 } from 'uuid'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379')

let io: SocketIOServer | null = null
let timerInterval: NodeJS.Timeout | null = null

// Redis pub/sub clients
const redisPub = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
})

const redisSub = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
})

export const initSocketServer = (httpServer: HTTPServer) => {
  if (io) {
    console.log('⚠️  Socket.io server already initialized')
    return io
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  // Setup Redis adapter for Socket.io
  const pubClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
  })

  const subClient = pubClient.duplicate()

  io.adapter(createAdapter(pubClient, subClient))

  // Subscribe to Redis channels for cross-server communication
  setupRedisPubSub()

  // Setup timer tick
  startTimerTick()

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`)

    // Admin events
    socket.on(ADMIN_EVENTS.JOIN_ADMIN, () => handleAdminJoin(socket))
    socket.on(ADMIN_EVENTS.START_GAME, () => handleStartGame(socket))
    socket.on(ADMIN_EVENTS.STOP_GAME, () => handleStopGame(socket))
    socket.on(ADMIN_EVENTS.PAUSE_TIMER, () => handlePauseTimer(socket))
    socket.on(ADMIN_EVENTS.RESUME_TIMER, () => handleResumeTimer(socket))
    socket.on(ADMIN_EVENTS.ADD_MINUTE, () => handleAddMinute(socket))
    socket.on(ADMIN_EVENTS.SUBTRACT_MINUTE, () => handleSubtractMinute(socket))

    // User events
    socket.on(USER_EVENTS.LOGIN, (data) => handleUserLogin(socket, data))
    socket.on(USER_EVENTS.MAKE_MOVE, (data) => handleMakeMove(socket, data))
    socket.on(USER_EVENTS.REJOIN, (data) => handleUserRejoin(socket, data))

    socket.on('disconnect', () => handleDisconnect(socket))
  })

  console.log('✅ Socket.io server initialized with Redis adapter')
  return io
}

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io server not initialized')
  }
  return io
}

// Redis pub/sub handlers
function setupRedisPubSub() {
  // Subscribe to channels
  redisSub.subscribe(
    REDIS_CHANNELS.GAME_UPDATE,
    REDIS_CHANNELS.TIMER_TICK,
    REDIS_CHANNELS.GAMES_LIST,
    (err) => {
      if (err) {
        console.error('Failed to subscribe to Redis channels:', err)
      } else {
        console.log('✅ Subscribed to Redis pub/sub channels')
      }
    }
  )

  // Handle messages
  redisSub.on('message', async (channel, message) => {
    if (!io) return

    const data = JSON.parse(message)

    if (channel === REDIS_CHANNELS.GAME_UPDATE) {
      // Broadcast game state update to players in that game
      io.to(SOCKET_ROOMS.GAME(data.gameId)).emit(BROADCAST_EVENTS.GAME_STATE_UPDATE, data.game)
    } else if (channel === REDIS_CHANNELS.TIMER_TICK) {
      // Broadcast timer update to all players AND admin
      io.to(SOCKET_ROOMS.ALL_PLAYERS).emit(BROADCAST_EVENTS.TIMER_UPDATE, data)
      io.to(SOCKET_ROOMS.ADMIN).emit(BROADCAST_EVENTS.TIMER_UPDATE, data)
    } else if (channel === REDIS_CHANNELS.GAMES_LIST) {
      // Broadcast games list update to admin
      io.to(SOCKET_ROOMS.ADMIN).emit(BROADCAST_EVENTS.GAMES_LIST_UPDATE, data.games)
    }
  })
}

// Timer management
async function startTimerTick() {
  if (timerInterval) {
    clearInterval(timerInterval)
  }

  timerInterval = setInterval(async () => {
    const timerState = await redisRepo.getTimerState()

    if (timerState.isRunning && !timerState.isPaused && timerState.remainingSeconds > 0) {
      timerState.remainingSeconds -= 1
      await redisRepo.setTimerState(timerState)

      // Publish timer update
      redisPub.publish(
        REDIS_CHANNELS.TIMER_TICK,
        JSON.stringify({
          remainingSeconds: timerState.remainingSeconds,
          isRunning: timerState.isRunning,
          isPaused: timerState.isPaused,
        })
      )

      // If timer reaches 0, pause all games
      if (timerState.remainingSeconds === 0) {
        await pauseAllGames()
      }
    }
  }, 1000)
}

async function pauseAllGames() {
  const games = await redisRepo.getAllGames()
  for (const game of games) {
    if (game.status === 'active') {
      game.status = 'paused'
      await redisRepo.setGame(game)

      // Publish game update
      redisPub.publish(
        REDIS_CHANNELS.GAME_UPDATE,
        JSON.stringify({ gameId: game.id, game })
      )
    }
  }
  await broadcastGamesList()
}

async function activateAllGames() {
  const games = await redisRepo.getAllGames()
  for (const game of games) {
    // Activate games that are waiting or paused (not ended)
    if ((game.status === 'paused' || game.status === 'waiting') && game.winner === 'none') {
      game.status = 'active'
      await redisRepo.setGame(game)

      // Publish game update
      redisPub.publish(
        REDIS_CHANNELS.GAME_UPDATE,
        JSON.stringify({ gameId: game.id, game })
      )
    }
  }
  await broadcastGamesList()
}

// Admin event handlers
async function handleAdminJoin(socket: Socket) {
  socket.join(SOCKET_ROOMS.ADMIN)
  console.log(`👑 Admin joined: ${socket.id}`)

  // Send current state
  const timerState = await redisRepo.getTimerState()
  const games = await redisRepo.getAllGames()

  socket.emit(BROADCAST_EVENTS.TIMER_UPDATE, timerState)
  socket.emit(BROADCAST_EVENTS.GAMES_LIST_UPDATE, games)
}

async function handleStartGame(socket: Socket) {
  const timerState = await redisRepo.getTimerState()
  timerState.isRunning = true
  timerState.isPaused = false
  if (timerState.remainingSeconds === 0) {
    timerState.remainingSeconds = 300 // Reset to 5 minutes
  }
  await redisRepo.setTimerState(timerState)

  await activateAllGames()

  redisPub.publish(REDIS_CHANNELS.TIMER_TICK, JSON.stringify(timerState))
  console.log('🎮 Game started by admin')
}

async function handleStopGame(socket: Socket) {
  const timerState = await redisRepo.getTimerState()
  timerState.isRunning = false
  timerState.isPaused = false
  timerState.remainingSeconds = 300 // Reset to 5 minutes
  await redisRepo.setTimerState(timerState)

  await pauseAllGames()

  redisPub.publish(REDIS_CHANNELS.TIMER_TICK, JSON.stringify(timerState))
  console.log('🛑 Game stopped by admin')
}

async function handlePauseTimer(socket: Socket) {
  const timerState = await redisRepo.getTimerState()
  if (timerState.isRunning) {
    timerState.isPaused = true
    await redisRepo.setTimerState(timerState)

    await pauseAllGames()

    redisPub.publish(REDIS_CHANNELS.TIMER_TICK, JSON.stringify(timerState))
    console.log('⏸️  Timer paused by admin')
  }
}

async function handleResumeTimer(socket: Socket) {
  const timerState = await redisRepo.getTimerState()
  if (timerState.isRunning && timerState.isPaused) {
    timerState.isPaused = false
    await redisRepo.setTimerState(timerState)

    await activateAllGames()

    redisPub.publish(REDIS_CHANNELS.TIMER_TICK, JSON.stringify(timerState))
    console.log('▶️  Timer resumed by admin')
  }
}

async function handleAddMinute(socket: Socket) {
  const timerState = await redisRepo.getTimerState()
  if (timerState.isPaused) {
    timerState.remainingSeconds += 60
    await redisRepo.setTimerState(timerState)

    redisPub.publish(REDIS_CHANNELS.TIMER_TICK, JSON.stringify(timerState))
    console.log('➕ Added 1 minute to timer')
  }
}

async function handleSubtractMinute(socket: Socket) {
  const timerState = await redisRepo.getTimerState()
  if (timerState.isPaused && timerState.remainingSeconds >= 60) {
    timerState.remainingSeconds -= 60
    await redisRepo.setTimerState(timerState)

    redisPub.publish(REDIS_CHANNELS.TIMER_TICK, JSON.stringify(timerState))
    console.log('➖ Subtracted 1 minute from timer')
  }
}

// User event handlers
async function handleUserLogin(socket: Socket, data: { name: string; userId?: string }) {
  const { name } = data
  let { userId } = data

  // Generate new userId if not provided
  if (!userId) {
    userId = uuidv4()
  }

  // Create or update user
  const user = {
    id: userId,
    name,
    socketId: socket.id,
  }
  await redisRepo.setUser(user)

  // Join all players room
  socket.join(SOCKET_ROOMS.ALL_PLAYERS)

  // Store userId in socket data for later use
  socket.data.userId = userId

  console.log(`👤 User logged in: ${name} (${userId})`)

  // Send response FIRST so client has userId before match
  socket.emit(BROADCAST_EVENTS.USER_LOGIN_RESPONSE, { userId, name })

  // Send current timer state
  const timerState = await redisRepo.getTimerState()
  socket.emit(BROADCAST_EVENTS.TIMER_UPDATE, timerState)

  // Try to match with waiting player (after client knows their userId)
  await matchPlayer(socket, userId)
}

async function handleUserRejoin(socket: Socket, data: { userId: string }) {
  const { userId } = data
  const user = await redisRepo.getUser(userId)

  if (user) {
    // Update socket ID
    user.socketId = socket.id
    await redisRepo.setUser(user)

    socket.data.userId = userId
    socket.join(SOCKET_ROOMS.ALL_PLAYERS)

    // Find user's active game
    const games = await redisRepo.getAllGames()
    const userGame = games.find(
      (g) => (g.player1Id === userId || g.player2Id === userId) && g.status !== 'ended'
    )

    if (userGame) {
      socket.join(SOCKET_ROOMS.GAME(userGame.id))
      socket.emit(BROADCAST_EVENTS.GAME_STATE_UPDATE, userGame)
    }

    const timerState = await redisRepo.getTimerState()
    socket.emit(BROADCAST_EVENTS.TIMER_UPDATE, timerState)

    console.log(`🔄 User rejoined: ${user.name} (${userId})`)
  }
}

async function matchPlayer(socket: Socket, userId: string) {
  // Check if there's a waiting player
  const waitingPlayerId = await redisRepo.getNextWaitingPlayer()

  if (waitingPlayerId && waitingPlayerId !== userId) {
    // Get both players first
    const player1 = await redisRepo.getUser(waitingPlayerId)
    const player2 = await redisRepo.getUser(userId)

    if (!player1 || !player2) {
      console.error('Could not find player data for matchmaking')
      return
    }

    // Create a new game with player names stored
    const gameId = uuidv4()
    const game: Game = {
      id: gameId,
      player1Id: waitingPlayerId,
      player2Id: userId,
      player1Name: player1.name,
      player2Name: player2.name,
      board: ['', '', '', '', '', '', '', '', ''],
      currentTurn: 'player1',
      status: 'waiting',
      winner: 'none',
      player1Wins: 0,
      player2Wins: 0,
    }

    await redisRepo.setGame(game)

    if (player1 && player2) {
      // Join both players to game room
      const player1Socket = io?.sockets.sockets.get(player1.socketId)
      if (player1Socket) {
        player1Socket.join(SOCKET_ROOMS.GAME(gameId))
      }
      socket.join(SOCKET_ROOMS.GAME(gameId))

      // Notify both players
      io?.to(SOCKET_ROOMS.GAME(gameId)).emit(BROADCAST_EVENTS.GAME_MATCHED, {
        gameId,
        player1: { id: player1.id, name: player1.name },
        player2: { id: player2.id, name: player2.name },
      })

      console.log(`🎮 Game created: ${player1.name} vs ${player2.name}`)

      // Check if game should be active
      const timerState = await redisRepo.getTimerState()
      if (timerState.isRunning && !timerState.isPaused && timerState.remainingSeconds > 0) {
        game.status = 'active'
        await redisRepo.setGame(game)
      }

      // Broadcast game state
      io?.to(SOCKET_ROOMS.GAME(gameId)).emit(BROADCAST_EVENTS.GAME_STATE_UPDATE, game)

      await broadcastGamesList()
    }
  } else {
    // Add to waiting queue
    await redisRepo.addToWaitingQueue(userId)
    console.log(`⏳ User added to waiting queue: ${userId}`)
  }
}

async function handleMakeMove(socket: Socket, data: { gameId: string; position: number }) {
  const { gameId, position } = data
  const userId = socket.data.userId

  if (!userId) {
    socket.emit('error', { message: 'User not authenticated' })
    return
  }

  const game = await redisRepo.getGame(gameId)
  if (!game) {
    socket.emit('error', { message: 'Game not found' })
    return
  }

  // Validate move
  if (!isValidMove(game, position, userId)) {
    socket.emit('error', { message: 'Invalid move' })
    return
  }

  // Make the move
  const symbol = getPlayerSymbol(game, userId)
  game.board[position] = symbol
  game.currentTurn = getNextTurn(game.currentTurn)

  // Check for winner
  const result = checkWinner(game.board)

  if (result) {
    game.status = 'ended'

    if (result === 'X') {
      game.winner = 'player1'
      game.player1Wins += 1
      await redisRepo.incrementUserWins(game.player1Id)
      await redisRepo.incrementUserLosses(game.player2Id)
    } else if (result === 'O') {
      game.winner = 'player2'
      game.player2Wins += 1
      await redisRepo.incrementUserWins(game.player2Id)
      await redisRepo.incrementUserLosses(game.player1Id)
    } else if (result === 'draw') {
      game.winner = 'draw'
    }

    await redisRepo.setGame(game)

    // Notify players of game end (use stored names)
    io?.to(SOCKET_ROOMS.GAME(gameId)).emit(BROADCAST_EVENTS.GAME_ENDED, {
      game,
      winner: game.winner,
      player1Name: game.player1Name,
      player2Name: game.player2Name,
    })

    console.log(`🏁 Game ended: ${gameId}, winner: ${game.winner}`)
  } else {
    await redisRepo.setGame(game)
  }

  // Publish game update
  redisPub.publish(
    REDIS_CHANNELS.GAME_UPDATE,
    JSON.stringify({ gameId, game })
  )

  await broadcastGamesList()
}

async function handleDisconnect(socket: Socket) {
  const userId = socket.data.userId
  console.log(`❌ Client disconnected: ${socket.id}`)

  if (userId) {
    // Note: We don't remove the user or their game on disconnect
    // They can rejoin using their userId from localStorage
    console.log(`User ${userId} disconnected but can rejoin`)
  }
}

async function broadcastGamesList() {
  const games = await redisRepo.getAllGames()

  // Enrich games with player stats (names are already stored in game)
  const enrichedGames = await Promise.all(
    games.map(async (game) => {
      const player1Stats = await redisRepo.getUserStats(game.player1Id)
      const player2Stats = await redisRepo.getUserStats(game.player2Id)

      return {
        ...game,
        // Names are already in game object, no need to fetch
        player1TotalWins: player1Stats.wins,
        player1TotalLosses: player1Stats.losses,
        player2TotalWins: player2Stats.wins,
        player2TotalLosses: player2Stats.losses,
      }
    })
  )

  redisPub.publish(
    REDIS_CHANNELS.GAMES_LIST,
    JSON.stringify({ games: enrichedGames })
  )
}
