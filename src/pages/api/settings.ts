import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      // Get current settings
      let settings = await prisma.gameSettings.findUnique({
        where: { id: 'default' },
      })

      // If no settings exist, create default ones
      if (!settings) {
        settings = await prisma.gameSettings.create({
          data: {
            id: 'default',
            backgroundColor: '#0f172a',
            headingText: 'Tic Tac Toe',
          },
        })
      }

      res.status(200).json({
        success: true,
        settings: {
          backgroundColor: settings.backgroundColor,
          headingText: settings.headingText,
        },
      })
    } else if (req.method === 'POST') {
      // Update settings
      const { backgroundColor, headingText } = req.body

      if (!backgroundColor || !headingText) {
        return res.status(400).json({
          success: false,
          message: 'backgroundColor and headingText are required',
        })
      }

      // Validate hex color
      const hexColorRegex = /^#[0-9A-F]{6}$/i
      if (!hexColorRegex.test(backgroundColor)) {
        return res.status(400).json({
          success: false,
          message: 'backgroundColor must be a valid hex color (e.g., #0f172a)',
        })
      }

      const settings = await prisma.gameSettings.upsert({
        where: { id: 'default' },
        update: {
          backgroundColor,
          headingText,
        },
        create: {
          id: 'default',
          backgroundColor,
          headingText,
        },
      })

      res.status(200).json({
        success: true,
        settings: {
          backgroundColor: settings.backgroundColor,
          headingText: settings.headingText,
        },
        message: 'Settings updated successfully',
      })
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Settings API error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

