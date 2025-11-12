# Tic Tac Toe Testing Guide

This guide will walk you through testing the complete multiplayer tic tac toe game implementation.

## Prerequisites

Before testing, ensure you have:
- Docker and Docker Compose installed
- Node.js and npm installed
- The infrastructure (Redis and PostgreSQL) running

## Step 1: Start Infrastructure

Start the Redis and PostgreSQL containers:

```bash
./start-infrastructure.sh
```

Or manually:

```bash
docker-compose -f docker-compose.ec2.yml up -d
docker-compose -f docker-compose.rds.yml up -d
```

## Step 2: Setup Database

Run the Prisma migrations to create the database tables:

```bash
npx prisma migrate deploy
```

Or if the migration doesn't exist, create it:

```bash
DATABASE_URL="postgresql://gameuser:gamepassword@localhost:5432/gamedb" npx prisma migrate dev --name add_game_settings
```

## Step 3: Install Dependencies

If you haven't already:

```bash
npm install
```

## Step 4: Start the Application

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at:
- User page: http://localhost:3000
- Admin page: http://localhost:3000/admin

## Testing Scenarios

### Scenario 1: Admin Settings Configuration

1. Navigate to http://localhost:3000/admin
2. In the "Game Settings" section:
   - Change the "Background Color" (e.g., #1a1a2e)
   - Change the "Heading Text" (e.g., "Epic Tic Tac Toe Battle")
   - Click "Save Settings"
3. Refresh the user page (http://localhost:3000) to see the updated background and heading

### Scenario 2: Timer Controls

1. On the admin page, observe the timer (should show 5:00 by default)
2. Click "Start Game" - timer should start counting down
3. Click "Pause" - timer should stop
4. Click "-1 Min" or "+1 Min" - timer should adjust (only works when paused)
5. Click "Resume" - timer should continue from where it paused
6. Click "Stop Game" - timer should reset to 5:00

### Scenario 3: User Login and Matchmaking

1. Open two browser windows/tabs (or use different browsers)
2. In window 1, navigate to http://localhost:3000
3. Enter a name (e.g., "Alice") and click "Join Game"
4. You should see "Waiting for opponent..."
5. In window 2, navigate to http://localhost:3000
6. Enter a different name (e.g., "Bob") and click "Join Game"
7. Both players should be matched and see the game board
8. On the admin page, you should see the new game appear in the games list

### Scenario 4: Playing Tic Tac Toe

1. With two players matched, ensure the admin has started the game
2. Player 1 (X) should see "Your turn!" message
3. Player 1 clicks on any empty cell - it should fill with "X"
4. Player 2 (O) should now see "Your turn!" message
5. Player 2 clicks on any empty cell - it should fill with "O"
6. Continue alternating turns
7. The game board should update in real-time for both players
8. On the admin page, watch the game board update live

### Scenario 5: Win Conditions

1. Play a game to completion where one player wins (e.g., three X's in a row)
2. Both players should see a message indicating the winner
3. The game status should change to "Ended"
4. The winner should have their win count incremented
5. On the admin page, the game should show the winner

### Scenario 6: Draw Condition

1. Play a game where all 9 cells are filled with no winner
2. Both players should see "It's a draw!" message
3. The game status should show as ended

### Scenario 7: Game Pausing

1. Start a game with two players
2. On the admin page, click "Pause"
3. Try to make a move on the user page - it should be disabled
4. A message should appear: "Game is paused - waiting for admin to start"
5. On the admin page, click "Resume"
6. Players should be able to make moves again

### Scenario 8: Timer Expiry

1. Start a game with the timer at 1:00 (use -1 Min button multiple times)
2. Start the game
3. Let the timer count down to 0:00
4. All games should be paused automatically
5. Players should see the paused message

### Scenario 9: User Persistence (localStorage)

1. Login as a user and join a game
2. Refresh the browser page
3. You should still be in the same game (userId persists via localStorage)
4. The game state should reload

### Scenario 10: Multiple Games

1. Open 4 browser windows (or use incognito mode)
2. Login as 4 different users
3. They should automatically pair into 2 separate games
4. On the admin page, you should see both games listed
5. Each game operates independently

### Scenario 11: Real-time Updates via Redis Pub/Sub

1. Start two separate instances of the application (if possible, on different ports)
2. Have users connect to different instances
3. Admin actions on one instance should affect users on both instances
4. This demonstrates Redis pub/sub working across server instances

## Monitoring and Debugging

### Check Redis Data

Connect to Redis and inspect the data:

```bash
docker exec -it redis redis-cli

# Check all keys
KEYS *

# Get timer state
GET timer_state

# Get a user
GET user:<userId>

# Get a game
GET game:<gameId>

# Check waiting queue
LRANGE waiting_queue 0 -1
```

### Check PostgreSQL Data

Connect to PostgreSQL:

```bash
docker exec -it postgres psql -U gameuser -d gamedb

# Check settings
SELECT * FROM game_settings;
```

### Check Application Logs

The console will show:
- Socket.io connections/disconnections
- User logins
- Game creations
- Move validations
- Game endings
- Timer ticks

## Expected Behaviors

### Type Safety
- All Redis operations use Zod schemas for validation
- Socket.io events use named constants (no magic strings)
- TypeScript provides compile-time type checking

### Real-time Updates
- Timer updates broadcast to all connected clients every second
- Game state changes broadcast immediately to both players
- Admin dashboard updates live with new games and state changes

### Game Rules
- Only the current player can make a move
- Moves are only allowed when game status is "active"
- Win detection checks all rows, columns, and diagonals
- Draw detection checks if board is full with no winner

## Troubleshooting

### Issue: Cannot connect to database
- Ensure PostgreSQL container is running: `docker ps`
- Check DATABASE_URL in .env or environment variables

### Issue: Cannot connect to Redis
- Ensure Redis container is running: `docker ps`
- Check REDIS_HOST and REDIS_PORT environment variables

### Issue: Socket.io not connecting
- Check browser console for errors
- Ensure /api/socket endpoint is responding
- Check if ports are not blocked by firewall

### Issue: Timer not updating
- Check browser console for timer update events
- Ensure Redis pub/sub is working
- Check server logs for timer tick intervals

## Success Criteria

✅ All todos completed
✅ Type-safe Redis operations with Zod schemas
✅ Socket.io events using named constants
✅ Redis pub/sub channels for cross-server communication
✅ Admin can control game settings and timer
✅ Users can login, get matched, and play tic tac toe
✅ Real-time updates work correctly
✅ Game logic (win/draw detection) works properly
✅ Timer controls affect game state appropriately
✅ PostgreSQL stores and retrieves settings correctly
✅ localStorage persists user identity across refreshes

