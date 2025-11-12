# Multiplayer Tic Tac Toe Game Server

A real-time multiplayer tic tac toe game with admin controls, built with Next.js, Socket.io, Redis, and PostgreSQL. Features type-safe Redis operations with Zod, Redis pub/sub for scalability, and Socket.io rooms for real-time updates.

## Architecture

This project simulates a real-world AWS deployment:

- **EC2 Simulation** (docker-compose.ec2.yml):
  - Next.js application (frontend + backend API routes)
  - Redis for session management and Socket.io adapter
  - Services communicate on internal Docker network

- **RDS Simulation** (docker-compose.rds.yml):
  - PostgreSQL database (simulating AWS RDS)
  - Exposed to host for EC2 connection via `host.docker.internal`

## Tech Stack

- **Frontend & Backend**: Next.js 14 with TypeScript
- **Database**: PostgreSQL 16 with Prisma ORM
- **Cache/Sessions**: Redis 7
- **Real-time**: Socket.io with Redis adapter
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Docker Desktop (includes Docker Compose)
- Node.js 18+ (for local development)
- Git

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd multiplayer-game-server-js
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages and is needed before building Docker images.

### 3. Start RDS (PostgreSQL)

The database service must be running first:

```bash
docker-compose -f docker-compose.rds.yml up -d
```

Verify PostgreSQL is running:

```bash
docker-compose -f docker-compose.rds.yml ps
```

### 4. Start EC2 (Next.js + Redis)

```bash
docker-compose -f docker-compose.ec2.yml up --build
```

This will:
- Build the Next.js application
- Start Redis
- Run Prisma migrations
- Start the application server

### 5. Access the Application

Open your browser and navigate to:

**User Page (Play Tic Tac Toe):**
```
http://localhost:3000
```

**Admin Dashboard:**
```
http://localhost:3000/admin
```

The application features:
- Real-time multiplayer tic tac toe gameplay
- Admin controls for game settings and timer
- Automatic player matchmaking
- Live game state updates via Socket.io
- Type-safe Redis operations with Zod validation

## Testing the Game

For comprehensive testing instructions, see [TESTING.md](TESTING.md)

Quick test scenarios:
1. **Admin Controls**: Configure settings, control timer, view live games
2. **User Login**: Enter name and get automatically matched with opponents
3. **Gameplay**: Play tic tac toe with real-time updates
4. **Multiple Games**: Open multiple browser tabs to test concurrent games
5. **Timer Controls**: Test pause/resume, game state changes

For detailed implementation information, see [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)

## Docker Commands

### Quick Restart

If you encounter connection issues, use the restart script:

```bash
./restart-infrastructure.sh
```

This will cleanly stop everything, remove the network, and restart fresh.

### View Running Containers

```bash
# All containers
docker ps

# RDS containers
docker ps | grep rds

# EC2 containers
docker ps | grep ec2
```

### View Logs

```bash
# RDS logs
docker-compose -f docker-compose.rds.yml logs -f

# EC2 logs
docker-compose -f docker-compose.ec2.yml logs -f

# Specific service logs
docker-compose -f docker-compose.ec2.yml logs -f nextjs-app
docker-compose -f docker-compose.ec2.yml logs -f redis
```

### Stop Services

```bash
# Stop EC2 services
docker-compose -f docker-compose.ec2.yml down

# Stop RDS services
docker-compose -f docker-compose.rds.yml down

# Stop all and remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.ec2.yml down -v
docker-compose -f docker-compose.rds.yml down -v
```

### Rebuild After Code Changes

```bash
docker-compose -f docker-compose.ec2.yml up --build
```

## Local Development (Without Docker)

If you want to develop without Docker:

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL and Redis locally (via Docker or native installation)

3. Update `.env`:

```env
DATABASE_URL="postgresql://gameserver:gameserver_password@localhost:5432/multiplayer_game?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
```

4. Run migrations:

```bash
npx prisma migrate dev
```

5. Start development server:

```bash
npm run dev
```

## Project Structure

```
.
├── src/
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── redis.ts           # Redis client configuration
│   │   ├── redis-keys.ts      # Redis key patterns & pub/sub channels
│   │   ├── redis-repository.ts # Type-safe Redis operations with Zod
│   │   ├── socket-events.ts   # Socket.io event name constants
│   │   ├── socket.ts          # Socket.io server with game logic
│   │   └── game-logic.ts      # Tic tac toe game logic
│   └── pages/
│       ├── api/
│       │   ├── health.ts      # PostgreSQL health check
│       │   ├── redis-test.ts  # Redis health check
│       │   ├── socket.ts      # Socket.io initialization
│       │   └── settings.ts    # Game settings API
│       ├── _app.tsx
│       ├── _document.tsx
│       ├── index.tsx          # User game page
│       └── admin.tsx          # Admin dashboard
├── prisma/
│   ├── schema.prisma          # Database schema (with GameSettings)
│   └── migrations/            # Database migrations
├── TESTING.md                 # Comprehensive testing guide
├── IMPLEMENTATION-SUMMARY.md  # Implementation documentation
├── Dockerfile
├── docker-compose.ec2.yml
├── docker-compose.rds.yml
└── package.json
```

## Technical Details

### Networking Architecture

- **Shared Network**: Both RDS and EC2 services connect via `multiplayer-network` bridge
- **Internal Network**: EC2 services (Next.js + Redis) share `ec2-network`
- **Container Communication**: PostgreSQL accessible via container name `multiplayer-rds-postgres`
- **AWS Simulation**: This setup simulates VPC peering between EC2 and RDS in AWS

### Key Technologies

- **Production Build**: Next.js standalone output for optimized Docker images
- **Redis Adapter**: Socket.io uses Redis adapter for horizontal scaling capability
- **Prisma ORM**: Type-safe database queries with auto-generated client
- **TypeScript**: Full type safety across frontend and backend
- **Docker Base**: Debian-slim for Prisma compatibility and stability

## API Endpoints

- `GET /api/health` - PostgreSQL connection test
- `GET /api/redis-test` - Redis connection test
- `GET /api/socket` - Initialize Socket.io server
- `GET /api/settings` - Get game settings (backgroundColor, headingText)
- `POST /api/settings` - Update game settings

## Database Schema

The project includes the following models:

```prisma
model ConnectionTest {
  id        String   @id @default(uuid())
  message   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model GameSettings {
  id              String   @id @default("default")
  backgroundColor String   @default("#0f172a")
  headingText     String   @default("Tic Tac Toe")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

Game state (active games, users, timer) is managed in Redis for real-time performance.

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: Redis hostname
- `REDIS_PORT`: Redis port
- `NODE_ENV`: Environment (production/development)

## Troubleshooting

### PostgreSQL Connection Issues

1. Ensure RDS container is running:
   ```bash
   docker-compose -f docker-compose.rds.yml ps
   ```

2. Check PostgreSQL logs:
   ```bash
   docker-compose -f docker-compose.rds.yml logs postgres
   ```

3. Verify port 5432 is not in use by another process

### Redis Connection Issues

1. Check Redis container status:
   ```bash
   docker-compose -f docker-compose.ec2.yml ps redis
   ```

2. View Redis logs:
   ```bash
   docker-compose -f docker-compose.ec2.yml logs redis
   ```

### Next.js Build Issues

1. Clear Docker build cache:
   ```bash
   docker-compose -f docker-compose.ec2.yml build --no-cache
   ```

2. Remove node_modules and rebuild:
   ```bash
   rm -rf node_modules
   docker-compose -f docker-compose.ec2.yml up --build
   ```

## Features Implemented

✅ **Type-Safe Redis Operations**: Zod schemas validate all Redis data
✅ **No Magic Strings**: All events and channels use named constants
✅ **Redis Pub/Sub**: Cross-server communication for scalability
✅ **Socket.io Rooms**: Efficient targeted broadcasts
✅ **Real-time Multiplayer**: Tic tac toe gameplay with live updates
✅ **Admin Dashboard**: Game settings, timer controls, live games list
✅ **Automatic Matchmaking**: Players paired automatically
✅ **Game Logic**: Win/draw detection, turn validation
✅ **User Persistence**: localStorage for session continuity
✅ **PostgreSQL Integration**: Settings storage with Prisma ORM

## Future Enhancements

1. Add authentication for admin page
2. Store game history in PostgreSQL
3. Create leaderboard with player rankings
4. Add game rooms/lobbies
5. Implement chat functionality
6. Add sound effects and animations
7. Mobile-responsive design improvements
8. Unit and integration tests

## License

MIT

