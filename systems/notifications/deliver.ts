import { Image } from 'react-native';
import type { NotificationActor, NotificationDraft, PhoneApp, PhoneNotification } from '../../types/notifications';
import { PhoneNotifications, type ImageSpec, type NotificationSpec } from '../../modules/phone-notifications';
import { useNotificationStore } from '../../store/notificationStore';
import { useSettingsStore } from '../../store/settingsStore';
import { planAvatar } from '../visuals/scenes';
import { photoByKey } from '../visuals/photoIndex';
import { NOTIFY_APPS, summaryLine } from './compose';

/**
 * DELIVERY.
 *
 * A notification is recorded (it shows in the Social tab's shade and on the
 * app's badge), then shown the way a phone shows it: as a real Android
 * notification when the native module is in the build and the player allowed
 * it, otherwise as the in-app heads-up banner. The app on screen gets no
 * ping of its own, the way real apps stay quiet while you are in them.
 */

const SUMMARY_ID: Record<PhoneApp, number> = { chirper: 91, flashpic: 92, tunetok: 93, vibestream: 94, game: 95 };

let channelsReady = false;

function ensureChannels(): void {
  if (channelsReady || !PhoneNotifications) return;
  PhoneNotifications.ensureChannels(
    Object.values(NOTIFY_APPS).map((a) => ({ id: a.channel, name: a.channelName, description: a.description }))
  );
  channelsReady = true;
}

/** True when real notifications can be posted right now. */
export function nativeNotificationsOn(): boolean {
  if (!PhoneNotifications || !useSettingsStore.getState().phoneNotifications) return false;
  try {
    return PhoneNotifications.areEnabled();
  } catch {
    return false;
  }
}

/** A bundled photo's uri, or the file:// copy of one of the player's own photos. */
function assetUri(src: number | { uri: string }): string | undefined {
  if (typeof src !== 'number') return src.uri;
  try {
    return Image.resolveAssetSource(src)?.uri;
  } catch {
    return undefined;
  }
}

function avatarSpec(actor: NotificationActor): ImageSpec | undefined {
  const plan = planAvatar(actor.id, actor.name);
  switch (plan.kind) {
    case 'photo': {
      const uri = assetUri(plan.photo.src);
      return uri ? { uri, focusX: plan.photo.focus[0], focusY: plan.photo.focus[1] } : undefined;
    }
    case 'logo':
      return { text: plan.text, bg: plan.bg, fg: plan.fg };
    case 'letter':
      return { text: plan.letter, bg: plan.bg, fg: '#FFFFFF' };
    default:
      return { text: (actor.name.trim()[0] ?? '?').toUpperCase(), bg: '#B8C4CC', fg: '#FFFFFF' };
  }
}

function pictureSpec(n: PhoneNotification): ImageSpec | undefined {
  // Chirp and the career channel are text pings, like the real ones.
  if (n.app === 'game' || (n.app === 'chirper' && !n.post?.media)) return undefined;
  const p = photoByKey(n.image?.photoKey);
  if (!p) return undefined;
  const uri = assetUri(p.src);
  return uri ? { uri, focusX: p.focus[0], focusY: p.focus[1] } : undefined;
}

export function linkFor(n: PhoneNotification): string {
  return `vibeandvolumes://notification?id=${encodeURIComponent(n.id)}`;
}

function specFor(n: PhoneNotification): NotificationSpec {
  const app = NOTIFY_APPS[n.app];
  const unread = useNotificationStore
    .getState()
    .items.filter((x) => x.app === n.app && !x.read)
    .slice(0, 6);
  return {
    id: n.nid,
    channelId: app.channel,
    smallIcon: app.icon,
    color: n.color ?? app.color,
    title: n.title,
    body: n.body,
    subText: n.app === 'game' ? undefined : app.name,
    largeIcon: n.actor ? avatarSpec(n.actor) : undefined,
    picture: pictureSpec(n),
    group: `vv.${app.channel}`,
    link: linkFor(n),
    whenMs: n.at,
    summaryId: SUMMARY_ID[n.app],
    summaryTitle: app.name,
    summaryLines: unread.length > 1 ? unread.map(summaryLine) : [],
    summaryLink: `vibeandvolumes://notification?app=${n.app}`,
  };
}

async function showNative(n: PhoneNotification): Promise<boolean> {
  if (!nativeNotificationsOn() || !PhoneNotifications) return false;
  try {
    ensureChannels();
    await PhoneNotifications.post(specFor(n));
    return true;
  } catch {
    return false;
  }
}

/** The same ping twice in a few minutes is noise. */
function isDuplicate(d: NotificationDraft, now: number): boolean {
  const key = JSON.stringify(d.target);
  return useNotificationStore
    .getState()
    .items.some(
      (x) =>
        now - x.at < 10 * 60_000 &&
        x.app === d.app &&
        x.kind === d.kind &&
        x.actor?.id === d.actor?.id &&
        JSON.stringify(x.target) === key
    );
}

export async function deliver(d: NotificationDraft): Promise<PhoneNotification | null> {
  const now = Date.now();
  if (isDuplicate(d, now)) return null;
  const store = useNotificationStore.getState();
  const n = store.add(d, now);
  store.save();
  if (store.openApp && store.openApp === n.app) return n;
  if (await showNative(n)) return n;
  useNotificationStore.getState().showBanner(n);
  return n;
}

/** Opening an app reads its notifications: they leave the shade. */
export function clearAppFromShade(app: PhoneApp): void {
  if (!PhoneNotifications) return;
  const ids = useNotificationStore
    .getState()
    .items.filter((x) => x.app === app)
    .map((x) => x.nid);
  try {
    PhoneNotifications.cancel([...ids, SUMMARY_ID[app]]);
  } catch {
    // Nothing to clear.
  }
}

export function clearFromShade(n: PhoneNotification): void {
  try {
    PhoneNotifications?.cancel([n.nid]);
  } catch {
    // Already gone.
  }
}

export function clearShade(): void {
  try {
    PhoneNotifications?.cancelAll();
  } catch {
    // Nothing posted.
  }
}
