#!/bin/bash

# Multiplayer Game Server - Infrastructure Shutdown Script

echo "🛑 Stopping Multiplayer Game Server Infrastructure..."
echo ""

echo "📦 Stopping EC2 (Next.js + Redis)..."
docker-compose -f docker-compose.ec2.yml down

echo ""
echo "📦 Stopping RDS (PostgreSQL)..."
docker-compose -f docker-compose.rds.yml down

echo ""
echo "✅ Infrastructure stopped successfully!"
echo ""
echo "💡 To remove all data volumes, run:"
echo "   docker-compose -f docker-compose.ec2.yml down -v"
echo "   docker-compose -f docker-compose.rds.yml down -v"

