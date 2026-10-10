import { create } from 'zustand';
import type { NotificationDraft, PhoneApp, PhoneNotification } from '../types/notifications';
import { saveData, loadData } from '../database/gameRepository';

const KEEP = 80;
const SAVE_KEEP = 60;

interface NotificationState {
  /** Everything delivered, newest first: the Social tab's notification shade. */
  items: PhoneNotification[];
  /** Next Android notification id. */
  nextNid: number;
  /** In-app heads-up banner (when the OS can't show it), and what waits behind it. */
  banner: PhoneNotification | null;
  queue: PhoneNotification[];
  /** The phone app open right now, if any: it gets no pings of its own. */
  openApp: PhoneApp | null;
  /** A notification tapped before the game had loaded (cold start). */
  pendingOpen: string | null;
  /** A tap aimed at the app already on screen: it navigates in place. */
  nav: { app: PhoneApp; notifId: string; nonce: number } | null;
  /** When each app's own notifications screen was last opened (its in-app badge). */
  inboxSeen: Partial<Record<PhoneApp, number>>;
}

interface NotificationActions {
  add: (draft: NotificationDraft, at?: number) => PhoneNotification;
  markRead: (id: string) => void;
  markAppRead: (app: PhoneApp) => void;
  clearAll: () => void;
  showBanner: (n: PhoneNotification) => void;
  dismissBanner: () => void;
  setOpenApp: (app: PhoneApp | null) => void;
  setPendingOpen: (id: string | null) => void;
  setNav: (nav: NotificationState['nav']) => void;
  markInboxSeen: (app: PhoneApp) => void;
  /** Notifications that arrived since the app's notifications screen was last opened. */
  newSince: (app: PhoneApp) => number;
  get: (id: string) => PhoneNotification | null;
  unreadFor: (app: PhoneApp) => number;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const EMPTY: NotificationState = {
  items: [],
  nextNid: 1001,
  banner: null,
  queue: [],
  openApp: null,
  pendingOpen: null,
  nav: null,
  inboxSeen: {},
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  ...EMPTY,

  add(draft, at = Date.now()) {
    const nid = get().nextNid;
    const n: PhoneNotification = {
      ...draft,
      id: `nt-${at}-${nid}`,
      nid,
      at,
      read: false,
    };
    set((s) => ({ items: [n, ...s.items].slice(0, KEEP), nextNid: nid + 1 }));
    return n;
  },

  markRead(id) {
    if (!get().items.some((n) => n.id === id && !n.read)) return;
    set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  },

  markAppRead(app) {
    if (!get().items.some((n) => n.app === app && !n.read)) return;
    set((s) => ({ items: s.items.map((n) => (n.app === app ? { ...n, read: true } : n)) }));
  },

  clearAll() {
    set({ items: [], banner: null, queue: [] });
  },

  showBanner(n) {
    const { banner } = get();
    if (!banner) set({ banner: n });
    else set((s) => ({ queue: [...s.queue, n].slice(-4) }));
  },

  dismissBanner() {
    const [next, ...rest] = get().queue;
    set({ banner: next ?? null, queue: rest });
  },

  setOpenApp(app) {
    set({ openApp: app });
  },

  setPendingOpen(id) {
    set({ pendingOpen: id });
  },

  setNav(nav) {
    set({ nav });
  },

  markInboxSeen(app) {
    set((s) => ({ inboxSeen: { ...s.inboxSeen, [app]: Date.now() } }));
    get().save();
  },

  newSince(app) {
    const seen = get().inboxSeen[app] ?? 0;
    return get().items.reduce((c, n) => c + (n.app === app && n.at > seen ? 1 : 0), 0);
  },

  get(id) {
    return get().items.find((n) => n.id === id) ?? null;
  },

  unreadFor(app) {
    return get().items.reduce((c, n) => c + (n.app === app && !n.read ? 1 : 0), 0);
  },

  save() {
    const { items, nextNid, inboxSeen } = get();
    saveData('notifications', { items: items.slice(0, SAVE_KEEP), nextNid, inboxSeen });
  },

  load() {
    const saved = loadData<{ items: PhoneNotification[]; nextNid: number; inboxSeen?: Partial<Record<PhoneApp, number>> }>('notifications');
    if (saved) set({ items: saved.items ?? [], nextNid: saved.nextNid ?? EMPTY.nextNid, inboxSeen: saved.inboxSeen ?? {} });
  },

  reset() {
    set({ ...EMPTY });
  },
}));
