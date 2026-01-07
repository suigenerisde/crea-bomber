---
type: reference
title: Server Setup Guide
created: 2025-01-07
tags:
  - setup
  - deployment
  - server
related:
  - "[[README]]"
  - "[[CLIENT]]"
  - "[[TROUBLESHOOTING]]"
---

# Server Setup Guide

Complete guide for installing and running the CreaBomber server.

## Prerequisites

- **Node.js**: 18+ (LTS recommended)
- **npm**: Included with Node.js
- **PM2**: For production deployment (optional)
- **Network**: Firewall access to configured port

## Quick Start (Development)

```bash
# Clone and navigate to project
cd crea-bomber

# Install dependencies
npm install

# Run development server
npm run dev
```

Open `http://localhost:3000` for the dashboard.

## Production Deployment

### Step 1: Environment Configuration

```bash
# Copy example configuration
cp .env.example .env

# Edit for your environment
nano .env
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port (HTTP/WebSocket) |
| `HOSTNAME` | 0.0.0.0 | Bind address |
| `NODE_ENV` | production | Environment mode |
| `DATABASE_PATH` | ./data/creabomber.db | SQLite file location |
| `CORS_ORIGINS` | localhost | Allowed client origins |
| `LOG_LEVEL` | info | Logging verbosity |
| `OFFLINE_TIMEOUT` | 30000 | Device offline threshold (ms) |

### Step 2: CORS Configuration

**Critical for client connections.** The `CORS_ORIGINS` variable must include all origins that will connect to the server.

```bash
# Example: Internal network deployment
CORS_ORIGINS=http://localhost:3000,http://192.168.1.100:3000,http://server.local:3000
```

Include:
- Server's IP address (how clients see it)
- Server's hostname (if using .local or custom DNS)
- localhost for local testing

### Step 3: Build

```bash
# Build Next.js for production
npm run build
```

### Step 4: Run

#### Option A: Direct (Foreground)

```bash
npm run start:prod
```

#### Option B: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start as daemon
npm run pm2:start

# View logs
npm run pm2:logs

# Check status
npm run pm2:status

# Enable auto-start on boot
pm2 startup    # Follow printed instructions
pm2 save
```

### PM2 Commands Reference

| Command | Description |
|---------|-------------|
| `npm run pm2:start` | Start server |
| `npm run pm2:stop` | Stop server |
| `npm run pm2:restart` | Restart server |
| `npm run pm2:logs` | View live logs |
| `npm run pm2:status` | Show process status |
| `pm2 monit` | Real-time monitoring |
| `pm2 save` | Save for startup |

## Firewall Configuration

Ensure the server port is accessible on your network.

### macOS

```bash
# Allow Node.js through firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
```

Or via System Preferences > Security & Privacy > Firewall > Firewall Options.

### Linux (ufw)

```bash
sudo ufw allow 3000/tcp
```

### Linux (firewalld)

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Verify Deployment

1. **Dashboard**: Open `http://<server-ip>:3000` in browser
2. **API Health**: `curl http://<server-ip>:3000/api/devices`
3. **Logs**: `npm run pm2:logs`

## Database Location

By default, the SQLite database is stored at `./data/creabomber.db`. To customize:

```bash
# In .env
DATABASE_PATH=/var/lib/creabomber/data.db
```

The directory is created automatically if it doesn't exist.

## Updating

```bash
# Pull latest changes
git pull

# Install any new dependencies
npm install

# Rebuild
npm run build

# Restart server
npm run pm2:restart
```

## Multiple Instances

For high availability, run multiple instances behind a load balancer. Note: Socket.io requires sticky sessions for proper WebSocket handling.

## Security Considerations

1. **Internal network only**: CreaBomber is designed for internal use
2. **No authentication**: Consider adding auth if exposing beyond LAN
3. **CORS restrictions**: Limit origins to known clients
4. **Database backups**: Periodically backup SQLite file

## Next Steps

- [[CLIENT]] - Install the Mac client
- [[API]] - API documentation for integrations
- [[TROUBLESHOOTING]] - Common issues and solutions
