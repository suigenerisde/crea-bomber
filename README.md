# CreaBomber

Internal notification system for sending rich messages to Mac display devices. Supports text, images, videos, and audio with real-time delivery tracking.

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Run development server (includes Next.js + Socket.io)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard.

## Production Deployment

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or PM2 for process management
- Firewall access to configured port (default: 3000)

### 1. Environment Setup

```bash
# Copy example configuration
cp .env.example .env

# Edit configuration for your network
nano .env
```

Key settings to configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `HOSTNAME` | 0.0.0.0 | Bind address (0.0.0.0 for network access) |
| `CORS_ORIGINS` | localhost | Comma-separated client origins |
| `DATABASE_PATH` | ./data/creabomber.db | SQLite database location |

### 2. Configure CORS Origins

**Critical for client connections.** Add all origins that will connect:

```bash
# Example for internal network
CORS_ORIGINS=http://localhost:3000,http://192.168.1.100:3000,http://server.local:3000
```

Include both:
- Server's IP address
- Server's hostname (if using .local or custom DNS)
- localhost for local testing

### 3. Build & Run

#### Option A: Direct (foreground)

```bash
npm run build
npm run start:prod
```

#### Option B: PM2 (recommended for production)

```bash
# Install PM2 globally
npm install -g pm2

# Start server as daemon
npm run pm2:start

# View logs
npm run pm2:logs

# Check status
npm run pm2:status

# Setup auto-start on system boot
pm2 startup    # Follow the printed instructions
pm2 save
```

### 4. Firewall Configuration

Ensure the server port is accessible on your internal network:

**macOS:**
```bash
# Allow incoming connections on port 3000
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
```

**Linux (ufw):**
```bash
sudo ufw allow 3000/tcp
```

**Linux (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 5. Verify Deployment

1. Access dashboard: `http://<server-ip>:3000`
2. Check server logs: `npm run pm2:logs`
3. Test from client device:
   ```bash
   curl http://<server-ip>:3000/api/devices
   ```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      CreaBomber Server                       │
│                    (Node.js + Next.js)                       │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │  Next.js        │    │  Socket.io       │                │
│  │  (Dashboard)    │    │  (Real-time)     │                │
│  │  Port :3000     │    │  Port :3000      │                │
│  └────────┬────────┘    └────────┬─────────┘                │
│           │                      │                           │
│           └──────────┬───────────┘                           │
│                      │                                       │
│              ┌───────▼───────┐                               │
│              │  SQLite DB    │                               │
│              │  (better-sqlite3)                             │
│              └───────────────┘                               │
└──────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Mac Client │ │  Mac Client │ │  Mac Client │
    │  (Electron) │ │  (Electron) │ │  (Electron) │
    └─────────────┘ └─────────────┘ └─────────────┘
```

## PM2 Commands Reference

| Command | Description |
|---------|-------------|
| `npm run pm2:start` | Start server with PM2 |
| `npm run pm2:stop` | Stop server |
| `npm run pm2:restart` | Restart server |
| `npm run pm2:logs` | View live logs |
| `npm run pm2:status` | Show process status |
| `pm2 monit` | Real-time monitoring dashboard |
| `pm2 save` | Save process list for startup |

## Troubleshooting

### Client can't connect

1. **Check CORS origins:** Ensure client's origin is in `CORS_ORIGINS`
2. **Check firewall:** Port must be accessible
3. **Check binding:** Use `HOSTNAME=0.0.0.0` for network access
4. **Check logs:** `npm run pm2:logs`

### WebSocket connection refused

Add both HTTP and WebSocket origins:
```bash
CORS_ORIGINS=http://192.168.1.100:3000,ws://192.168.1.100:3000
```

### Database errors

```bash
# Ensure data directory exists
mkdir -p data

# Check database file permissions
ls -la data/
```

### Server won't start

```bash
# Check if port is in use
lsof -i :3000

# Kill existing process if needed
pm2 stop creabomber
pm2 delete creabomber

# Try fresh start
npm run pm2:start
```

## Project Structure

```
crea-bomber/
├── src/
│   ├── app/           # Next.js pages
│   ├── components/    # React components
│   ├── hooks/         # Custom hooks
│   ├── lib/           # Core utilities (db, socket-server)
│   └── types/         # TypeScript types
├── client/            # Electron Mac client
├── data/              # SQLite database
├── logs/              # PM2 log files
├── server.ts          # Custom server entry
├── ecosystem.config.js # PM2 configuration
└── .env.example       # Environment template
```

## License

Internal use only.
