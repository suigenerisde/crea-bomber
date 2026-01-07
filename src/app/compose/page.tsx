'use client';

import { useState, useRef } from 'react';
import { MessageComposer, MessageComposerRef, MessageData } from '@/components/messages';
import { PreviewModal } from '@/components/preview';
import { DeviceSelector } from '@/components/devices';
import { Card } from '@/components/ui';
import type { Device } from '@/components/devices/DeviceCard';

// Client-side mock devices for development
const mockDevices: Device[] = [
  {
    id: 'device-macbook-pro-thilo',
    name: 'MacBook Pro - Thilo',
    hostname: 'thilos-macbook-pro.local',
    online: true,
    lastSeen: new Date(),
  },
  {
    id: 'device-mac-studio-office',
    name: 'Mac Studio - Office',
    hostname: 'mac-studio-office.local',
    online: true,
    lastSeen: new Date(),
  },
  {
    id: 'device-macbook-air-mobile',
    name: 'MacBook Air - Mobile',
    hostname: 'macbook-air-mobile.local',
    online: false,
    lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
  },
];

export default function ComposePage() {
  const composerRef = useRef<MessageComposerRef>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<MessageData | null>(null);

  // Use mock devices for now
  const devices = mockDevices;

  const handlePreview = (data: MessageData) => {
    setPreviewMessage(data);
    setPreviewOpen(true);
  };

  const handleSend = (data: MessageData) => {
    // TODO: Implement actual send functionality via WebSocket
    console.log('Sending message:', data, 'to devices:', selectedDevices);
    alert(`Message would be sent to ${selectedDevices.length} device(s)`);
  };

  const handlePreviewSend = () => {
    if (previewMessage) {
      handleSend(previewMessage);
      setPreviewOpen(false);
    }
  };

  const handlePreviewEdit = () => {
    setPreviewOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Compose Message</h1>
        <p className="text-slate-400 mt-1">
          Create and send push notifications to connected devices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Composer - Takes 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <MessageComposer
            ref={composerRef}
            selectedDeviceCount={selectedDevices.length}
            onPreview={handlePreview}
            onSend={handleSend}
          />
        </div>

        {/* Device Selector - Takes 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <Card header={<span className="font-medium text-white">Target Devices</span>}>
            <DeviceSelector
              devices={devices}
              selectedIds={selectedDevices}
              onChange={setSelectedDevices}
            />
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      {previewMessage && (
        <PreviewModal
          isOpen={previewOpen}
          message={previewMessage}
          targetDeviceCount={selectedDevices.length}
          onClose={() => setPreviewOpen(false)}
          onSend={handlePreviewSend}
          onEdit={handlePreviewEdit}
        />
      )}
    </div>
  );
}
