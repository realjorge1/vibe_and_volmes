import { PermissionsAndroid, Platform as RNPlatform } from 'react-native';
import { router, type Href } from 'expo-router';
import type { PhoneApp, PhoneNotification } from '../../types/notifications';
import { PhoneNotifications } from '../../modules/phone-notifications';
import { useNotificationStore } from '../../store/notificationStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import { clearFromShade } from './deliver';

/**
 * TAPPING A NOTIFICATION.
 *
 * Whether it was tapped in the device's shade, on the in-app banner or in the
 * Social tab, a notification opens the app it came from on the exact post,
 * comment, story or profile it was about. A tap that cold-starts the game
 * waits until the save has loaded, then lands in the same place.
 */

const APPS: readonly PhoneApp[] = ['chirper', 'flashpic', 'tunetok', 'vibestream', 'game'];

function gameReady(): boolean {
  return !!usePlayerStore.getState().player && useGameStore.getState().ending === null;
}

/** `vibeandvolumes://notification?id=...` or `...?app=flashpic` (a group summary). */
export function parseNotificationLink(url: string): { id?: string; app?: PhoneApp } | null {
  const m = url.match(/notification\?(.*)$/);
  if (!m) return null;
  const out: { id?: string; app?: PhoneApp } = {};
  for (const part of m[1].split('&')) {
    const [k, v = ''] = part.split('=');
    const value = decodeURIComponent(v);
    if (k === 'id' && value) out.id = value;
    if (k === 'app' && (APPS as readonly string[]).includes(value)) out.app = value as PhoneApp;
  }
  return out;
}

export function openNotification(n: PhoneNotification): void {
  const store = useNotificationStore.getState();
  if (!gameReady()) {
    store.setPendingOpen(`id:${n.id}`);
    return;
  }
  store.markRead(n.id);
  store.save();
  clearFromShade(n);
  if (n.app === 'game') {
    if (n.target.kind === 'route') router.navigate(n.target.href as Href);
    return;
  }
  // Already in that app: it navigates in place instead of opening twice.
  if (store.openApp === n.app) {
    store.setNav({ app: n.app, notifId: n.id, nonce: Date.now() });
    return;
  }
  router.push({ pathname: '/phone-app', params: { platform: n.app, n: n.id } });
}

/** A group summary opens the app on its notifications. */
export function openAppInbox(app: PhoneApp): void {
  if (app === 'game') {
    router.navigate('/(game)');
    return;
  }
  if (!gameReady()) {
    useNotificationStore.getState().setPendingOpen(`app:${app}`);
    return;
  }
  router.push({ pathname: '/phone-app', params: { platform: app, tab: 'inbox' } });
}

function openKey(key: string): void {
  if (key.startsWith('id:')) {
    const n = useNotificationStore.getState().get(key.slice(3));
    if (n) openNotification(n);
  } else if (key.startsWith('app:')) {
    openAppInbox(key.slice(4) as PhoneApp);
  }
}

/**
 * From `+native-intent`: a notification link came in. Returns true when it
 * was one of ours (the router should not navigate on its own).
 */
export function handleNotificationLink(url: string, initial: boolean): boolean {
  const parsed = parseNotificationLink(url);
  if (!parsed) return false;
  const key = parsed.id ? `id:${parsed.id}` : parsed.app ? `app:${parsed.app}` : null;
  if (!key) return true;
  if (initial || !gameReady()) {
    useNotificationStore.getState().setPendingOpen(key);
    return true;
  }
  // Let the linking callback finish before navigating.
  setTimeout(() => openKey(key), 0);
  return true;
}

/** Called once the game screen is up: finish a cold-start tap. */
export function consumePendingOpen(): void {
  const store = useNotificationStore.getState();
  const key = store.pendingOpen;
  if (!key || !gameReady()) return;
  store.setPendingOpen(null);
  setTimeout(() => openKey(key), 350);
}

/** Ask for Android 13+'s notification permission, once, the first time it matters. */
export async function askNotificationPermissionOnce(): Promise<void> {
  const settings = useSettingsStore.getState();
  if (settings.notificationsAsked || !settings.phoneNotifications || !PhoneNotifications) return;
  if (RNPlatform.OS !== 'android') return;
  settings.setNotificationsAsked(true);
  if (Number(RNPlatform.Version) < 33) return;
  try {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  } catch {
    // The banner fallback covers a refusal.
  }
}

/** For the settings toggle: turning it on re-asks if the OS still says no. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (RNPlatform.OS !== 'android' || !PhoneNotifications) return false;
  if (Number(RNPlatform.Version) >= 33) {
    try {
      const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (r !== PermissionsAndroid.RESULTS.GRANTED) return false;
    } catch {
      return false;
    }
  }
  try {
    return PhoneNotifications.areEnabled();
  } catch {
    return false;
  }
}
