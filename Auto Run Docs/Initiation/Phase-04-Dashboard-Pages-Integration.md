# Phase 04: Dashboard Pages & Full Integration

This phase completes the web dashboard by building out all pages, creating the React hooks for data management, and wiring everything together. By the end, you'll have a fully functional dashboard where you can view devices, compose messages with preview, send them (stored in history), and see the complete message history.

## Tasks

- [x] Create API routes in src/app/api/:
  - devices/route.ts: GET returns all devices from DB, POST creates new device (for manual registration)
  - devices/[id]/route.ts: GET single device, PATCH update device, DELETE remove device
  - messages/route.ts: GET returns paginated message history (limit, offset params), POST creates new message and triggers WebSocket broadcast
  - messages/[id]/route.ts: GET single message with full details
  ✅ Completed: All API routes implemented with proper error handling, pagination, and filtering

- [x] Create React hooks for data management in src/hooks/:
  - useSocket.ts: manages Socket.io client connection, auto-reconnect logic, exposes socket instance and connection status, handles cleanup on unmount
  - useDevices.ts: fetches devices via API, subscribes to real-time updates via socket ('devices:update' event), returns devices array, loading state, refresh function
  - useMessages.ts: fetches message history, createMessage function that POSTs to API, subscribes to new messages via socket, returns messages array with pagination
  ✅ Completed: All three hooks implemented with proper TypeScript types, real-time Socket.io integration, and error handling

- [x] Build the Dashboard home page (src/app/page.tsx):
  - Stats cards row: Total Devices, Online Devices, Messages Sent Today, Messages This Week
  - Quick Actions section: "Compose New Message" button linking to /compose
  - Recent Activity: last 5 messages from history with type icon, preview text, timestamp
  - Device Status Overview: compact list showing online/offline status of all devices
  - Use useDevices and useMessages hooks for data
  ✅ Completed: Full dashboard with stats cards (4), quick actions, recent activity (last 5 messages), device status overview, real-time socket connection indicator, and responsive grid layout

- [x] Build the Compose page (src/app/compose/page.tsx):
  - Two-column layout on large screens: Composer left, Device Selector right
  - MessageComposer component with all message type forms
  - DeviceSelector showing available devices with online indicators
  - Bottom action bar: "Preview" button opens PreviewModal, "Send to X devices" button (X = selected count)
  - Send flow: validates payload, opens confirmation in PreviewModal, on confirm calls createMessage, shows success toast, redirects to history
  - Loading state during send
  ✅ Completed: Full Compose page with real-time device fetching via useSocket/useDevices hooks, createMessage integration via useMessages hook, toast notifications for success/error, loading overlay during send, validation requiring device selection, and automatic redirect to /history after successful send

- [ ] Build the Devices page (src/app/devices/page.tsx):
  - DeviceList component showing all registered devices
  - Filter tabs: All, Online Only, Offline Only
  - Each DeviceCard shows: name, hostname, status, last seen
  - Click on device shows detail modal with full info and option to remove
  - "Refresh" button to manually fetch latest status
  - Empty state when no devices registered

- [ ] Build the History page (src/app/history/page.tsx):
  - MessageHistoryList component with paginated messages
  - Each MessageHistoryItem shows: type icon, content preview (truncated), target device count, timestamp, status badge
  - Click on message opens detail modal showing full message, target devices list, delivery status
  - Filter by message type dropdown
  - Search by content text
  - Infinite scroll or "Load more" pagination

- [ ] Create history components in src/components/history/:
  - MessageHistoryItem.tsx: single row/card for message with type icon, preview, metadata
  - MessageHistoryList.tsx: renders list of MessageHistoryItem, handles empty state
  - MessageDetailModal.tsx: full message view with all content, media preview, delivery tracking

- [ ] Create toast notification system for user feedback:
  - src/components/ui/Toast.tsx: animated toast component (success, error, info variants)
  - src/contexts/ToastContext.tsx: context provider for showing toasts app-wide
  - Add ToastProvider to layout
  - Use throughout app: message sent success, connection lost warning, errors

- [ ] End-to-end testing of the complete dashboard flow:
  - Start dev server, verify all pages load
  - Navigate to Compose, create a text message
  - Select mock devices, preview message
  - Send message, verify redirect to history
  - Check history page shows the new message
  - Verify database has the message record
  - Test all four message types (text, image, video, audio)
