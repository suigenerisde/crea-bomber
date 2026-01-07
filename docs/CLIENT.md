---
type: reference
title: Mac Client Guide
created: 2025-01-07
tags:
  - client
  - macos
  - electron
related:
  - "[[README]]"
  - "[[SETUP]]"
  - "[[TROUBLESHOOTING]]"
---

# Mac Client Guide

Installation and configuration guide for the CreaBomber macOS notification client.

## Overview

The CreaBomber client is an Electron-based macOS application that:
- Runs in the system tray (menu bar)
- Receives notifications from the CreaBomber server
- Displays overlay notifications on screen
- Auto-reconnects if connection is lost

## Installation

### From DMG (Recommended)

1. Download `CreaBomber-x.x.x-arm64.dmg` from the `release/` folder
2. Double-click to mount the disk image
3. Drag **CreaBomber** to the **Applications** folder
4. Eject the disk image
5. Launch CreaBomber from Applications

### From ZIP

1. Download `CreaBomber-x.x.x-arm64-mac.zip`
2. Extract the archive
3. Move `CreaBomber.app` to Applications

### Security Note

The app is not notarized for App Store distribution. On first launch:

**Option 1**: Right-click > Open > Click "Open" in dialog

**Option 2**: System Preferences > Security & Privacy > Click "Open Anyway"

## First Launch Configuration

### 1. Locate the Tray Icon

After launch, a colored dot appears in your menu bar:

| Color | Status |
|-------|--------|
| Gray | Disconnected |
| Yellow | Connecting |
| Green | Connected |
| Red | Error |

### 2. Open Settings

Click the tray icon > Select **Settings...**

### 3. Configure Server URL

Enter the server address:
- Format: `http://<server-ip>:<port>`
- Example: `http://192.168.1.100:3000`
- Default: `http://localhost:3000`

### 4. Save Configuration

Click **Save & Reconnect**

The tray icon should turn green when connected successfully.

## Tray Menu

| Option | Description |
|--------|-------------|
| Status | Current connection state and server URL |
| Reconnect | Force reconnection to server |
| Settings... | Open configuration window |
| Open Dashboard | Launch server dashboard in browser |
| Quit CreaBomber | Exit the application |

## Notification Types

| Type | Duration | Description |
|------|----------|-------------|
| Text | 8 sec | Plain text message |
| Text + Image | 12 sec | Text with image |
| Video | 15 sec | Embedded video player |
| Audio | 10 sec | Audio with playback controls |

Notifications appear in the top-right corner and auto-dismiss. Click **x** to dismiss early.

## Auto-Start

To launch CreaBomber automatically on login:

1. Open Settings via tray menu
2. Check **Open at Login**
3. Save settings

Or manually add to Login Items in System Preferences.

## Data Storage

Configuration is stored at:
```
~/Library/Application Support/creabomber-client/config.json
```

Contents:
- `deviceId`: Unique identifier (auto-generated)
- `serverUrl`: Server connection URL
- `openAtLogin`: Auto-start preference

## Reset to Defaults

Delete the config file:
```bash
rm ~/Library/Application\ Support/creabomber-client/config.json
```

Then relaunch the app.

## Updating

To update to a new version:

1. Quit the running CreaBomber (tray > Quit)
2. Download the new DMG
3. Replace the app in Applications
4. Relaunch

Settings are preserved between updates.

## Building from Source

### Prerequisites

- Node.js 18+
- npm

### Development

```bash
cd client
npm install
npm run dev   # Watch mode
npm start     # Run Electron
```

### Build

```bash
npm run build:mac
```

Output files:
- `release/CreaBomber-x.x.x-arm64.dmg`
- `release/CreaBomber-x.x.x-arm64-mac.zip`
- `release/mac-arm64/CreaBomber.app`

## Architecture

```
CreaBomber Client
├── Main Process
│   ├── main.ts      # App lifecycle, window management
│   ├── socket.ts    # WebSocket connection, device registration
│   └── tray.ts      # System tray, menu, settings window
├── Renderer
│   ├── notification.html/ts  # Overlay notification UI
│   └── settings.html/ts      # Settings window UI
└── Preload
    └── preload.ts   # Secure IPC bridge
```

## Connection Flow

1. **Launch**: Client reads config, attempts connection
2. **Register**: Sends device info (ID, name, hostname)
3. **Heartbeat**: Server tracks online status
4. **Receive**: Messages arrive via WebSocket
5. **Display**: Overlay window shows notification
6. **Acknowledge**: Delivery confirmation sent to server
7. **Reconnect**: Automatic retry on disconnect

## Troubleshooting

See [[TROUBLESHOOTING]] for:
- Connection issues
- Notification display problems
- Reset procedures
