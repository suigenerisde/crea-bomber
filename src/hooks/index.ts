/**
 * CreaBomber - React Hooks
 * Barrel export for all data management hooks
 */

export { useSocket, type ConnectionStatus } from './useSocket';
export { useDevices } from './useDevices';
export { useMessages } from './useMessages';
export { useValidation, rules } from './useValidation';
export { useNetworkStatus, type NetworkStatus } from './useNetworkStatus';
export { useSoundNotification, type SoundType } from './useSoundNotification';
export {
  useKeyboardShortcuts,
  useEscapeKey,
  formatShortcut,
  type KeyboardShortcut,
} from './useKeyboardShortcuts';
