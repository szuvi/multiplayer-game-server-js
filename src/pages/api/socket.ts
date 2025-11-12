import { NextApiRequest, NextApiResponse } from 'next'
import { Server as HTTPServer } from 'http'
import { Socket as NetSocket } from 'net'
import { Server as SocketIOServer } from 'socket.io'
import { initSocketServer } from '@/lib/socket'

interface SocketServer extends HTTPServer {
  io?: SocketIOServer
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    console.log('Socket.io server already running')
    res.status(200).json({ success: true, message: 'Socket.io server already running' })
    return
  }

  console.log('Initializing Socket.io server...')
  const io = initSocketServer(res.socket.server)
  res.socket.server.io = io

  res.status(201).json({ success: true, message: 'Socket.io server initialized' })
}

