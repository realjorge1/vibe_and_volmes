import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { runLiveResume, runLivePoll } from '../systems/live/liveTick';
import { useLiveStore } from '../store/liveStore';
import { LIVE_CONFIG } from '../constants/liveConfig';

/**
 * Mount once in the game shell. Drives the living-world heartbeat:
 *  - resume sim on mount + every time the app returns to foreground
 *  - a slow in-session poll so the energy bar keeps ticking live
 *  - auto-expiry of stale toasts
 */
export function useLiveResume(): void {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    runLiveResume();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      if (next === 'active' && prev.match(/inactive|background/)) {
        runLiveResume();
      } else if (next.match(/inactive|background/)) {
        // Snapshot the leave time so "away" is measured correctly.
        useLiveStore.getState().markSeen();
        useLiveStore.getState().save();
      }
    });

    const poll = setInterval(() => {
      runLivePoll();
      // Expire toasts past their TTL.
      const { notifications, dismissNotification } = useLiveStore.getState();
      const cutoff = Date.now() - LIVE_CONFIG.NOTIFICATION_TTL_MS;
      for (const n of notifications) {
        if (n.at < cutoff) dismissNotification(n.id);
      }
    }, 15_000);

    return () => {
      sub.remove();
      clearInterval(poll);
    };
  }, []);
}
