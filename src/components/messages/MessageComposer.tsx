'use client';

import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Eye, Send } from 'lucide-react';
import { MessageType } from '@/types';
import { Card, Button } from '@/components/ui';
import { MessageTypeSelector } from './MessageTypeSelector';
import { TextMessageForm } from './TextMessageForm';
import { ImageMessageForm } from './ImageMessageForm';
import { VideoMessageForm } from './VideoMessageForm';
import { AudioMessageForm } from './AudioMessageForm';

// Payload types for each message type
interface TextPayload {
  content: string;
}

interface ImagePayload {
  content: string;
  imageUrl: string;
}

interface VideoPayload {
  content: string;
  videoUrl: string;
}

interface AudioPayload {
  content: string;
  audioUrl: string;
  autoplay: boolean;
}

// Combined message data type
export interface MessageData {
  type: MessageType;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioAutoplay?: boolean;
}

// Ref handle for parent access
export interface MessageComposerRef {
  getMessageData: () => MessageData;
  isValid: () => boolean;
}

interface MessageComposerProps {
  selectedDeviceCount?: number;
  onPreview?: (data: MessageData) => void;
  onSend?: (data: MessageData) => void;
}

export const MessageComposer = forwardRef<MessageComposerRef, MessageComposerProps>(
  function MessageComposer({ selectedDeviceCount = 0, onPreview, onSend }, ref) {
    const [messageType, setMessageType] = useState<MessageType>(MessageType.TEXT);

    // Individual payload states
    const [textPayload, setTextPayload] = useState<TextPayload>({ content: '' });
    const [imagePayload, setImagePayload] = useState<ImagePayload>({
      content: '',
      imageUrl: '',
    });
    const [videoPayload, setVideoPayload] = useState<VideoPayload>({
      content: '',
      videoUrl: '',
    });
    const [audioPayload, setAudioPayload] = useState<AudioPayload>({
      content: '',
      audioUrl: '',
      autoplay: false,
    });

    // Get current message data based on type
    const getMessageData = useCallback((): MessageData => {
      switch (messageType) {
        case MessageType.TEXT:
          return {
            type: messageType,
            content: textPayload.content,
          };
        case MessageType.TEXT_IMAGE:
          return {
            type: messageType,
            content: imagePayload.content,
            imageUrl: imagePayload.imageUrl,
          };
        case MessageType.VIDEO:
          return {
            type: messageType,
            content: videoPayload.content,
            videoUrl: videoPayload.videoUrl,
          };
        case MessageType.AUDIO:
          return {
            type: messageType,
            content: audioPayload.content,
            audioUrl: audioPayload.audioUrl,
            audioAutoplay: audioPayload.autoplay,
          };
      }
    }, [messageType, textPayload, imagePayload, videoPayload, audioPayload]);

    // Validate current message data
    const isValid = useCallback((): boolean => {
      switch (messageType) {
        case MessageType.TEXT:
          return textPayload.content.trim().length > 0;
        case MessageType.TEXT_IMAGE:
          return (
            imagePayload.content.trim().length > 0 &&
            imagePayload.imageUrl.trim().length > 0
          );
        case MessageType.VIDEO:
          return (
            videoPayload.content.trim().length > 0 &&
            videoPayload.videoUrl.trim().length > 0
          );
        case MessageType.AUDIO:
          return (
            audioPayload.content.trim().length > 0 &&
            audioPayload.audioUrl.trim().length > 0
          );
      }
    }, [messageType, textPayload, imagePayload, videoPayload, audioPayload]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getMessageData,
      isValid,
    }));

    const handlePreview = () => {
      if (onPreview) {
        onPreview(getMessageData());
      }
    };

    const handleSend = () => {
      if (onSend && isValid() && selectedDeviceCount > 0) {
        onSend(getMessageData());
      }
    };

    const canSend = isValid() && selectedDeviceCount > 0;

    return (
      <div className="space-y-6">
        <Card header={<span className="font-medium text-white">Message Type</span>}>
          <MessageTypeSelector value={messageType} onChange={setMessageType} />
        </Card>

        <Card header={<span className="font-medium text-white">Message Content</span>}>
          {messageType === MessageType.TEXT && (
            <TextMessageForm value={textPayload} onChange={setTextPayload} />
          )}
          {messageType === MessageType.TEXT_IMAGE && (
            <ImageMessageForm value={imagePayload} onChange={setImagePayload} />
          )}
          {messageType === MessageType.VIDEO && (
            <VideoMessageForm value={videoPayload} onChange={setVideoPayload} />
          )}
          {messageType === MessageType.AUDIO && (
            <AudioMessageForm value={audioPayload} onChange={setAudioPayload} />
          )}
        </Card>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handlePreview}
            disabled={!isValid()}
            iconLeft={<Eye className="w-4 h-4" />}
          >
            Preview
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!canSend}
            iconLeft={<Send className="w-4 h-4" />}
          >
            Send{selectedDeviceCount > 0 && ` to ${selectedDeviceCount} device${selectedDeviceCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    );
  }
);
