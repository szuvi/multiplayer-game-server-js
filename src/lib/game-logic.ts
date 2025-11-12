import { Game } from './redis-repository'

// Check if there's a winner
export function checkWinner(board: string[]): 'X' | 'O' | 'draw' | null {
  // Winning combinations
  const winPatterns = [
    [0, 1, 2], // top row
    [3, 4, 5], // middle row
    [6, 7, 8], // bottom row
    [0, 3, 6], // left column
    [1, 4, 7], // middle column
    [2, 5, 8], // right column
    [0, 4, 8], // diagonal top-left to bottom-right
    [2, 4, 6], // diagonal top-right to bottom-left
  ]

  // Check for winner
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as 'X' | 'O'
    }
  }

  // Check for draw (board full)
  if (board.every((cell) => cell !== '')) {
    return 'draw'
  }

  // Game still in progress
  return null
}

// Validate a move
export function isValidMove(game: Game, position: number, playerId: string): boolean {
  // Check if position is valid
  if (position < 0 || position > 8) {
    return false
  }

  // Check if game is active
  if (game.status !== 'active') {
    return false
  }

  // Check if position is empty
  if (game.board[position] !== '') {
    return false
  }

  // Check if it's the player's turn
  if (game.currentTurn === 'player1' && game.player1Id !== playerId) {
    return false
  }
  if (game.currentTurn === 'player2' && game.player2Id !== playerId) {
    return false
  }

  return true
}

// Get player symbol (X or O)
export function getPlayerSymbol(game: Game, playerId: string): 'X' | 'O' {
  return game.player1Id === playerId ? 'X' : 'O'
}

// Get next turn
export function getNextTurn(currentTurn: 'player1' | 'player2'): 'player1' | 'player2' {
  return currentTurn === 'player1' ? 'player2' : 'player1'
}

