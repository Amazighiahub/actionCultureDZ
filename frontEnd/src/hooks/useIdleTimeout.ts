// hooks/useIdleTimeout.ts — logs out user after period of inactivity
import { useEffect, useRef, useCallback } from 'react';

const IDLE_EVENTS: (keyof DocumentEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

interface UseIdleTimeoutOptions {
  /** Idle timeout in milliseconds (default: 30 minutes) */
  timeout?: number;
  /** Warning callback — called `warningBefore` ms before logout */
  onWarning?: () => void;
  /** How many ms before logout to trigger warning (default: 2 minutes) */
  warningBefore?: number;
  /** Called when idle timeout expires */
  onIdle: () => void;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

export function useIdleTimeout({
  timeout = 30 * 60 * 1000, // 30 minutes
  onWarning,
  warningBefore = 2 * 60 * 1000, // 2 minutes
  onIdle,
  enabled = true,
}: UseIdleTimeoutOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  const onWarningRef = useRef(onWarning);

  // Keep refs in sync
  onIdleRef.current = onIdle;
  onWarningRef.current = onWarning;

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();

    if (!enabled) return;

    // Set warning timer
    if (onWarningRef.current && warningBefore < timeout) {
      warningRef.current = setTimeout(() => {
        onWarningRef.current?.();
      }, timeout - warningBefore);
    }

    // Set idle timer
    timeoutRef.current = setTimeout(() => {
      onIdleRef.current();
    }, timeout);
  }, [clearTimers, enabled, timeout, warningBefore]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Start the timer
    resetTimer();

    // Listen for activity
    const handleActivity = () => resetTimer();

    IDLE_EVENTS.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimers();
      IDLE_EVENTS.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetTimer, clearTimers]);
}
