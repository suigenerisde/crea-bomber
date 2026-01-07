---
type: reference
title: CreaBomber Documentation Overview
created: 2025-01-07
tags:
  - documentation
  - overview
  - architecture
related:
  - "[[SETUP]]"
  - "[[CLIENT]]"
  - "[[API]]"
  - "[[TROUBLESHOOTING]]"
---

# CreaBomber Documentation

Internal notification system for sending rich messages to Mac display devices.

## What is CreaBomber?

CreaBomber is a real-time notification broadcasting system consisting of:

- **Server**: Next.js dashboard with Socket.io for real-time communication
- **Client**: Electron app for macOS that displays overlay notifications
- **Database**: SQLite for persistent storage of devices and message history

## Documentation Index

| Document | Description |
|----------|-------------|
| [[SETUP]] | Server installation and deployment |
| [[CLIENT]] | Mac client installation and configuration |
| [[API]] | REST API endpoint reference |
| [[TROUBLESHOOTING]] | Common issues and solutions |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      CreaBomber Server                       │
│                    (Node.js + Next.js)                       │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │  Next.js        │    │  Socket.io       │                │
│  │  Dashboard      │    │  Real-time       │                │
│  │                 │    │                  │                │
│  │  - Compose      │    │  - Device reg    │                │
│  │  - Devices      │    │  - Message push  │                │
│  │  - History      │    │  - Status sync   │                │
│  │  - Stats        │    │  - Delivery ack  │                │
│  └────────┬────────┘    └────────┬─────────┘                │
│           │                      │                           │
│           └──────────┬───────────┘                           │
│                      │                                       │
│              ┌───────▼───────┐                               │
│              │   SQLite DB   │                               │
│              │               │                               │
│              │  - devices    │                               │
│              │  - messages   │                               │
│              │  - deliveries │                               │
│              └───────────────┘                               │
└──────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Mac Client │ │  Mac Client │ │  Mac Client │
    │  (Electron) │ │  (Electron) │ │  (Electron) │
    │             │ │             │ │             │
    │  - Tray     │ │  - Tray     │ │  - Tray     │
    │  - Overlay  │ │  - Overlay  │ │  - Overlay  │
    │  - Settings │ │  - Settings │ │  - Settings │
    └─────────────┘ └─────────────┘ └─────────────┘
```

## Message Types

CreaBomber supports four notification types:

| Type | Description | Duration | Media |
|------|-------------|----------|-------|
| TEXT | Plain text message | 8 sec | None |
| TEXT_IMAGE | Text with image | 12 sec | Image URL |
| VIDEO | Text with embedded video | 15 sec | Video URL |
| AUDIO | Text with audio playback | 10 sec | Audio URL |

## Message Flow

1. **Compose**: User creates message in dashboard, selects target devices
2. **Send**: Server stores message, broadcasts via WebSocket to online devices
3. **Display**: Client receives message, shows overlay notification
4. **Acknowledge**: Client sends delivery confirmation back to server
5. **Track**: Dashboard updates delivery status in real-time

## Key Features

- **Real-time**: Messages appear instantly on target devices
- **Multi-device**: Target individual devices or broadcast to all
- **Delivery tracking**: Per-device delivery status and timestamps
- **Rich media**: Support for images, videos, and audio
- **Offline handling**: Queued messages, automatic reconnection
- **Keyboard shortcuts**: Power user productivity features

## Technology Stack

| Component | Technology |
|-----------|------------|
| Server Framework | Next.js 16 |
| Real-time | Socket.io 4.x |
| Database | better-sqlite3 |
| Client Framework | Electron |
| UI Components | React, Tailwind CSS |
| Language | TypeScript |

## Project Structure

```
crea-bomber/
├── src/
│   ├── app/           # Next.js pages (dashboard, compose, etc.)
│   ├── components/    # React components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Core utilities (db, socket-server, errors)
│   └── types/         # TypeScript type definitions
├── client/            # Electron Mac client
│   ├── src/           # Main process, preload, renderer
│   └── release/       # Built distributables
├── docs/              # This documentation
├── data/              # SQLite database (runtime)
├── logs/              # PM2 log files (runtime)
├── server.ts          # Custom server entry point
└── ecosystem.config.js # PM2 configuration
```

## Quick Links

- Server Dashboard: `http://localhost:3000`
- API Base URL: `http://localhost:3000/api`
- Client Config: `~/Library/Application Support/creabomber-client/config.json`

## Version

Current: 0.1.0 (Internal Release)
