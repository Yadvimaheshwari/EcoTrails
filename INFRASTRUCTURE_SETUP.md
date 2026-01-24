# Infrastructure Setup Guide

This guide covers setting up the production infrastructure for EcoAtlas, including PostgreSQL and Redis.

## Overview

EcoAtlas supports two modes:
- **Development**: SQLite database + in-memory storage (no setup required)
- **Production**: PostgreSQL database + Redis (requires setup)

The system automatically falls back to development mode if production services are not available.

## Quick Start (Development)

No setup required! The app works out of the box with SQLite and in-memory storage.

```bash
# Just start the backend
./start_backend.sh
```

## Production Setup

### 1. PostgreSQL Database

#### Installation

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Docker:**
```bash
docker run --name ecoatlas-postgres \
  -e POSTGRES_USER=ecoatlas \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=ecoatlas \
  -p 5432:5432 \
  -d postgres:15
```

#### Database Setup

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE ecoatlas;
CREATE USER ecoatlas_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ecoatlas TO ecoatlas_user;
\q
```

#### Configuration

Update your `.env` file:
```bash
DATABASE_URL=postgresql://ecoatlas_user:your_secure_password@localhost:5432/ecoatlas
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
```

#### Initialize Database

The database tables will be created automatically on first run, or you can initialize manually:

```bash
python3 -c "import sys; sys.path.insert(0, '.'); from backend.database import init_db; init_db()"
```

### 2. Redis (Optional)

Redis is **optional**. The app works fine without it, using in-memory storage. Redis is recommended for:
- Production deployments
- Multiple server instances
- Persistent message queuing
- Caching

#### Installation

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Docker:**
```bash
docker run --name ecoatlas-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

#### Configuration

Update your `.env` file:
```bash
REDIS_URL=redis://localhost:6379
```

#### Verification

Test Redis connection:
```bash
redis-cli ping
# Should return: PONG
```

### 3. Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Required
API_KEY=your_gemini_api_key

# Database (Production)
DATABASE_URL=postgresql://user:password@localhost:5432/ecoatlas

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Mobile App (for physical devices)
DEVICE_IP=10.0.0.143  # Your computer's local IP
```

## Verification

### Check Database Connection

```bash
python3 -c "
import os
os.environ['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/ecoatlas'
from backend.database import engine
print('Database connected:', engine.url)
"
```

### Check Redis Connection

```bash
python3 -c "
from backend.redis_client import redis_client
print('Redis available:', redis_client.use_redis)
print('Test set/get:', redis_client.set('test', 'value'))
print('Test value:', redis_client.get('test'))
"
```

## Architecture

### Development Mode (Default)
```
┌─────────────┐
│   FastAPI   │
│   Backend   │
└──────┬──────┘
       │
       ├──> SQLite Database
       └──> In-Memory Storage
```

### Production Mode
```
┌─────────────┐
│   FastAPI   │
│   Backend   │
└──────┬──────┘
       │
       ├──> PostgreSQL Database
       └──> Redis (Message Queue + Cache)
```

## Features

### Database Features
- ✅ Automatic SQLite → PostgreSQL switching
- ✅ Connection pooling for PostgreSQL
- ✅ Connection health checks
- ✅ Automatic table creation
- ✅ Migration support (Alembic)

### Redis Features
- ✅ Automatic fallback to in-memory storage
- ✅ Message queuing for wearable alerts
- ✅ Caching support
- ✅ TTL (time-to-live) support
- ✅ Graceful degradation

## Troubleshooting

### PostgreSQL Connection Issues

**Error: "connection refused"**
- Check if PostgreSQL is running: `brew services list` or `sudo systemctl status postgresql`
- Verify connection string in `.env`
- Check firewall settings

**Error: "authentication failed"**
- Verify username and password in `DATABASE_URL`
- Check PostgreSQL user permissions

### Redis Connection Issues

**Error: "Redis not available"**
- This is OK! The app will use in-memory storage
- To enable Redis: Install Redis and set `REDIS_URL` in `.env`

**Error: "Connection timeout"**
- Check if Redis is running: `redis-cli ping`
- Verify `REDIS_URL` in `.env`
- Check firewall settings

## Production Deployment

For production deployment, consider:

1. **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
2. **Redis**: Use managed Redis (AWS ElastiCache, Google Cloud Memorystore, etc.)
3. **Environment Variables**: Use secrets management (AWS Secrets Manager, etc.)
4. **Monitoring**: Set up database and Redis monitoring
5. **Backups**: Configure automated database backups
6. **Scaling**: Use connection pooling and read replicas

## Next Steps

1. Set up PostgreSQL database
2. (Optional) Set up Redis
3. Configure `.env` file
4. Test connections
5. Deploy to production

For more details, see:
- `PRODUCTION_SETUP.md` - Complete production setup
- `README_PRODUCTION.md` - Production architecture overview
