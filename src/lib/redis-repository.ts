import { z } from 'zod'
import { redis } from './redis'
import { REDIS_KEYS } from './redis-keys'

// Zod schemas for type safety
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  socketId: z.string(),
})

export const UserStatsSchema = z.object({
  wins: z.number(),
  losses: z.number(),
})

export const GameSchema = z.object({
  id: z.string(),
  player1Id: z.string(),
  player2Id: z.string(),
  player1Name: z.string(),
  player2Name: z.string(),
  board: z.array(z.string()).length(9),
  currentTurn: z.enum(['player1', 'player2']),
  status: z.enum(['waiting', 'active', 'paused', 'ended']),
  winner: z.enum(['player1', 'player2', 'draw', 'none']),
  player1Wins: z.number(),
  player2Wins: z.number(),
})

export const TimerStateSchema = z.object({
  remainingSeconds: z.number(),
  isRunning: z.boolean(),
  isPaused: z.boolean(),
})

// Type exports
export type User = z.infer<typeof UserSchema>
export type UserStats = z.infer<typeof UserStatsSchema>
export type Game = z.infer<typeof GameSchema>
export type TimerState = z.infer<typeof TimerStateSchema>

// Type-safe Redis repository
export class RedisRepository {
  // User operations
  async setUser(user: User): Promise<void> {
    const validated = UserSchema.parse(user)
    await redis.set(REDIS_KEYS.USER(user.id), JSON.stringify(validated))
  }

  async getUser(userId: string): Promise<User | null> {
    const data = await redis.get(REDIS_KEYS.USER(userId))
    if (!data) return null
    return UserSchema.parse(JSON.parse(data))
  }

  async deleteUser(userId: string): Promise<void> {
    await redis.del(REDIS_KEYS.USER(userId))
  }

  // User stats operations
  async getUserStats(userId: string): Promise<UserStats> {
    const data = await redis.get(REDIS_KEYS.USER_STATS(userId))
    if (!data) {
      const defaultStats = { wins: 0, losses: 0 }
      await this.setUserStats(userId, defaultStats)
      return defaultStats
    }
    return UserStatsSchema.parse(JSON.parse(data))
  }

  async setUserStats(userId: string, stats: UserStats): Promise<void> {
    const validated = UserStatsSchema.parse(stats)
    await redis.set(REDIS_KEYS.USER_STATS(userId), JSON.stringify(validated))
  }

  async incrementUserWins(userId: string): Promise<void> {
    const stats = await this.getUserStats(userId)
    await this.setUserStats(userId, { ...stats, wins: stats.wins + 1 })
  }

  async incrementUserLosses(userId: string): Promise<void> {
    const stats = await this.getUserStats(userId)
    await this.setUserStats(userId, { ...stats, losses: stats.losses + 1 })
  }

  // Game operations
  async setGame(game: Game): Promise<void> {
    const validated = GameSchema.parse(game)
    await redis.set(REDIS_KEYS.GAME(game.id), JSON.stringify(validated))
  }

  async getGame(gameId: string): Promise<Game | null> {
    const data = await redis.get(REDIS_KEYS.GAME(gameId))
    if (!data) return null
    return GameSchema.parse(JSON.parse(data))
  }

  async deleteGame(gameId: string): Promise<void> {
    await redis.del(REDIS_KEYS.GAME(gameId))
  }

  async getAllGames(): Promise<Game[]> {
    const keys = await redis.keys(REDIS_KEYS.GAME('*'))
    if (keys.length === 0) return []

    const games: Game[] = []
    for (const key of keys) {
      const data = await redis.get(key)
      if (data) {
        games.push(GameSchema.parse(JSON.parse(data)))
      }
    }
    return games
  }

  // Waiting queue operations
  async addToWaitingQueue(userId: string): Promise<void> {
    await redis.rpush(REDIS_KEYS.WAITING_QUEUE, userId)
  }

  async removeFromWaitingQueue(userId: string): Promise<void> {
    await redis.lrem(REDIS_KEYS.WAITING_QUEUE, 0, userId)
  }

  async getNextWaitingPlayer(): Promise<string | null> {
    return await redis.lpop(REDIS_KEYS.WAITING_QUEUE)
  }

  async getWaitingQueueLength(): Promise<number> {
    return await redis.llen(REDIS_KEYS.WAITING_QUEUE)
  }

  // Timer state operations
  async getTimerState(): Promise<TimerState> {
    const data = await redis.get(REDIS_KEYS.TIMER_STATE)
    if (!data) {
      const defaultState = { remainingSeconds: 300, isRunning: false, isPaused: false }
      await this.setTimerState(defaultState)
      return defaultState
    }
    return TimerStateSchema.parse(JSON.parse(data))
  }

  async setTimerState(state: TimerState): Promise<void> {
    const validated = TimerStateSchema.parse(state)
    await redis.set(REDIS_KEYS.TIMER_STATE, JSON.stringify(validated))
  }
}

// Singleton instance
export const redisRepo = new RedisRepository()

