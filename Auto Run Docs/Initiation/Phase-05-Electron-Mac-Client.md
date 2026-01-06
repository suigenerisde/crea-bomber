# Phase 05: Electron Mac Client

This phase creates the macOS client application that runs on target devices. The Electron app registers with the dashboard, maintains a WebSocket connection, and displays beautiful notification overlays when messages arrive. The creative overlay design goes beyond native macOS notifications with custom styling, animations, and full media support.

## Tasks

- [ ] Initialize Electron project structure in client/ subdirectory:
  - Create client/ folder in project root
  - Initialize with `npm init -y` in client/
  - Install Electron and build tools: `npm install electron electron-builder --save-dev`
  - Install runtime deps: `npm install socket.io-client electron-store uuid`
  - Create basic folder structure: client/src/main/, client/src/renderer/, client/src/preload/
  - Configure package.json with main entry, build config for macOS (dmg, zip)

- [ ] Create Electron main process in client/src/main/main.ts:
  - Create BrowserWindow for notification overlay (frameless, transparent, alwaysOnTop)
  - Configure window: resizable false, skipTaskbar true, visibleOnAllWorkspaces true
  - Position window in top-right corner of screen
  - Keep window hidden by default, show only when notification arrives
  - Auto-hide after configurable timeout (default 8 seconds for text, longer for media)
  - Implement showNotification(payload) function that populates window and shows it
  - Handle multiple notifications: queue system or stack

- [ ] Create device registration and WebSocket connection in client/src/main/socket.ts:
  - Generate or load persistent device ID using electron-store
  - Get device name from os.hostname() and os.platform()
  - Connect to dashboard WebSocket server on startup
  - Emit 'device:register' with device info
  - Implement heartbeat interval (every 30 seconds)
  - Handle reconnection on disconnect with exponential backoff
  - Listen for 'message:receive' events, trigger notification display
  - Expose connection status for system tray

- [ ] Create preload script in client/src/preload/preload.ts:
  - Expose safe IPC bridge using contextBridge
  - exposeInMainWorld: receiveNotification callback, getDeviceInfo, clearNotification
  - Type definitions for exposed API

- [ ] Create notification renderer HTML/CSS in client/src/renderer/:
  - notification.html: minimal HTML shell loading notification.css and notification.js
  - notification.css: matches NotificationPreview from web dashboard
    - Dark theme with glassmorphism effect (backdrop-filter blur)
    - Rounded corners, subtle border, drop shadow
    - Smooth slide-in animation from right
    - Content areas for all message types
    - Progress bar for auto-dismiss countdown
    - Close button (X) in corner
  - notification.js: receives payload from preload, populates DOM, handles interactions

- [ ] Implement media handling in notification renderer:
  - Text: render with proper typography, support line breaks
  - Image: load and display image with max dimensions, loading state
  - Video: embed YouTube/Loom using iframe or show clickable thumbnail that opens browser
  - Audio: render audio player, handle autoplay setting (play immediately or show play button)
  - Loading states and error handling for all media types

- [ ] Create system tray integration in client/src/main/tray.ts:
  - Create tray icon (custom CreaBomber icon or status indicator)
  - Tray menu items: "Connected to [server]" (status), "Reconnect", "Settings...", "Quit"
  - Show connection status via icon color or badge (green = connected, red = disconnected)
  - Click on tray icon shows recent notifications or settings
  - Settings window: server URL configuration, notification duration, sound on/off

- [ ] Create macOS app configuration and icons:
  - Design or generate app icon (1024x1024 for macOS)
  - Create client/build/icon.icns for macOS app bundle
  - Configure electron-builder for macOS: category, app ID (com.suigeneris.creabomber-client)
  - Set app to start on login (optional, configurable in settings)
  - Code signing placeholder (for future distribution)

- [ ] Build and test the Electron client:
  - Add npm scripts: "start" for dev, "build" for production
  - Run client in dev mode: `npm start` in client/
  - Verify client connects to dashboard (check Devices page shows new device online)
  - Send test message from dashboard, verify notification appears on Mac
  - Test all message types display correctly
  - Test auto-dismiss timing
  - Test reconnection by restarting server
  - Build production app: `npm run build`
  - Test built .app file launches and functions correctly
