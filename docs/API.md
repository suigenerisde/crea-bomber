---
type: reference
title: API Reference
created: 2025-01-07
tags:
  - api
  - rest
  - reference
related:
  - "[[README]]"
  - "[[SETUP]]"
---

# API Reference

REST API documentation for CreaBomber server integration.

## Base URL

```
http://localhost:3000/api
```

Replace `localhost:3000` with your server address in production.

## Response Format

All responses are JSON with consistent structure:

### Success
```json
{
  "devices": [...],
  "pagination": { ... }
}
```

### Error
```json
{
  "error": "Error message",
  "details": { ... }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Database or internal error |

---

## Devices

### List All Devices

```
GET /api/devices
```

Returns all registered devices.

**Response**
```json
{
  "devices": [
    {
      "id": "uuid-string",
      "name": "MacBook Pro",
      "hostname": "macbook.local",
      "status": "online",
      "lastSeen": "2025-01-07T12:00:00.000Z",
      "createdAt": "2025-01-06T10:00:00.000Z"
    }
  ]
}
```

**Device Status Values**: `online`, `offline`

---

### Get Single Device

```
GET /api/devices/:id
```

Returns details for a specific device.

**Response**
```json
{
  "device": {
    "id": "uuid-string",
    "name": "MacBook Pro",
    "hostname": "macbook.local",
    "status": "online",
    "lastSeen": "2025-01-07T12:00:00.000Z",
    "createdAt": "2025-01-06T10:00:00.000Z"
  }
}
```

**Errors**
- `404`: Device not found

---

### Create Device (Manual Registration)

```
POST /api/devices
```

Manually register a device. Usually devices register automatically via WebSocket.

**Request Body**
```json
{
  "name": "Display Kiosk",
  "hostname": "kiosk-01.local",
  "id": "optional-custom-id"
}
```

| Field | Required | Max Length | Description |
|-------|----------|------------|-------------|
| name | Yes | 100 | Display name |
| hostname | Yes | 255 | Network hostname |
| id | No | 36 | Custom UUID (auto-generated if omitted) |

**Response** (201)
```json
{
  "device": { ... }
}
```

---

### Update Device

```
PATCH /api/devices/:id
```

Update device properties.

**Request Body**
```json
{
  "name": "New Name",
  "hostname": "new-hostname.local",
  "status": "offline"
}
```

All fields are optional. Only provided fields are updated.

| Field | Max Length | Values |
|-------|------------|--------|
| name | 100 | Any string |
| hostname | 255 | Any string |
| status | - | `online`, `offline` |

**Response**
```json
{
  "device": { ... }
}
```

---

### Delete Device

```
DELETE /api/devices/:id
```

Remove a device from the system.

**Response**
```json
{
  "success": true,
  "deletedId": "uuid-string"
}
```

---

## Messages

### List Messages

```
GET /api/messages
```

Returns paginated message history with optional filtering.

**Query Parameters**

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| limit | 20 | 100 | Results per page |
| offset | 0 | - | Pagination offset |
| type | - | - | Filter by message type |
| search | - | - | Search in content |

**Example**
```
GET /api/messages?limit=10&offset=0&type=TEXT&search=hello
```

**Response**
```json
{
  "messages": [
    {
      "id": "uuid-string",
      "type": "TEXT",
      "content": "Hello world",
      "imageUrl": null,
      "videoUrl": null,
      "audioUrl": null,
      "audioAutoplay": false,
      "targetDevices": ["device-id-1", "device-id-2"],
      "status": "delivered",
      "deliveries": [
        {
          "deviceId": "device-id-1",
          "status": "delivered",
          "deliveredAt": "2025-01-07T12:01:00.000Z"
        }
      ],
      "createdAt": "2025-01-07T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

**Message Status Values**: `pending`, `sent`, `partial`, `delivered`

**Delivery Status Values**: `pending`, `sent`, `delivered`, `failed`

---

### Get Single Message

```
GET /api/messages/:id
```

Returns message with enriched device details.

**Response**
```json
{
  "message": {
    "id": "uuid-string",
    "type": "TEXT",
    "content": "Hello world",
    "targetDevices": ["device-id-1"],
    "targetDevicesDetails": [
      {
        "id": "device-id-1",
        "name": "MacBook Pro",
        "hostname": "macbook.local",
        "status": "online"
      }
    ],
    "status": "delivered",
    "createdAt": "2025-01-07T12:00:00.000Z"
  }
}
```

---

### Create Message

```
POST /api/messages
```

Create and broadcast a new message.

**Request Body**
```json
{
  "type": "TEXT",
  "content": "Your notification message",
  "targetDevices": ["device-id-1", "device-id-2"]
}
```

**Message Types and Required Fields**

| Type | Required Fields | Description |
|------|-----------------|-------------|
| TEXT | content | Plain text only |
| TEXT_IMAGE | content, imageUrl | Text with image |
| VIDEO | content, videoUrl | Text with video |
| AUDIO | content, audioUrl | Text with audio |

**All Fields**

| Field | Required | Max Length | Description |
|-------|----------|------------|-------------|
| type | Yes | - | Message type |
| content | Yes | 10000 | Message text |
| targetDevices | Yes | - | Array of device IDs |
| imageUrl | For TEXT_IMAGE | 2048 | Image URL |
| videoUrl | For VIDEO | 2048 | Video URL |
| audioUrl | For AUDIO | 2048 | Audio URL |
| audioAutoplay | No | - | Auto-play audio (boolean) |

**Response** (201)
```json
{
  "message": {
    "id": "uuid-string",
    "type": "TEXT",
    "content": "Your notification message",
    "targetDevices": ["device-id-1", "device-id-2"],
    "status": "pending",
    "createdAt": "2025-01-07T12:00:00.000Z"
  }
}
```

**Errors**
- `400`: Validation error (missing fields, invalid type, etc.)

---

## WebSocket Events

The server uses Socket.io for real-time communication.

### Client Events (Emitted by Clients)

| Event | Payload | Description |
|-------|---------|-------------|
| `device:register` | `{ deviceId, deviceName, hostname }` | Register device |
| `message:delivered` | `{ messageId, deviceId, timestamp }` | Acknowledge delivery |

### Server Events (Received by Clients)

| Event | Payload | Description |
|-------|---------|-------------|
| `message` | `MessagePayload` | New message to display |
| `device:updated` | `Device` | Device status change |
| `message:updated` | `Message` | Message status change |
| `message:delivery:update` | `DeliveryStatusUpdate` | Delivery status update |

### Dashboard Events

| Event | Payload | Description |
|-------|---------|-------------|
| `device:connected` | `Device` | New device came online |
| `device:disconnected` | `{ deviceId }` | Device went offline |
| `message:sent` | `{ messageId, success }` | Message broadcast result |

---

## TypeScript Types

```typescript
enum MessageType {
  TEXT = 'TEXT',
  TEXT_IMAGE = 'TEXT_IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
}

type DeviceStatus = 'online' | 'offline';
type MessageStatus = 'pending' | 'sent' | 'partial' | 'delivered';
type DeviceDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

interface Device {
  id: string;
  name: string;
  hostname: string;
  status: DeviceStatus;
  lastSeen: Date;
  createdAt: Date;
}

interface Message {
  id: string;
  type: MessageType;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioAutoplay?: boolean;
  targetDevices: string[];
  status: MessageStatus;
  deliveries?: MessageDelivery[];
  createdAt: Date;
}

interface MessageDelivery {
  deviceId: string;
  status: DeviceDeliveryStatus;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}
```

---

## Rate Limiting

No rate limiting is currently implemented. For high-volume usage, consider:
- Adding rate limiting middleware
- Implementing message queuing
- Batching notifications

---

## Examples

### cURL: Send a Text Message

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TEXT",
    "content": "Hello from the API!",
    "targetDevices": ["device-id-here"]
  }'
```

### cURL: Send Image Message

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TEXT_IMAGE",
    "content": "Check out this image",
    "imageUrl": "https://example.com/image.jpg",
    "targetDevices": ["device-id-here"]
  }'
```

### cURL: List Online Devices

```bash
curl http://localhost:3000/api/devices | jq '.devices[] | select(.status == "online")'
```
