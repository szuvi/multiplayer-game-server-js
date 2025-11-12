# Prisma OpenSSL Compatibility Fix

## Problem
Prisma Client was failing with error:
```
Unable to require(`/app/node_modules/.prisma/client/libquery_engine-linux-musl-arm64-openssl-1.1.x.so.node`).
Details: Error loading shared library libssl.so.1.1: No such file or directory
```

Then when trying to install `openssl1.1-compat`:
```
ERROR: unable to select packages:
  openssl1.1-compat (no such package)
```

## Root Cause
1. Alpine Linux 3.21 removed the `openssl1.1-compat` package
2. Prisma has known compatibility issues with Alpine Linux and musl libc
3. Alpine's package management doesn't support older OpenSSL versions in newer releases

## Solution Applied

### Switched from Alpine to Debian

Changed base image from `node:18-alpine` to `node:18-slim` (Debian-based).

**Why Debian?**
- ✅ Full compatibility with Prisma out of the box
- ✅ Uses glibc instead of musl (better compatibility)
- ✅ No OpenSSL version conflicts
- ✅ More stable for production workloads
- ⚠️ Slightly larger image (~50MB more)

### 1. Updated Dockerfile
Changed from Alpine packages to Debian packages:

```dockerfile
FROM node:18-slim AS base

# Install OpenSSL and CA certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
```

### 2. Updated Prisma Schema
Changed binary target to Debian:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

This works for both ARM64 (Apple Silicon) and x86_64 (Intel/AMD) architectures.

## How to Apply the Fix

### Stop and Rebuild Everything

```bash
# Stop all containers
docker-compose -f docker-compose.ec2.yml down
docker-compose -f docker-compose.rds.yml down

# Start RDS
docker-compose -f docker-compose.rds.yml up -d

# Rebuild and start EC2 (force rebuild to apply changes)
docker-compose -f docker-compose.ec2.yml up --build --force-recreate
```

Or use the restart script:

```bash
./restart-infrastructure.sh
```

### Force Clean Rebuild (if issues persist)

```bash
# Stop everything
docker-compose -f docker-compose.ec2.yml down
docker-compose -f docker-compose.rds.yml down

# Remove old images
docker rmi multiplayer-game-server-js-nextjs-app

# Clear Docker build cache
docker builder prune -a

# Start fresh
docker-compose -f docker-compose.rds.yml up -d
docker-compose -f docker-compose.ec2.yml up --build
```

## Verification

Once the containers are rebuilt and running:

1. **Check logs for Prisma errors:**
   ```bash
   docker logs multiplayer-ec2-nextjs | grep -i prisma
   ```

2. **Visit the dashboard:**
   Open http://localhost:3000

3. **PostgreSQL status should show:**
   - ✅ Connected
   - Message: "PostgreSQL connection successful"

## Why This Works

Debian-based images use:
- **glibc** (GNU C Library) - Better compatibility with pre-built binaries
- **OpenSSL 3.0** - Modern, well-supported version
- **Standard Linux toolchain** - More predictable behavior

Prisma's engine binaries are primarily built and tested against Debian/Ubuntu (glibc-based systems), making this the most reliable choice for production deployments.

## Image Size Comparison

- **Alpine** (`node:18-alpine`): ~180 MB
- **Debian Slim** (`node:18-slim`): ~230 MB
- **Trade-off**: +50 MB for guaranteed compatibility ✅

For a production application, the 50 MB difference is negligible compared to the stability and compatibility benefits.

## Alternative Solutions (Not Recommended)

### Use older Alpine version
You could pin to Alpine 3.19 which still has openssl1.1-compat:

```dockerfile
FROM node:18-alpine3.19 AS base
```

**Downside**: Using outdated base images for security updates.

### Use Prisma Data Proxy
Set up Prisma Data Proxy (requires Prisma Cloud account) to avoid bundling engine binaries.

**Downside**: Additional dependency and potential latency.

## Files Modified

1. `Dockerfile` - Switched from Alpine to Debian-slim with proper OpenSSL
2. `prisma/schema.prisma` - Updated binaryTargets for Debian
3. `PRISMA-OPENSSL-FIX.md` - This documentation

## Related Issues

- [Prisma + Alpine Linux OpenSSL](https://github.com/prisma/prisma/issues/861)
- [Prisma Docker Best Practices](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)

