import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { ADMIN_EVENTS, BROADCAST_EVENTS } from '@/lib/socket-events'

interface TimerState {
  remainingSeconds: number
  isRunning: boolean
  isPaused: boolean
}

interface GameWithPlayers {
  id: string
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  player1TotalWins: number
  player1TotalLosses: number
  player2TotalWins: number
  player2TotalLosses: number
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

export default function AdminPage() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [timerState, setTimerState] = useState<TimerState>({
    remainingSeconds: 300,
    isRunning: false,
    isPaused: false,
  })
  const [games, setGames] = useState<GameWithPlayers[]>([])
  const [settings, setSettings] = useState<Settings>({
    backgroundColor: '#0f172a',
    headingText: 'Tic Tac Toe',
  })
  const [settingsForm, setSettingsForm] = useState<Settings>({
    backgroundColor: '#0f172a',
    headingText: 'Tic Tac Toe',
  })

  // Initialize Socket.io
  useEffect(() => {
    fetch('/api/socket')
      .then(() => {
        const socketInstance = io()

        socketInstance.on('connect', () => {
          console.log('Admin Socket.io connected')
          socketInstance.emit(ADMIN_EVENTS.JOIN_ADMIN)
        })

        socketInstance.on(BROADCAST_EVENTS.TIMER_UPDATE, (data: TimerState) => {
          setTimerState(data)
        })

        // Initial games list on admin join
        socketInstance.on(BROADCAST_EVENTS.GAMES_LIST_UPDATE, (data: GameWithPlayers[]) => {
          setGames(data)
        })

        // Handle new game added
        socketInstance.on(BROADCAST_EVENTS.ADMIN_GAME_ADDED, (game: GameWithPlayers) => {
          setGames((prevGames) => [...prevGames, game])
        })

        // Handle individual game updates
        socketInstance.on(BROADCAST_EVENTS.GAME_STATE_UPDATE, (updatedGame: GameWithPlayers) => {
          setGames((prevGames) =>
            prevGames.map((game) =>
              game.id === updatedGame.id
                ? {
                    ...game,
                    ...updatedGame,
                    // Preserve enriched player stats from initial load
                    player1TotalWins: game.player1TotalWins,
                    player1TotalLosses: game.player1TotalLosses,
                    player2TotalWins: game.player2TotalWins,
                    player2TotalLosses: game.player2TotalLosses,
                  }
                : game
            )
          )
        })

        setSocket(socketInstance)

        return () => {
          socketInstance.close()
        }
      })
      .catch((error) => {
        console.error('Error initializing socket:', error)
      })
  }, [])

  // Load settings
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSettings(data.settings)
          setSettingsForm(data.settings)
        }
      })
      .catch((error) => {
        console.error('Error loading settings:', error)
      })
  }, [])

  const handleStartGame = () => {
    socket?.emit(ADMIN_EVENTS.START_GAME)
  }

  const handleStopGame = () => {
    socket?.emit(ADMIN_EVENTS.STOP_GAME)
  }

  const handlePauseTimer = () => {
    socket?.emit(ADMIN_EVENTS.PAUSE_TIMER)
  }

  const handleResumeTimer = () => {
    socket?.emit(ADMIN_EVENTS.RESUME_TIMER)
  }

  const handleAddMinute = () => {
    socket?.emit(ADMIN_EVENTS.ADD_MINUTE)
  }

  const handleSubtractMinute = () => {
    socket?.emit(ADMIN_EVENTS.SUBTRACT_MINUTE)
  }

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsForm),
      })

      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
        alert('Settings saved successfully!')
      } else {
        alert(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const renderBoard = (board: string[]) => {
    return (
      <div style={styles.miniBoard}>
        {board.map((cell, idx) => (
          <div key={idx} style={styles.miniCell}>
            {cell}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎮 Admin Dashboard</h1>

        {/* Settings Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Game Settings</h2>
          <div style={styles.settingsForm}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Background Color (hex):</label>
              <input
                type="text"
                value={settingsForm.backgroundColor}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, backgroundColor: e.target.value })
                }
                style={styles.input}
                placeholder="#0f172a"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Heading Text:</label>
              <input
                type="text"
                value={settingsForm.headingText}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, headingText: e.target.value })
                }
                style={styles.input}
                placeholder="Tic Tac Toe"
              />
            </div>
            <button onClick={handleSaveSettings} style={styles.button}>
              Save Settings
            </button>
          </div>
        </div>

        {/* Timer Controls */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Timer Controls</h2>
          <div style={styles.timerDisplay}>{formatTime(timerState.remainingSeconds)}</div>
          <div style={styles.timerStatus}>
            Status:{' '}
            {timerState.isRunning
              ? timerState.isPaused
                ? '⏸️ Paused'
                : '▶️ Running'
              : '⏹️ Stopped'}
          </div>
          <div style={styles.controlButtons}>
            <button
              onClick={handleStartGame}
              disabled={timerState.isRunning && !timerState.isPaused}
              style={{
                ...styles.button,
                ...(timerState.isRunning && !timerState.isPaused ? styles.buttonDisabled : {}),
              }}
            >
              Start Game
            </button>
            <button onClick={handleStopGame} style={styles.button}>
              Stop Game
            </button>
            <button
              onClick={handlePauseTimer}
              disabled={!timerState.isRunning || timerState.isPaused}
              style={{
                ...styles.button,
                ...(!timerState.isRunning || timerState.isPaused ? styles.buttonDisabled : {}),
              }}
            >
              Pause
            </button>
            <button
              onClick={handleResumeTimer}
              disabled={!timerState.isPaused}
              style={{
                ...styles.button,
                ...(!timerState.isPaused ? styles.buttonDisabled : {}),
              }}
            >
              Resume
            </button>
          </div>
          <div style={styles.timeAdjustButtons}>
            <button
              onClick={handleSubtractMinute}
              disabled={!timerState.isPaused}
              style={{
                ...styles.button,
                ...(!timerState.isPaused ? styles.buttonDisabled : {}),
              }}
            >
              -1 Min
            </button>
            <button
              onClick={handleAddMinute}
              disabled={!timerState.isPaused}
              style={{
                ...styles.button,
                ...(!timerState.isPaused ? styles.buttonDisabled : {}),
              }}
            >
              +1 Min
            </button>
          </div>
        </div>

        {/* Games List */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Active Games ({games.length})</h2>
          {games.length === 0 ? (
            <p style={styles.noGames}>No active games</p>
          ) : (
            <div style={styles.gamesList}>
              {games.map((game) => (
                <div key={game.id} style={styles.gameCard}>
                  <div style={styles.gameHeader}>
                    <span style={styles.gameStatus}>
                      {game.status === 'ended'
                        ? '🏁 Ended'
                        : game.status === 'active'
                        ? '🎮 Active'
                        : game.status === 'paused'
                        ? '⏸️ Paused'
                        : '⏳ Waiting'}
                    </span>
                  </div>
                  <div style={styles.playersInfo}>
                    <div style={styles.playerBox}>
                      <div style={styles.playerName}>
                        {game.player1Name} (X)
                        {game.currentTurn === 'player1' && game.status === 'active' && ' 👈'}
                      </div>
                      <div style={styles.playerStats}>
                        Total: {game.player1TotalWins}W / {game.player1TotalLosses}L
                      </div>
                      <div style={styles.playerStats}>This match: {game.player1Wins} wins</div>
                    </div>
                    <div style={styles.vs}>VS</div>
                    <div style={styles.playerBox}>
                      <div style={styles.playerName}>
                        {game.player2Name} (O)
                        {game.currentTurn === 'player2' && game.status === 'active' && ' 👈'}
                      </div>
                      <div style={styles.playerStats}>
                        Total: {game.player2TotalWins}W / {game.player2TotalLosses}L
                      </div>
                      <div style={styles.playerStats}>This match: {game.player2Wins} wins</div>
                    </div>
                  </div>
                  {renderBoard(game.board)}
                  {game.status === 'ended' && (
                    <div style={styles.winner}>
                      Winner:{' '}
                      {game.winner === 'player1'
                        ? `${game.player1Name} (X)`
                        : game.winner === 'player2'
                        ? `${game.player2Name} (O)`
                        : 'Draw'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '32px',
    textAlign: 'center',
    background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  section: {
    marginBottom: '40px',
    padding: '24px',
    backgroundColor: '#334155',
    borderRadius: '8px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#cbd5e1',
  },
  settingsForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#cbd5e1',
  },
  input: {
    padding: '10px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #475569',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#475569',
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  timerDisplay: {
    fontSize: '64px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '20px 0',
    color: '#60a5fa',
    fontFamily: 'monospace',
  },
  timerStatus: {
    fontSize: '18px',
    textAlign: 'center',
    marginBottom: '24px',
    color: '#cbd5e1',
  },
  controlButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  timeAdjustButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  gamesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  gameCard: {
    padding: '20px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px solid #475569',
  },
  gameHeader: {
    marginBottom: '16px',
    textAlign: 'center',
  },
  gameStatus: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  playersInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    gap: '12px',
  },
  playerBox: {
    flex: 1,
  },
  playerName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '4px',
  },
  playerStats: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  vs: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#64748b',
  },
  miniBoard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '4px',
    maxWidth: '150px',
    margin: '16px auto',
  },
  miniCell: {
    width: '100%',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#475569',
    borderRadius: '4px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  winner: {
    marginTop: '12px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '600',
    color: '#10b981',
  },
  noGames: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '16px',
    padding: '20px',
  },
}

