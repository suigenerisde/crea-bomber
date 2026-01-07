# Phase 02: UI Component System & Layout

This phase creates the reusable UI component library and application layout structure. We build a cohesive dark-themed design system with all essential components, then assemble them into the main layout with navigation. By the end, you'll have a visually polished application shell ready for feature integration.

## Tasks

- [x] Create base UI components in src/components/ui/:
  - Button.tsx: variants (primary, secondary, danger, ghost), sizes (sm, md, lg), loading state with spinner, disabled state, icon support (left/right)
  - Card.tsx: container with optional header, body, footer slots, hover effect variant, border variants
  - Input.tsx: label, placeholder, error message display, left/right icon slots, disabled state
  - Textarea.tsx: auto-resize on input, character count display, max length support, error state
  - Select.tsx: dropdown with options array, placeholder, icon support, controlled value
  - Badge.tsx: variants (success/green, warning/yellow, danger/red, info/blue, neutral/gray), sizes (sm, md)
  - Toggle.tsx: switch component for boolean values with label support
  ✅ Created all 7 UI components with full TypeScript support, barrel export in index.ts

- [x] Create dark theme styles in src/app/globals.css:
  - Color scheme: slate-900 background, slate-800 cards, slate-700 borders, slate-400 muted text, white primary text
  - Accent colors: blue-500 primary actions, green-500 success/online, red-500 danger/error, yellow-500 warning
  - Custom scrollbar styling for dark theme
  - Notification slide-in animation keyframes (slideInRight, fadeIn, pulse)
  - Focus ring utilities for accessibility
  - Card hover and active state transitions
  ✅ Full dark theme with CSS variables, custom scrollbars, notification animations (slideInRight, slideOutRight, fadeIn, fadeOut, pulse, scaleIn), focus ring utilities, card interactive states, status indicators, glass effect, and border glow utilities

- [x] Create layout components in src/components/layout/:
  - Sidebar.tsx: fixed left sidebar (w-64), navigation links with icons (Home, Compose, Devices, History), active state highlighting, CreaBomber logo/title at top
  - Header.tsx: top bar with page title (dynamic), connection status indicator (Socket.io status), optional action buttons slot
  - MainLayout.tsx: combines Sidebar + Header + main content area with proper spacing, responsive container
  ✅ Created all 3 layout components with barrel export in index.ts. Sidebar has navigation with active state highlighting, Header shows connection status (connected/disconnected/connecting), MainLayout combines both with proper 64px sidebar offset

- [x] Update src/app/layout.tsx to use MainLayout:
  - Import and wrap children with MainLayout component
  - Set up metadata: title "CreaBomber", description "Internal Push Notification System"
  - Import globals.css
  - Set html/body dark theme classes (bg-slate-900, text-white)
  ✅ Updated layout.tsx: imported MainLayout from @/components/layout, wrapped children, set metadata title/description, added dark class to html element and bg-slate-900/text-white to body

- [x] Create placeholder pages to verify layout works:
  - src/app/page.tsx: Dashboard placeholder with "Dashboard" heading
  - src/app/compose/page.tsx: Compose placeholder with "Compose Message" heading
  - src/app/devices/page.tsx: Devices placeholder with "Devices" heading
  - src/app/history/page.tsx: History placeholder with "Message History" heading
  - Verify navigation between pages works correctly
  ✅ Created all 4 placeholder pages with consistent styling. Dashboard (/) shows welcome message, Compose (/compose), Devices (/devices), and History (/history) all render with proper headings. Build verified all routes: /, /compose, /devices, /history are recognized and statically generated

- [ ] Create device-related components in src/components/devices/:
  - DeviceCard.tsx: displays device name, hostname (muted), status badge (online/offline), last seen timestamp (relative with date-fns), subtle hover effect
  - DeviceList.tsx: grid layout (responsive 1-3 columns) of DeviceCards, optional online-only filter toggle, empty state message
  - DeviceSelector.tsx: checkbox list of devices for message targeting, select all/none buttons, shows online count, disabled state for offline devices
