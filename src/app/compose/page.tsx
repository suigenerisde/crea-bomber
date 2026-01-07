'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageComposer, MessageComposerRef, MessageData } from '@/components/messages';
import { PreviewModal } from '@/components/preview';
import { DeviceSelector } from '@/components/devices';
import { Card, Badge, PageTransition, SuccessAnimation, SkeletonDeviceCard } from '@/components/ui';
import { useSocket, useDevices, useMessages, useSoundNotification, useKeyboardShortcuts } from '@/hooks';
import { useToast } from '@/contexts';

export default function ComposePage() {
  const router = useRouter();
  const composerRef = useRef<MessageComposerRef>(null);
  const toast = useToast();
  const { playSend, playSuccess, playError } = useSoundNotification();
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<MessageData | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Use real hooks for data management
  const { socket, status: socketStatus, isConnected } = useSocket();
  const { devices, loading: devicesLoading, error: devicesError } = useDevices({ socket });
  const { createMessage, creating } = useMessages({ socket, autoFetch: false });

  const handlePreview = (data: MessageData) => {
    if (selectedDevices.length === 0) {
      toast.error('Please select at least one device');
      playError();
      return;
    }
    setPreviewMessage(data);
    setPreviewOpen(true);
  };

  const handleSend = useCallback(async (data: MessageData) => {
    if (selectedDevices.length === 0) {
      toast.error('Please select at least one device');
      playError();
      return;
    }

    setIsSending(true);
    playSend();

    try {
      await createMessage({
        type: data.type,
        content: data.content,
        targetDevices: selectedDevices,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        audioUrl: data.audioUrl,
        audioAutoplay: data.audioAutoplay,
      });

      setIsSending(false);
      setShowSuccess(true);
      playSuccess();

      // Redirect to history after success animation
      setTimeout(() => {
        router.push('/history');
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(message);
      playError();
      setIsSending(false);
    }
  }, [selectedDevices, toast, playError, playSend, playSuccess, createMessage, router]);

  // Handler to trigger send via keyboard shortcut
  const handleKeyboardSend = useCallback(() => {
    if (composerRef.current?.isValid() && selectedDevices.length > 0 && !isSending && !creating) {
      const data = composerRef.current.getMessageData();
      handleSend(data);
    }
  }, [selectedDevices, isSending, creating, handleSend]);

  // Keyboard shortcuts: Cmd+Enter to send message
  useKeyboardShortcuts([
    {
      key: 'Enter',
      metaKey: true,
      action: handleKeyboardSend,
      description: 'Send message',
    },
  ]);

  const handlePreviewSend = () => {
    if (previewMessage) {
      handleSend(previewMessage);
      setPreviewOpen(false);
    }
  };

  const handlePreviewEdit = () => {
    setPreviewOpen(false);
  };

  // Combined loading state
  const isLoading = isSending || creating;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Compose Message</h1>
            <p className="text-slate-400 mt-1">
              Create and send push notifications to connected devices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                socketStatus === 'connected'
                  ? 'bg-green-500'
                  : socketStatus === 'connecting' || socketStatus === 'reconnecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-slate-400 capitalize">{socketStatus}</span>
          </div>
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

            {/* Loading overlay during send */}
            {isLoading && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-40">
                <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-slate-700 animate-scale-in">
                  <div className="relative">
                    <div className="w-12 h-12 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-b-blue-400/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                  </div>
                  <span className="text-white font-medium">Sending message...</span>
                  <span className="text-slate-400 text-sm">
                    To {selectedDevices.length} device{selectedDevices.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Device Selector - Takes 1/3 width on large screens */}
          <div className="lg:col-span-1">
            <Card
              header={
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Target Devices</span>
                  {devicesLoading && (
                    <Badge variant="neutral" size="sm">Loading...</Badge>
                  )}
                  {!devicesLoading && !devicesError && (
                    <Badge
                      variant={devices.some((d) => d.status === 'online') ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {devices.filter((d) => d.status === 'online').length} online
                    </Badge>
                  )}
                </div>
              }
            >
              {devicesError ? (
                <div className="text-center py-4 animate-fade-in">
                  <p className="text-red-400 text-sm">{devicesError}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Check that the server is running
                  </p>
                </div>
              ) : devicesLoading ? (
                <div className="space-y-3 py-2">
                  <SkeletonDeviceCard />
                  <SkeletonDeviceCard />
                  <SkeletonDeviceCard />
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-6 animate-fade-in">
                  <p className="text-slate-400">No devices registered</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Connect a device to start sending messages
                  </p>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <DeviceSelector
                    devices={devices}
                    selectedIds={selectedDevices}
                    onChange={setSelectedDevices}
                  />
                </div>
              )}
            </Card>

            {/* Connection warning */}
            {!isConnected && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg animate-fade-in">
                <p className="text-yellow-400 text-sm font-medium">Connection Issue</p>
                <p className="text-yellow-400/70 text-xs mt-1">
                  WebSocket disconnected. Messages may not be delivered in real-time.
                </p>
              </div>
            )}
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

        {/* Success Animation */}
        <SuccessAnimation
          show={showSuccess}
          size="lg"
          message="Message sent successfully!"
          duration={1800}
        />
      </div>
    </PageTransition>
  );
}
