# CreaBomber Client

macOS notification overlay client for the CreaBomber system. Receives rich notifications from the CreaBomber server and displays them as floating overlay windows.

## Installation

### From DMG (Recommended)

1. Download `CreaBomber-x.x.x-arm64.dmg` from the `release/` folder
2. Double-click to open the disk image
3. Drag **CreaBomber** to the **Applications** folder
4. Eject the disk image
5. Launch CreaBomber from Applications

**Note:** On first launch, macOS may show a security warning since the app is not notarized. To open:
- Right-click the app → Select "Open" → Click "Open" in the dialog
- Or: System Preferences → Privacy & Security → Click "Open Anyway"

### From ZIP

1. Download `CreaBomber-x.x.x-arm64-mac.zip`
2. Extract the archive
3. Move `CreaBomber.app` to your Applications folder

## First Launch Configuration

When CreaBomber starts for the first time:

1. A colored dot appears in your menu bar (system tray)
   - Gray = Disconnected (default on first launch)
   - Yellow = Connecting
   - Green = Connected
   - Red = Connection Error

2. **Click the tray icon** to access the menu

3. Select **Settings...** to configure the server

4. Enter the **Server URL**:
   - Format: `http://<server-ip>:<port>`
   - Example: `http://192.168.1.100:3000`
   - Default: `http://localhost:3000`

5. (Optional) Check **Open at Login** to start automatically

6. Click **Save & Reconnect**

## Tray Menu Options

| Option | Description |
|--------|-------------|
| Status | Shows current connection status and server URL |
| Reconnect | Manually reconnect to the server |
| Settings... | Open the settings window |
| Open Dashboard | Opens the server dashboard in your browser |
| Quit CreaBomber | Exit the application |

## Notification Types

CreaBomber displays four types of notifications:

| Type | Duration | Description |
|------|----------|-------------|
| Text | 8 sec | Plain text message |
| Text + Image | 12 sec | Text with accompanying image |
| Video | 15 sec | Embedded video playback |
| Audio | 10 sec | Audio with playback controls |

Notifications appear in the top-right corner and auto-dismiss. Click the **×** button to dismiss early.

## Data Storage

Client configuration is stored in:
```
~/Library/Application Support/creabomber-client/config.json
```

This includes:
- `deviceId`: Unique device identifier (auto-generated)
- `serverUrl`: Server connection URL
- `openAtLogin`: Auto-start preference

## Troubleshooting

### Client Won't Connect

1. **Check server is running**: Access the dashboard URL in a browser
2. **Verify CORS settings**: Server must include client's origin in `CORS_ORIGINS`
3. **Check firewall**: Port must be accessible from client machine
4. **Verify URL format**: Include protocol (`http://`) and port (`:3000`)

### Notifications Not Appearing

1. Ensure macOS notification permissions are not blocking the app
2. Check that the client is targeted (not filtered to other devices)
3. Verify the tray icon shows green (connected)

### Connection Keeps Dropping

The client uses automatic reconnection with exponential backoff:
- Initial retry: 1 second
- Maximum delay: 30 seconds

Check network stability and server logs for issues.

### Reset to Defaults

Delete the config file to reset:
```bash
rm ~/Library/Application\ Support/creabomber-client/config.json
```

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
cd client
npm install
```

### Run in Development

```bash
npm run dev   # Watch mode for TypeScript
npm start     # Build and run Electron
```

### Build for Distribution

```bash
npm run build:mac
```

Output:
- `release/CreaBomber-x.x.x-arm64.dmg` - Disk image installer
- `release/CreaBomber-x.x.x-arm64-mac.zip` - ZIP archive
- `release/mac-arm64/CreaBomber.app` - Application bundle

## Auto-Update (Future)

Auto-update functionality is not currently implemented. To update:

1. Download the new DMG
2. Quit the running CreaBomber
3. Replace the app in Applications
4. Relaunch

A future version may include auto-update via `electron-updater` with a self-hosted update server.

## Architecture

```
CreaBomber Client (Electron)
├── Main Process
│   ├── main.ts         # App lifecycle, notification window
│   ├── socket.ts       # WebSocket connection, device registration
│   └── tray.ts         # System tray, settings window
├── Renderer
│   ├── notification.*  # Notification overlay UI
│   └── settings.*      # Settings window UI
└── Preload
    └── preload.ts      # Secure IPC bridge
```

## License

Internal use only.
