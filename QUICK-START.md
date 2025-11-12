# Quick Start Guide

## 🚀 Start Everything (Easy Way)

First, install dependencies (only needed once):

```bash
npm install
```

Then start the infrastructure:

```bash
./start-infrastructure.sh
```

Then open: http://localhost:3000

## 🛑 Stop Everything

```bash
./stop-infrastructure.sh
```

## 🔄 Restart Everything (Clean Restart)

If you encounter connection issues or after code changes:

```bash
./restart-infrastructure.sh
```

This will clean up networks and restart all services fresh.

**Note:** After updating Dockerfile or Prisma schema, the containers will automatically rebuild.

## 📋 Manual Commands

### Start RDS (PostgreSQL) First

```bash
docker-compose -f docker-compose.rds.yml up -d
```

### Start EC2 (Next.js + Redis)

```bash
docker-compose -f docker-compose.ec2.yml up --build
```

### Stop Services

```bash
# Stop EC2
docker-compose -f docker-compose.ec2.yml down

# Stop RDS
docker-compose -f docker-compose.rds.yml down
```

## 🔍 View Logs

```bash
# All EC2 logs
docker-compose -f docker-compose.ec2.yml logs -f

# Next.js logs only
docker-compose -f docker-compose.ec2.yml logs -f nextjs-app

# Redis logs only
docker-compose -f docker-compose.ec2.yml logs -f redis

# PostgreSQL logs
docker-compose -f docker-compose.rds.yml logs -f postgres
```

## 🔄 Rebuild After Code Changes

```bash
docker-compose -f docker-compose.ec2.yml up --build
```

## 🧹 Clean Everything (Remove All Data)

```bash
docker-compose -f docker-compose.ec2.yml down -v
docker-compose -f docker-compose.rds.yml down -v
```

## 🧪 Test Connections

Once running, the dashboard at http://localhost:3000 will show:

- ✅ PostgreSQL connection status
- ✅ Redis connection status
- ✅ Socket.io WebSocket status

Use the "Refresh" buttons to re-test connections.

## 📁 Project Structure

```
📦 multiplayer-game-server-js
├── 🐳 docker-compose.rds.yml    # PostgreSQL (RDS simulation)
├── 🐳 docker-compose.ec2.yml    # Next.js + Redis (EC2 simulation)
├── 🐳 Dockerfile                # Next.js production build
├── 📝 src/
│   ├── lib/                     # Prisma, Redis, Socket.io clients
│   └── pages/
│       ├── api/                 # API endpoints
│       └── index.tsx            # Dashboard UI
├── 🗄️ prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Database migrations
└── 📖 README.md                 # Full documentation
```

## 🆘 Troubleshooting

### Port Already in Use

If port 3000, 5432, or 6379 is already in use:

```bash
# Find process using port
lsof -i :3000
lsof -i :5432
lsof -i :6379

# Kill process if needed
kill -9 <PID>
```

### Database Connection Failed

**First, try a clean restart:**
```bash
./restart-infrastructure.sh
```

**If that doesn't work:**

1. Ensure PostgreSQL is running and healthy:
   ```bash
   docker ps | grep postgres
   ```

2. Check logs:
   ```bash
   docker logs multiplayer-rds-postgres
   ```

3. Verify the shared network exists:
   ```bash
   docker network ls | grep multiplayer
   ```

### Redis Connection Failed

1. Ensure Redis is running:
   ```bash
   docker ps | grep redis
   ```

2. Check logs:
   ```bash
   docker logs multiplayer-ec2-redis
   ```

### Network Issues

If containers can't communicate, recreate the network:

```bash
# Stop everything
docker-compose -f docker-compose.ec2.yml down
docker-compose -f docker-compose.rds.yml down

# Remove the network
docker network rm multiplayer-network

# Start fresh
./start-infrastructure.sh
```

### Complete Reset (Nuclear Option)

```bash
# Stop everything and remove all data
docker-compose -f docker-compose.ec2.yml down -v
docker-compose -f docker-compose.rds.yml down -v

# Remove network
docker network rm multiplayer-network

# Remove images
docker-compose -f docker-compose.ec2.yml build --no-cache

# Start fresh
./start-infrastructure.sh
```

