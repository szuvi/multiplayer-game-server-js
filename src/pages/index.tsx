import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { USER_EVENTS, BROADCAST_EVENTS } from '@/lib/socket-events'

interface TimerState {
  remainingSeconds: number
  isRunning: boolean
  isPaused: boolean
}

interface Game {
  id: string
  player1Id: string
  player2Id: string
  board: string[]
  currentTurn: 'player1' | 'player2'
  status: 'waiting' | 'active' | 'paused' | 'ended'
  winner: 'player1' | 'player2' | 'draw' | 'none'
  player1Wins: number
  player2Wins: number
}

interface Settings {
  backgroundColor: string
  headingText: string
}

interface MatchedData {
  gameId: string
  player1: { id: string; name: string }
  player2: { id: string; name: string }
}

interface GameEndedData {
  game: Game
  winner: string
  player1Name: string
  player2Name: string
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [nameInput, setNameInput] = useState('')

  const [settings, setSettings] = useState<Settings>({
    backgroundColor: '#0f172a',
    headingText: 'Tic Tac Toe',
  })

  const [timerState, setTimerState] = useState<TimerState>({
    remainingSeconds: 300,
    isRunning: false,
    isPaused: false,
  })

  const [game, setGame] = useState<Game | null>(null)
  const [opponentName, setOpponentName] = useState<string>('')
  const [isWaiting, setIsWaiting] = useState(false)
  const [gameEndMessage, setGameEndMessage] = useState<string>('')

  // Load settings
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSettings(data.settings)
        }
      })
      .catch((error) => {
        console.error('Error loading settings:', error)
      })
  }, [])

  // Check for existing userId in localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('tictactoe_userId')
    const storedUserName = localStorage.getItem('tictactoe_userName')

    if (storedUserId && storedUserName) {
      setUserId(storedUserId)
      setUserName(storedUserName)
      setIsLoggedIn(true)
      initializeSocket(storedUserId, storedUserName)
    }
  }, [])

  const initializeSocket = (uid: string, name: string) => {
    fetch('/api/socket')
      .then(() => {
        const socketInstance = io()

        socketInstance.on('connect', () => {
          console.log('Socket.io connected')
          // Rejoin with existing userId
          socketInstance.emit(USER_EVENTS.REJOIN, { userId: uid })
        })

        socketInstance.on(BROADCAST_EVENTS.USER_LOGIN_RESPONSE, (data: { userId: string; name: string }) => {
          console.log('Login response:', data)
        })

        socketInstance.on(BROADCAST_EVENTS.TIMER_UPDATE, (data: TimerState) => {
          setTimerState(data)
        })

        socketInstance.on(BROADCAST_EVENTS.GAME_MATCHED, (data: MatchedData) => {
          console.log('Matched with opponent:', data)
          setIsWaiting(false)

          // Determine opponent name
          if (data.player1.id === uid) {
            setOpponentName(data.player2.name)
          } else {
            setOpponentName(data.player1.name)
          }
        })

        socketInstance.on(BROADCAST_EVENTS.GAME_STATE_UPDATE, (data: Game) => {
          console.log('Game state update:', data)
          setGame(data)
          setGameEndMessage('')
        })

        socketInstance.on(BROADCAST_EVENTS.GAME_ENDED, (data: GameEndedData) => {
          console.log('Game ended:', data)
          setGame(data.game)

          // Determine winner message
          if (data.winner === 'draw') {
            setGameEndMessage("It's a draw!")
          } else if (data.winner === 'player1') {
            setGameEndMessage(`${data.player1Name} wins!`)
          } else if (data.winner === 'player2') {
            setGameEndMessage(`${data.player2Name} wins!`)
          }
        })

        socketInstance.on('error', (data: { message: string }) => {
          console.error('Socket error:', data.message)
        })

        setSocket(socketInstance)

        return () => {
          socketInstance.close()
        }
      })
      .catch((error) => {
        console.error('Error initializing socket:', error)
      })
  }

  const handleLogin = () => {
    if (!nameInput.trim()) {
      alert('Please enter your name')
      return
    }

    fetch('/api/socket')
      .then(() => {
        const socketInstance = io()
        let loggedInUserId = ''

        socketInstance.on('connect', () => {
          console.log('Socket.io connected')
          socketInstance.emit(USER_EVENTS.LOGIN, { name: nameInput.trim() })
        })

        socketInstance.on(BROADCAST_EVENTS.USER_LOGIN_RESPONSE, (data: { userId: string; name: string }) => {
          console.log('Login successful:', data)
          loggedInUserId = data.userId
          setUserId(data.userId)
          setUserName(data.name)
          setIsLoggedIn(true)
          setIsWaiting(true)

          // Store in localStorage
          localStorage.setItem('tictactoe_userId', data.userId)
          localStorage.setItem('tictactoe_userName', data.name)
        })

        socketInstance.on(BROADCAST_EVENTS.TIMER_UPDATE, (data: TimerState) => {
          setTimerState(data)
        })

        socketInstance.on(BROADCAST_EVENTS.GAME_MATCHED, (data: MatchedData) => {
          console.log('Matched with opponent:', data)
          setIsWaiting(false)

          // Determine opponent name
          if (data.player1.id === loggedInUserId) {
            setOpponentName(data.player2.name)
          } else {
            setOpponentName(data.player1.name)
          }
        })

        socketInstance.on(BROADCAST_EVENTS.GAME_STATE_UPDATE, (data: Game) => {
          console.log('Game state update:', data)
          setGame(data)
          setGameEndMessage('')
        })

        socketInstance.on(BROADCAST_EVENTS.GAME_ENDED, (data: GameEndedData) => {
          console.log('Game ended:', data)
          setGame(data.game)

          // Determine winner message
          if (data.winner === 'draw') {
            setGameEndMessage("It's a draw!")
          } else if (data.winner === 'player1') {
            setGameEndMessage(`${data.player1Name} wins!`)
          } else if (data.winner === 'player2') {
            setGameEndMessage(`${data.player2Name} wins!`)
          }
        })

        socketInstance.on('error', (data: { message: string }) => {
          console.error('Socket error:', data.message)
        })

        setSocket(socketInstance)

        return () => {
          socketInstance.close()
        }
      })
      .catch((error) => {
        console.error('Error initializing socket:', error)
      })
  }

  const handleCellClick = (position: number) => {
    if (!game || !socket || !userId) return

    // Check if it's the player's turn and game is active
    const isPlayer1 = game.player1Id === userId
    const isMyTurn = (isPlayer1 && game.currentTurn === 'player1') ||
                     (!isPlayer1 && game.currentTurn === 'player2')

    if (!isMyTurn || game.status !== 'active' || game.board[position] !== '') {
      return
    }

    socket.emit(USER_EVENTS.MAKE_MOVE, { gameId: game.id, position })
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPlayerSymbol = (): string => {
    if (!game || !userId) return ''
    return game.player1Id === userId ? 'X' : 'O'
  }

  const isMyTurn = (): boolean => {
    if (!game || !userId) return false
    const isPlayer1 = game.player1Id === userId
    return (isPlayer1 && game.currentTurn === 'player1') ||
           (!isPlayer1 && game.currentTurn === 'player2')
  }

  const getMyWins = (): number => {
    if (!game || !userId) return 0
    return game.player1Id === userId ? game.player1Wins : game.player2Wins
  }

  const getOpponentWins = (): number => {
    if (!game || !userId) return 0
    return game.player1Id === userId ? game.player2Wins : game.player1Wins
  }

  // Login screen
  if (!isLoggedIn) {
    return (
      <div style={{ ...styles.container, backgroundColor: settings.backgroundColor }}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>{settings.headingText}</h1>
          <p style={styles.subtitle}>Enter your name to start playing</p>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Your name"
            style={styles.input}
            autoFocus
          />
          <button onClick={handleLogin} style={styles.button}>
            Join Game
          </button>
        </div>
      </div>
    )
  }

  // Waiting for opponent
  if (isWaiting || !game) {
    return (
      <div style={{ ...styles.container, backgroundColor: settings.backgroundColor }}>
        <div style={styles.gameCard}>
          <h1 style={styles.title}>{settings.headingText}</h1>
          <div style={styles.waiting}>
            <div style={styles.spinner}></div>
            <p style={styles.waitingText}>Waiting for opponent...</p>
            <p style={styles.playerInfo}>You are: {userName}</p>
          </div>
        </div>
      </div>
    )
  }

  // Game screen
  const isBoardDisabled = game.status !== 'active' || !isMyTurn()

  return (
    <div style={{ ...styles.container, backgroundColor: settings.backgroundColor }}>
      <div style={styles.gameCard}>
        <h1 style={styles.title}>{settings.headingText}</h1>

        {/* Timer */}
        <div style={styles.timerDisplay}>{formatTime(timerState.remainingSeconds)}</div>

        {/* Game Status */}
        <div style={styles.gameStatus}>
          {game.status === 'ended' ? (
            <div style={styles.gameEndBanner}>{gameEndMessage}</div>
          ) : game.status === 'waiting' || game.status === 'paused' ? (
            <div style={styles.pausedBanner}>Game is paused - waiting for admin to start</div>
          ) : isMyTurn() ? (
            <div style={styles.turnIndicator}>Your turn! (You are {getPlayerSymbol()})</div>
          ) : (
            <div style={styles.turnIndicator}>Opponent's turn...</div>
          )}
        </div>

        {/* Players Info */}
        <div style={styles.playersBar}>
          <div style={styles.playerInfo}>
            <span style={styles.playerName}>{userName} ({getPlayerSymbol()})</span>
            <span style={styles.playerScore}>Wins: {getMyWins()}</span>
          </div>
          <div style={styles.vs}>VS</div>
          <div style={styles.playerInfo}>
            <span style={styles.playerName}>{opponentName} ({getPlayerSymbol() === 'X' ? 'O' : 'X'})</span>
            <span style={styles.playerScore}>Wins: {getOpponentWins()}</span>
          </div>
        </div>

        {/* Tic Tac Toe Board */}
        <div style={styles.board}>
          {game.board.map((cell, index) => (
            <div
              key={index}
              onClick={() => handleCellClick(index)}
              style={{
                ...styles.cell,
                ...(isBoardDisabled ? styles.cellDisabled : {}),
              }}
            >
              {cell}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: 'background-color 0.3s',
  },
  loginCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
  },
  gameCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    maxWidth: '600px',
    width: '100%',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '16px',
    textAlign: 'center',
    background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '16px',
    color: '#94a3b8',
    marginBottom: '24px',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '6px',
    border: '1px solid #475569',
    backgroundColor: '#334155',
    color: '#e2e8f0',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  waiting: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #334155',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 1s linear infinite',
  },
  waitingText: {
    fontSize: '20px',
    color: '#cbd5e1',
    marginBottom: '12px',
  },
  playerInfo: {
    fontSize: '16px',
    color: '#94a3b8',
  },
  timerDisplay: {
    fontSize: '48px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '20px 0',
    color: '#60a5fa',
    fontFamily: 'monospace',
  },
  gameStatus: {
    marginBottom: '20px',
  },
  gameEndBanner: {
    padding: '16px',
    backgroundColor: '#10b981',
    color: 'white',
    textAlign: 'center',
    borderRadius: '8px',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  pausedBanner: {
    padding: '16px',
    backgroundColor: '#f59e0b',
    color: 'white',
    textAlign: 'center',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
  },
  turnIndicator: {
    padding: '12px',
    backgroundColor: '#334155',
    color: '#cbd5e1',
    textAlign: 'center',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
  },
  playersBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#334155',
    borderRadius: '8px',
  },
  playerName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e2e8f0',
    display: 'block',
    marginBottom: '4px',
  },
  playerScore: {
    fontSize: '14px',
    color: '#94a3b8',
    display: 'block',
  },
  vs: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#64748b',
  },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    maxWidth: '400px',
    margin: '0 auto',
  },
  cell: {
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    borderRadius: '8px',
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s',
    userSelect: 'none',
  },
  cellDisabled: {
    cursor: 'not-allowed',
    opacity: 0.7,
  },
}
