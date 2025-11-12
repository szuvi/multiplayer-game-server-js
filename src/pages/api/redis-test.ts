import { NextApiRequest, NextApiResponse } from 'next'
import redis from '@/lib/redis'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test Redis connection with ping
    const pingResult = await redis.ping()

    // Test set/get operations
    const testKey = 'test:connection'
    const testValue = `test-${Date.now()}`

    await redis.set(testKey, testValue, 'EX', 10) // Expire in 10 seconds
    const getValue = await redis.get(testKey)

    const isWorking = pingResult === 'PONG' && getValue === testValue

    res.status(200).json({
      status: 'ok',
      redis: isWorking ? 'connected' : 'error',
      ping: pingResult,
      setGetTest: getValue === testValue ? 'passed' : 'failed',
      message: 'Redis connection successful',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Redis health check failed:', error)
    res.status(500).json({
      status: 'error',
      redis: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
}

