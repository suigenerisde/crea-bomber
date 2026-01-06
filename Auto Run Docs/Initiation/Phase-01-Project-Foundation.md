# Phase 01: Project Foundation & Core Setup

This phase establishes the technical foundation for CreaBomber. We initialize a Next.js 14 project with TypeScript, set up the database schema, configure the WebSocket server, and create the type system. By the end, you'll have a running development server with the core infrastructure in place.

## Tasks

- [x] Initialize Next.js 14 project and install all dependencies:
  - Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` in the crea-bomber directory
  - Install runtime dependencies: `npm install socket.io socket.io-client better-sqlite3 uuid date-fns lucide-react clsx`
  - Install dev dependencies: `npm install -D @types/better-sqlite3 @types/uuid ts-node`
  - Verify installation by running `npm run dev` briefly
  - ✅ **Completed**: Next.js 16.1.1 initialized with TypeScript, Tailwind, ESLint. All dependencies installed (socket.io, better-sqlite3, uuid, date-fns, lucide-react, clsx). Dev server verified working on localhost:3000.

- [x] Create TypeScript type definitions in src/types/index.ts:
  - MessageType enum: TEXT, TEXT_IMAGE, VIDEO, AUDIO
  - Device interface: id, name, hostname, status ('online' | 'offline'), lastSeen, createdAt
  - Message interface: id, type, content, imageUrl?, videoUrl?, audioUrl?, audioAutoplay?, targetDevices (string[]), status ('pending' | 'sent' | 'delivered'), createdAt
  - MessagePayload interface for WebSocket transmission
  - DeviceRegistration interface for client handshake
  - ✅ **Completed**: Created comprehensive type definitions including MessageType enum, Device/Message interfaces, MessagePayload and DeviceRegistration for WebSocket, plus DeviceRow/MessageRow types for SQLite database mapping.

- [x] Create SQLite database layer in src/lib/db.ts:
  - Initialize better-sqlite3 with database file at data/creabomber.db
  - Create devices table: id TEXT PRIMARY KEY, name TEXT, hostname TEXT, status TEXT DEFAULT 'offline', last_seen INTEGER, created_at INTEGER
  - Create messages table: id TEXT PRIMARY KEY, type TEXT, content TEXT, image_url TEXT, video_url TEXT, audio_url TEXT, audio_autoplay INTEGER DEFAULT 0, target_devices TEXT (JSON), status TEXT DEFAULT 'pending', created_at INTEGER
  - Export functions: getDevices(), getDevice(id), createDevice(), updateDeviceStatus(), getMessages(), getMessage(id), createMessage(), updateMessageStatus()
  - ✅ **Completed**: Created comprehensive SQLite database layer with better-sqlite3. Includes WAL mode for concurrent access, both tables with proper schemas, all required CRUD functions plus utility functions (getDeviceCount, getOnlineDevices, upsertDevice). Added data directory with .gitkeep and .gitignore entries for database files.

- [ ] Create mock devices seed data in src/lib/mock-devices.ts:
  - Define 3 mock devices: "MacBook Pro - Thilo", "Mac Studio - Office", "MacBook Air - Mobile"
  - Export seedMockDevices() function that inserts devices if table is empty
  - Call seed function from db.ts on initialization

- [ ] Create Socket.io server setup in src/lib/socket-server.ts:
  - Export initSocketServer(httpServer) function
  - Handle 'device:register' event - save device to DB, broadcast device list update
  - Handle 'device:heartbeat' event - update lastSeen timestamp
  - Handle 'disconnect' event - mark device as offline after timeout
  - Handle 'message:send' event - broadcast to target device rooms
  - Implement device room management (each device joins room by its ID)

- [ ] Create custom server with integrated Socket.io in server.ts (project root):
  - Import Next.js and create next app with dev mode detection
  - Create HTTP server from Next.js request handler
  - Initialize Socket.io server with CORS configured for localhost
  - Call initSocketServer() with HTTP server
  - Listen on port 3000, log startup message
  - Create tsconfig.server.json with CommonJS module resolution for ts-node

- [ ] Update package.json scripts and verify server starts:
  - Change "dev" script to: "ts-node --project tsconfig.server.json server.ts"
  - Add "dev:next" script to preserve original: "next dev"
  - Run `npm run dev` and verify both Next.js and Socket.io initialize without errors
  - Confirm database file is created at data/creabomber.db
