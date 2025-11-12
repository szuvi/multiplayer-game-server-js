#!/bin/bash

# Multiplayer Game Server - Infrastructure Startup Script

echo "🚀 Starting Multiplayer Game Server Infrastructure..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error: npm install failed. Please run 'npm install' manually."
        exit 1
    fi
    echo "✅ Dependencies installed successfully!"
    echo ""
fi

echo "📦 Step 1: Starting RDS (PostgreSQL)..."
docker-compose -f docker-compose.rds.yml up -d

# Wait for PostgreSQL to be healthy
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is healthy
if docker-compose -f docker-compose.rds.yml ps | grep -q "healthy"; then
    echo "✅ PostgreSQL is ready!"
else
    echo "⚠️  PostgreSQL may still be starting up..."
fi

echo ""
echo "📦 Step 2: Starting EC2 (Next.js + Redis)..."
docker-compose -f docker-compose.ec2.yml up --build

echo ""
echo "🎮 Infrastructure started successfully!"
echo "🌐 Access the dashboard at: http://localhost:3000"

