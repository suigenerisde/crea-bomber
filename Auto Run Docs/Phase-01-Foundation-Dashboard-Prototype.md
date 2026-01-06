# Phase 01: Foundation & Dashboard Prototype

This phase establishes the complete project foundation and delivers a working web dashboard prototype. By the end, you'll have a running Next.js application with a functional message creation interface, live preview system, and a WebSocket server ready to receive client connections. The dashboard will display mock devices and allow you to compose and preview all message types (text, text+image, video, audio) - demonstrating the core concept immediately.

## Tasks

- [ ] Initialize Next.js 14 project with TypeScript in the crea-bomber directory using `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [ ] Install required dependencies: `npm install socket.io socket.io-client better-sqlite3 uuid date-fns lucide-react`
- [ ] Install dev dependencies: `npm install -D @types/better-sqlite3 @types/uuid`
- [ ] Create src/lib/db.ts with SQLite database initialization including tables for devices (id, name, hostname, status, last_seen, created_at) and messages (id, type, content, image_url, video_url, audio_url, audio_autoplay, target_devices, status, created_at)
- [ ] Create src/lib/socket-server.ts with Socket.io server setup that handles device registration, heartbeat, and message broadcasting
- [ ] Create src/types/index.ts with TypeScript interfaces for Device, Message, MessageType enum (TEXT, TEXT_IMAGE, VIDEO, AUDIO), and MessagePayload
- [ ] Create src/app/api/devices/route.ts with GET endpoint returning all registered devices from database
- [ ] Create src/app/api/messages/route.ts with GET (history) and POST (create message) endpoints
- [ ] Create src/app/api/messages/[id]/route.ts with GET endpoint for single message details
- [ ] Create src/components/ui/Button.tsx with primary, secondary, and danger variants using Tailwind styling
- [ ] Create src/components/ui/Card.tsx as a reusable container component with header, body, and footer slots
- [ ] Create src/components/ui/Input.tsx with label, placeholder, and error state support
- [ ] Create src/components/ui/Textarea.tsx with auto-resize functionality and character count
- [ ] Create src/components/ui/Select.tsx for dropdown selections with icon support
- [ ] Create src/components/ui/Badge.tsx for status indicators (online/offline) with color variants
- [ ] Create src/components/layout/Sidebar.tsx with navigation links for Dashboard, Compose, Devices, and History sections
- [ ] Create src/components/layout/Header.tsx with app title "CreaBomber" and connection status indicator
- [ ] Create src/components/layout/MainLayout.tsx combining Header and Sidebar with main content area
- [ ] Create src/components/devices/DeviceCard.tsx displaying device name, hostname, status badge, and last seen timestamp
- [ ] Create src/components/devices/DeviceList.tsx showing grid of DeviceCards with online/offline filtering
- [ ] Create src/components/devices/DeviceSelector.tsx with checkboxes to select target devices for message sending
- [ ] Create src/components/messages/MessageTypeSelector.tsx with four clickable cards for TEXT, TEXT_IMAGE, VIDEO, AUDIO types with icons
- [ ] Create src/components/messages/TextMessageForm.tsx with textarea for message content
- [ ] Create src/components/messages/ImageMessageForm.tsx with textarea for content plus image URL input with preview
- [ ] Create src/components/messages/VideoMessageForm.tsx with textarea for content plus video URL input (Loom/YouTube) with embedded preview
- [ ] Create src/components/messages/AudioMessageForm.tsx with textarea for content, audio URL input, and autoplay toggle switch
- [ ] Create src/components/messages/MessageComposer.tsx combining MessageTypeSelector with dynamic form rendering based on selected type
- [ ] Create src/components/preview/NotificationPreview.tsx showing a realistic macOS-style notification overlay with the composed message
- [ ] Create src/components/preview/PreviewModal.tsx as a full-screen modal showing how the notification will appear on target devices
- [ ] Create src/components/history/MessageHistoryItem.tsx displaying message type icon, content preview, target count, timestamp, and status
- [ ] Create src/components/history/MessageHistoryList.tsx with paginated list of sent messages
- [ ] Create src/app/page.tsx as the main dashboard showing device overview (online count, total) and recent messages
- [ ] Create src/app/compose/page.tsx with MessageComposer, DeviceSelector, PreviewModal trigger, and Send button
- [ ] Create src/app/devices/page.tsx with DeviceList and manual device refresh button
- [ ] Create src/app/history/page.tsx with MessageHistoryList and message detail view
- [ ] Create src/app/layout.tsx wrapping all pages with MainLayout component
- [ ] Create src/hooks/useSocket.ts custom hook for WebSocket connection management with auto-reconnect
- [ ] Create src/hooks/useDevices.ts custom hook for fetching and subscribing to device status updates
- [ ] Create src/hooks/useMessages.ts custom hook for message CRUD operations
- [ ] Create src/lib/mock-devices.ts with 3 mock devices (MacBook Pro, Mac Studio, MacBook Air) for initial testing without real clients
- [ ] Update src/lib/db.ts to seed mock devices on first run if database is empty
- [ ] Create src/app/globals.css with dark theme color scheme (slate-900 background, slate-800 cards, blue-500 accents) and notification animation keyframes
- [ ] Create custom server.ts in project root that initializes both Next.js and Socket.io server on port 3000
- [ ] Update package.json scripts to use custom server: "dev": "ts-node --project tsconfig.server.json server.ts"
- [ ] Create tsconfig.server.json for server-side TypeScript compilation with CommonJS module resolution
- [ ] Install ts-node for running TypeScript server: `npm install -D ts-node`
- [ ] Test the complete flow: start server, view dashboard, compose a test message, preview it, and verify it appears in history
