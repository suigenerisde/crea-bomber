---
type: reference
title: Troubleshooting Guide
created: 2025-01-07
tags:
  - troubleshooting
  - debugging
  - support
related:
  - "[[README]]"
  - "[[SETUP]]"
  - "[[CLIENT]]"
---

# Troubleshooting Guide

Common issues and solutions for CreaBomber.

## Quick Diagnostics

### Check Server Status

```bash
# Is server running?
npm run pm2:status

# View recent logs
npm run pm2:logs --lines 50

# Check port binding
lsof -i :3000
```

### Check Client Status

- Tray icon color indicates connection state
- Gray = Disconnected
- Yellow = Connecting
- Green = Connected
- Red = Error

---

## Server Issues

### Server Won't Start

**Symptom**: Server fails to start, port binding error

**Solutions**:

1. Check if port is in use:
   ```bash
   lsof -i :3000
   ```

2. Kill existing process:
   ```bash
   pm2 stop creabomber
   pm2 delete creabomber
   ```

3. Try different port:
   ```bash
   PORT=3001 npm run start:prod
   ```

---

### Database Errors

**Symptom**: "SQLITE_ERROR" or "database is locked"

**Solutions**:

1. Check data directory exists:
   ```bash
   ls -la data/
   ```

2. Check file permissions:
   ```bash
   chmod 644 data/creabomber.db
   ```

3. Remove and recreate (loses data):
   ```bash
   rm data/creabomber.db
   npm run dev  # Recreates on startup
   ```

---

### WebSocket Connection Refused

**Symptom**: Clients can't connect via WebSocket

**Solutions**:

1. Check CORS configuration in `.env`:
   ```bash
   # Include client origins
   CORS_ORIGINS=http://192.168.1.100:3000,http://localhost:3000
   ```

2. Include WebSocket origins:
   ```bash
   CORS_ORIGINS=http://192.168.1.100:3000,ws://192.168.1.100:3000
   ```

3. Verify hostname binding:
   ```bash
   HOSTNAME=0.0.0.0  # Accept from any interface
   ```

---

### Dashboard Not Loading

**Symptom**: Browser shows error or blank page

**Solutions**:

1. Check if build is complete:
   ```bash
   npm run build
   ```

2. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run build
   ```

3. Check for build errors in logs

---

## Client Issues

### Client Can't Connect

**Symptom**: Tray icon stays gray/red, won't connect

**Solutions**:

1. **Verify server URL format**:
   - Must include protocol: `http://`
   - Must include port: `:3000`
   - Example: `http://192.168.1.100:3000`

2. **Check server is accessible**:
   ```bash
   curl http://<server-ip>:3000/api/devices
   ```

3. **Verify CORS settings** (server side):
   - Client's origin must be in `CORS_ORIGINS`

4. **Check firewall** on server machine

---

### Notifications Not Appearing

**Symptom**: Client connected but notifications don't show

**Solutions**:

1. **Check message targets**: Ensure your device ID is in target list

2. **Check macOS notification permissions**:
   - System Preferences > Notifications
   - Ensure CreaBomber isn't blocked

3. **Verify device registration**:
   - Check dashboard for your device
   - Device should show as "online"

4. **Test with broadcast**: Target "all devices" to confirm

---

### Connection Keeps Dropping

**Symptom**: Client repeatedly disconnects/reconnects

**Solutions**:

1. **Check network stability**: WiFi interference, router issues

2. **Adjust timeout settings** (server):
   ```bash
   OFFLINE_TIMEOUT=60000  # Increase to 60 seconds
   ```

3. **Check server logs** for errors:
   ```bash
   npm run pm2:logs
   ```

---

### Client Won't Launch (macOS Security)

**Symptom**: "App is damaged" or "can't be opened"

**Solutions**:

1. **First launch override**:
   - Right-click app > Open > Open

2. **Remove quarantine flag**:
   ```bash
   xattr -d com.apple.quarantine /Applications/CreaBomber.app
   ```

3. **System Preferences**:
   - Security & Privacy > General > "Open Anyway"

---

### Reset Client Configuration

```bash
rm ~/Library/Application\ Support/creabomber-client/config.json
```

Then relaunch the app to reconfigure.

---

## Network Issues

### Firewall Blocking Connections

**macOS Server**:
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
```

**Linux Server (ufw)**:
```bash
sudo ufw allow 3000/tcp
```

**Linux Server (firewalld)**:
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

---

### Testing Network Connectivity

From client machine:

```bash
# Test HTTP
curl http://<server-ip>:3000/api/devices

# Test WebSocket (requires wscat)
npx wscat -c ws://<server-ip>:3000
```

---

## Performance Issues

### Messages Delayed

**Solutions**:

1. Check server resources:
   ```bash
   pm2 monit
   ```

2. Check database size:
   ```bash
   ls -lh data/creabomber.db
   ```

3. Clean old messages if needed (direct SQLite):
   ```bash
   sqlite3 data/creabomber.db "DELETE FROM messages WHERE created_at < strftime('%s', 'now', '-30 days') * 1000;"
   ```

---

### High Memory Usage

**Solutions**:

1. Check PM2 memory limits in `ecosystem.config.js`

2. Restart server:
   ```bash
   npm run pm2:restart
   ```

3. Monitor with PM2:
   ```bash
   pm2 monit
   ```

---

## Log Analysis

### View Server Logs

```bash
# Live logs
npm run pm2:logs

# Recent logs
npm run pm2:logs --lines 100

# Log files location
ls logs/
```

### Common Log Messages

| Message | Meaning |
|---------|---------|
| "Device connected" | Client successfully registered |
| "Device disconnected" | Client went offline |
| "Message sent to X devices" | Broadcast completed |
| "CORS blocked" | Origin not in allowed list |
| "EADDRINUSE" | Port already in use |

---

## Complete Reset

If all else fails, complete reset:

### Server

```bash
# Stop server
npm run pm2:stop
pm2 delete creabomber

# Clean build and data
rm -rf .next node_modules data/

# Fresh install
npm install
npm run build
npm run pm2:start
```

### Client

```bash
# Remove app and config
rm -rf /Applications/CreaBomber.app
rm ~/Library/Application\ Support/creabomber-client/

# Reinstall from DMG
```

---

## Getting Help

If issues persist:

1. Collect server logs: `npm run pm2:logs --lines 500 > debug.log`
2. Note client tray icon color
3. Check browser console for dashboard errors
4. Document the exact error message
5. Note when the issue started (after update, config change, etc.)
