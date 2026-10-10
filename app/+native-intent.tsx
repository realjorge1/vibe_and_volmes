import { handleNotificationLink } from '../systems/notifications/open';

/**
 * Incoming deep links. A tapped notification arrives as
 * vibeandvolumes://notification?id=...: the notification system routes it to
 * the exact post or story (or, on a cold start, once the save has loaded), so
 * the router is told not to navigate on its own.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  try {
    if (handleNotificationLink(path, initial)) return initial ? '/' : '';
  } catch {
    // Not ours, or malformed: let the router try.
  }
  return path;
}
