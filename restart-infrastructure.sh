#!/bin/bash

# Multiplayer Game Server - Infrastructure Restart Script

echo "🔄 Restarting Multiplayer Game Server Infrastructure..."
echo ""

# Stop EC2 services
echo "📦 Stopping EC2 services..."
docker-compose -f docker-compose.ec2.yml down

# Stop RDS services
echo "📦 Stopping RDS services..."
docker-compose -f docker-compose.rds.yml down

# Remove the network to recreate it fresh
echo "🌐 Cleaning up network..."
docker network rm multiplayer-network 2>/dev/null || true

echo ""
echo "✅ Cleanup complete! Starting fresh..."
echo ""

# Start everything again
./start-infrastructure.sh

