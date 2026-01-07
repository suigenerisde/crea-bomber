# Phase 03: Message Composer & Live Preview

This phase implements the core feature of CreaBomber - the message composition system with live preview. Users can create messages of all four types (text, text+image, video, audio) and see exactly how they'll appear on target devices before sending. The preview mimics a modern macOS notification overlay with creative styling.

## Tasks

- [x] Create message type selector in src/components/messages/MessageTypeSelector.tsx:
  - Four clickable cards arranged in 2x2 grid
  - Each card: icon (from lucide-react), type label, brief description
  - TEXT: MessageSquare icon, "Text Only", "Simple text notification"
  - TEXT_IMAGE: Image icon, "Text + Image", "Message with visual"
  - VIDEO: Video icon, "Video Link", "Embed Loom or YouTube"
  - AUDIO: Volume2 icon, "Audio", "Voice message or sound"
  - Selected state with blue border/glow effect
  - Controlled component receiving value and onChange props

- [x] Create individual message form components in src/components/messages/:
  - TextMessageForm.tsx: single Textarea for message content (max 500 chars)
  - ImageMessageForm.tsx: Textarea for content + Input for image URL + live image preview below (with error state for invalid URLs)
  - VideoMessageForm.tsx: Textarea for content + Input for video URL + embedded preview (detect Loom vs YouTube, show appropriate embed)
  - AudioMessageForm.tsx: Textarea for content + Input for audio URL + Toggle for "Auto-play on receive" + audio player preview
  - All forms export their data via onChange callback with typed payload

- [x] Create the main MessageComposer in src/components/messages/MessageComposer.tsx:
  - State for selected message type (default: TEXT)
  - State for message payload (content, urls, options)
  - Renders MessageTypeSelector at top
  - Dynamically renders appropriate form component based on type
  - "Preview" button to open preview modal
  - "Send" button (disabled until valid payload + devices selected)
  - Exposes current message data via ref or callback for parent access

- [x] Create macOS-style notification preview in src/components/preview/NotificationPreview.tsx:
  - Modern macOS notification design: rounded corners (xl), subtle shadow, backdrop blur effect
  - Dark theme: slate-800 background with slight transparency
  - App icon area (CreaBomber logo/icon)
  - Title area: "CreaBomber Notification"
  - Content area adapts to message type:
    - TEXT: message text with proper line breaks
    - TEXT_IMAGE: text + image (aspect ratio preserved, max height)
    - VIDEO: text + video thumbnail with play button overlay
    - AUDIO: text + audio waveform visualization + play button (or auto-play indicator)
  - Timestamp in corner
  - Slide-in animation when appearing

- [x] Create preview modal in src/components/preview/PreviewModal.tsx:
  - Full-screen dark overlay (semi-transparent slate-900)
  - Centered NotificationPreview component
  - Device mockup frame around preview (optional: simple Mac screen bezel)
  - "Close" button (X) in corner
  - "Looks good - Send" button at bottom
  - "Edit" button to return to composer
  - Escape key closes modal
  - Receives message payload and target device count as props

- [x] Create video URL utilities in src/lib/video-utils.ts:
  - detectVideoType(url): returns 'youtube' | 'loom' | 'unknown'
  - extractYouTubeId(url): extracts video ID from various YouTube URL formats
  - extractLoomId(url): extracts video ID from Loom URLs
  - getEmbedUrl(url): returns proper embed URL for detected platform
  - getThumbnailUrl(url): returns thumbnail image URL for preview
