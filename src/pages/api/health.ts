import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test database connection by attempting a simple query
    await prisma.$queryRaw`SELECT 1`

    // Optionally, try to count records in our test table
    const count = await prisma.connectionTest.count()

    res.status(200).json({
      status: 'ok',
      database: 'connected',
      message: 'PostgreSQL connection successful',
      testRecords: count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Database health check failed:', error)
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
}

