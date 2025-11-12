# Fixes Applied - Database Connection Issue

## Problem
The Next.js container couldn't connect to PostgreSQL with error:
```
Error: P1010: User was denied access on the database `(not available)`
```

## Root Cause
The `host.docker.internal` hostname doesn't work reliably across all systems when using separate Docker Compose files. This is a common issue when trying to connect containers across different compose stacks.

## Solution Applied

### 1. Created Shared Docker Network
Both `docker-compose.rds.yml` and `docker-compose.ec2.yml` now use a shared network called `multiplayer-network`. This allows containers from different compose files to communicate directly.

**docker-compose.rds.yml** now creates the network:
```yaml
networks:
  multiplayer-network:
    name: multiplayer-network
    driver: bridge
```

**docker-compose.ec2.yml** connects to it as external:
```yaml
networks:
  ec2-network:
    driver: bridge
  multiplayer-network:
    name: multiplayer-network
    external: true
```

### 2. Updated Database Connection String
Changed from:
```
DATABASE_URL=postgresql://gameserver:gameserver_password@host.docker.internal:5432/multiplayer_game
```

To:
```
DATABASE_URL=postgresql://gameserver:gameserver_password@multiplayer-rds-postgres:5432/multiplayer_game
```

Now the Next.js app connects directly to the PostgreSQL container using its container name.

### 3. Added Restart Script
Created `restart-infrastructure.sh` for easy clean restarts when encountering issues.

## How to Use

### Fresh Start (Recommended)

Stop any running containers and start fresh:

```bash
./restart-infrastructure.sh
```

This script will:
1. Stop all containers
2. Remove the old network
3. Start RDS (creates new network)
4. Start EC2 (connects to network)

### Manual Steps

If you prefer manual control:

```bash
# 1. Stop everything
docker-compose -f docker-compose.ec2.yml down
docker-compose -f docker-compose.rds.yml down

# 2. Remove old network (if it exists)
docker network rm multiplayer-network 2>/dev/null || true

# 3. Start RDS first (creates network)
docker-compose -f docker-compose.rds.yml up -d

# 4. Wait a few seconds for PostgreSQL to be ready
sleep 5

# 5. Start EC2 (joins network)
docker-compose -f docker-compose.ec2.yml up --build
```

## Verification

Once running, check:

1. **Network exists:**
   ```bash
   docker network ls | grep multiplayer
   ```

2. **Both containers are on the network:**
   ```bash
   docker network inspect multiplayer-network
   ```

3. **PostgreSQL is reachable:**
   ```bash
   docker exec multiplayer-ec2-nextjs ping -c 2 multiplayer-rds-postgres
   ```

4. **Web dashboard shows all green:**
   Open http://localhost:3000 and verify:
   - ✅ PostgreSQL connection
   - ✅ Redis connection
   - ✅ Socket.io connection

## Architecture Benefits

This approach better simulates real AWS architecture:

- **RDS (PostgreSQL)**: Separate service with its own lifecycle
- **EC2 (Next.js + Redis)**: Application stack that connects to RDS
- **VPC Peering**: The shared Docker network simulates VPC peering or direct connection
- **Service Discovery**: Using container names simulates AWS service discovery

## Files Modified

1. `docker-compose.rds.yml` - Added shared network creation
2. `docker-compose.ec2.yml` - Connected to external network, updated DB URL
3. `env.example` - Updated connection string template
4. `restart-infrastructure.sh` - New script for clean restarts
5. `QUICK-START.md` - Added troubleshooting steps
6. `README.md` - Updated with networking details

## Next Steps

Now that the infrastructure is working:

1. Verify all connections at http://localhost:3000
2. Test the API endpoints manually if desired
3. Ready to implement game logic in the next phase!

