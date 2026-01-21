# CreaBomber Deployment Guide

## Production Deployment with Coolify

### Prerequisites

- VPS with Coolify installed (suimation.de)
- DNS A-Record: `bomber.suimation.de` -> VPS IP
- Supabase instance for Scheduled Messages

### 1. DNS Configuration

Create an A-Record pointing to your VPS:

```
Type: A
Name: bomber
Value: [VPS-IP-ADDRESS]
TTL: 3600
```

### 2. Coolify Setup

1. **Create New Resource**
   - Type: Docker Compose
   - Repository: Connect your Git repo
   - Branch: main
   - Build Pack: Docker Compose

2. **Environment Variables** (in Coolify)
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://supabase-new.suimation.de
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   SUPABASE_URL=https://supabase-new.suimation.de
   SUPABASE_ANON_KEY=[your-anon-key]
   ```

3. **Domain Configuration**
   - Domain: `bomber.suimation.de`
   - SSL: Auto (Let's Encrypt)

4. **Volumes**
   - Ensure `creabomber-data` volume is created for SQLite persistence

### 3. Deploy

Click "Deploy" in Coolify. The build process will:
1. Build the Docker image (multi-stage)
2. Run Next.js build
3. Start PM2 with the production config

### 4. Verify Deployment

```bash
# Health check
curl https://bomber.suimation.de/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": ...,
  "database": { "status": "connected", "devices": { "total": X, "online": Y } }
}
```

### 5. WebSocket Configuration

The server supports WebSocket connections for real-time communication.
Ensure your reverse proxy (Caddy/Traefik) supports WebSocket upgrades:

- Connection: Upgrade
- Upgrade: websocket

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Access dashboard
open http://localhost:3000
```

---

## Client Configuration

The Electron client connects to:
- **Development:** `http://localhost:3000`
- **Production:** `https://bomber.suimation.de`

This is controlled by `NODE_ENV` in `client/src/main/socket.ts`.

### Building Clients for Distribution

```bash
cd client

# Build for macOS
npm run build

# The DMG will be in client/dist/
```

---

## Supabase Setup (Scheduled Messages)

1. Run the migration in Supabase SQL Editor:
   - File: `supabase/migrations/001_scheduled_messages.sql`

2. Configure RLS (already done in migration):
   - Allows all operations for anon users (internal tool)

---

## Troubleshooting

### Container won't start
- Check logs: `docker logs creabomber`
- Verify health endpoint: `curl localhost:3000/api/health`

### WebSocket not connecting
- Check CORS configuration in `server.ts`
- Verify reverse proxy WebSocket support

### Database errors
- Ensure volume is mounted: `/app/data`
- Check file permissions in container

---

## Architecture

```
Internet (HTTPS/WSS :443)
         |
    Caddy/Traefik (Auto-SSL)
         |
   Docker Container
         |
      PM2 Runtime
         |
    Crea-Bomber
    - Next.js Dashboard
    - Socket.io Server
    - SQLite Database
```

---

## Ports

| Service | Port | Description |
|---------|------|-------------|
| HTTP/WS | 3000 | Main application |
| Health  | 3000/api/health | Health check endpoint |
