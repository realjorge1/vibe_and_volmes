import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NpcAccount, Platform, SocialPost, TrendingTopic } from '../../types/social';
import type { PhoneNotification } from '../../types/notifications';
import type { IconOrigin } from './PhoneApp';
import { useSocialStore } from '../../store/socialStore';
import { useNotificationStore } from '../../store/notificationStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { streamMorePosts, accountTimeline } from '../../systems/social/feedStream';
import type { ThreadReply } from '../../systems/social/threadGenerator';
import { conversation, nextArrival, sendComment } from '../../systems/social/talk/live';
import { notifyAnswers } from '../../systems/notifications/triggers';
import { playerAccount } from '../../systems/social/playerAccount';
import { withEngagement } from '../../systems/social/authored';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { discourseInput } from '../../systems/drama/publish';
import { castTimeline, celebInput, laneInput } from '../../systems/social/celebContext';
import { castAccount } from '../../systems/social/celebFeed';
import { everydayTimeline } from '../../systems/social/everyday';
import { REGULARS, isRegularId } from '../../data/social/everyday/accounts';
import { baseYearOf } from '../../systems/social/worldCalendar';
import { realRegion, realTopicsNow, refreshRealWorld } from '../../systems/realworld/refresh';
import { realTrends } from '../../systems/realworld/posts';
import { useRealWorldStore } from '../../store/realWorldStore';
import { useSettingsStore } from '../../store/settingsStore';

/**
 * One app's feed: this week's posts on the platform, then an endless tail
 * generated on demand. A quiet week still has an internet, so a thin feed is
 * topped up as soon as the app opens.
 */
export function usePlatformFeed(platform: Platform) {
  const feed = useSocialStore((s) => s.feed);
  const seed = useMemo(() => feed.filter((p) => p.platform === platform), [feed, platform]);
  const [extra, setExtra] = useState<SocialPost[]>([]);
  const [fresh, setFresh] = useState<SocialPost[]>([]);
  const page = useRef(1);
  const primed = useRef(false);

  const generate = useCallback(
    (count: number) => {
      const player = usePlayerStore.getState().player;
      if (!player) return [];
      return streamMorePosts({
        player,
        week: useGameStore.getState().week,
        platform,
        track: useMusicStore.getState().getLatestTrack(),
        count,
        page: page.current++,
        discourse: discourseInput(),
        lanes: laneInput(),
      });
    },
    [platform]
  );

  const loadMore = useCallback(() => {
    const more = generate(12);
    setExtra((prev) => [...prev, ...more]);
  }, [generate]);

  /** Pull to refresh: a few new posts land on top. */
  const refresh = useCallback(() => {
    const more = generate(3 + Math.floor(Math.random() * 3));
    setFresh((prev) => [...more, ...prev]);
  }, [generate]);

  useEffect(() => {
    if (primed.current || seed.length >= 8) return;
    primed.current = true;
    loadMore();
  }, [seed.length, loadMore]);

  // Catch up with the real world now and then (every few hours at most; never blocks).
  useEffect(() => {
    void refreshRealWorld();
  }, []);

  const data = useMemo(() => [...fresh, ...seed, ...extra], [fresh, seed, extra]);
  return { data, loadMore, refresh };
}

/**
 * An app's own page stack (a post, a profile, a trend) over its tabs. `back`
 * pops one page and reports whether it did, so hardware Back can walk the
 * app before leaving it.
 */
export function usePages<P>() {
  const [stack, setStack] = useState<P[]>([]);
  const ref = useRef(stack);
  ref.current = stack;

  const push = useCallback((page: P) => setStack((s) => [...s, page]), []);
  const back = useCallback(() => {
    if (ref.current.length === 0) return false;
    setStack((s) => s.slice(0, -1));
    return true;
  }, []);
  const home = useCallback(() => setStack([]), []);

  return { stack, push, back, home };
}

/** Posts the artist tapped the heart on (or saved) while the app is open. */
export function useToggleSet() {
  const [set, setSet] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = useCallback((id: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const add = useCallback((id: string) => {
    setSet((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);
  return { set, toggle, add };
}

export function useWeek() {
  return useGameStore((s) => s.week);
}

/**
 * The artist's own account on this app: their releases plus whatever they
 * posted themselves, with likes that keep climbing while they watch.
 */
export function useMyAccount(platform: Platform) {
  const player = usePlayerStore((s) => s.player);
  const discography = useMusicStore((s) => s.discography);
  const authored = useSocialStore((s) => s.authored);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    if (!player) return null;
    const acct = playerAccount(player, platform, discography);
    const mine = authored
      .filter((p) => p.platform === platform)
      .map((p) => withEngagement({ ...p, account: acct.account }, acct.account.followers, now));
    return { ...acct, posts: [...mine, ...acct.posts] };
  }, [player, platform, discography, authored, now]);
}

/** Someone else's recent posts on this app (their profile page). */
export function useAccountPosts(account: NpcAccount | null, platform: Platform, count = 9) {
  const id = account?.id;
  return useMemo(() => {
    const player = usePlayerStore.getState().player;
    if (!account || !player || account.id === 'player') return [];
    const week = useGameStore.getState().week;
    // The regular internet and other artists post about their own lives, not the player.
    if (isRegularId(account.id)) {
      return everydayTimeline(account, platform, { week, baseYear: baseYearOf(player.createdAt), city: player.city, real: realTopicsNow() }, count);
    }
    const artist = castTimeline(account, platform, count);
    if (artist) return artist;
    return accountTimeline(
      account,
      player,
      useGameStore.getState().week,
      useMusicStore.getState().getLatestTrack(),
      count,
      platform
    );
    // Keyed by id: a profile keeps the same posts while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, platform, count]);
}

/**
 * The comment section under a post, as it stands now: the comments that have
 * come in (the artist's own posts fill up over real minutes), the artist's
 * own comments, and people answering them. It refreshes itself when the
 * next one is due.
 */
export function useThread(post: SocialPost | null): ThreadReply[] {
  const id = post?.id;
  const mine = useSocialStore((s) => (id ? s.myComments.filter((c) => c.postId === id).length : 0));
  const [tick, setTick] = useState(0);
  const list = useMemo(() => {
    if (!post || !usePlayerStore.getState().player) return [];
    return conversation(post, Date.now());
    // Keyed by id: the same post keeps the same section; `mine` and `tick` bring in what's new.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mine, tick]);
  useEffect(() => {
    if (!post) return;
    const next = nextArrival(post);
    if (next === null) return;
    const t = setTimeout(() => setTick((x) => x + 1), Math.min(60_000, Math.max(1000, next - Date.now() + 50)));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mine, tick]);
  return list;
}

/** Comment on a post (or reply to someone under it): it stays, and people answer. */
export function useSendComment(post: SocialPost | null) {
  return useCallback(
    (text: string, parent?: ThreadReply | null) => {
      if (!post) return;
      const c = sendComment(post, text, parent);
      if (c) notifyAnswers(c, post);
    },
    [post]
  );
}

export function accountsOn(platform: Platform): NpcAccount[] {
  return NPC_ACCOUNTS.filter((a) => a.preferredPlatforms.includes(platform));
}

/** Everyone search can find on an app: the usual accounts, the regular internet, and the artists. */
export function searchableOn(platform: Platform): NpcAccount[] {
  const artists = (celebInput()?.cast ?? []).map(castAccount);
  return [...accountsOn(platform), ...REGULARS.filter((a) => a.preferredPlatforms.includes(platform)), ...artists];
}

/** What every phone app is opened with. */
export interface AppProps {
  /** Center of the tapped icon: the app grows out of it. */
  origin: IconOrigin | null;
  /** A tapped notification: the app opens straight onto what it is about. */
  notifId?: string;
  /** Open on a tab ("inbox" = the app's notifications). */
  tab?: string;
}

/**
 * Route a notification into the app: the one it was opened with, and any
 * tapped later while the app is already on screen.
 */
export function useNotificationTarget(platform: Platform, notifId: string | undefined, onOpen: (n: PhoneNotification) => void) {
  const ref = useRef(onOpen);
  ref.current = onOpen;

  useEffect(() => {
    if (!notifId) return;
    const n = useNotificationStore.getState().get(notifId);
    if (!n) return;
    // Let the app finish opening before it navigates.
    const t = setTimeout(() => ref.current(n), 220);
    return () => clearTimeout(t);
  }, [notifId]);

  const nav = useNotificationStore((s) => s.nav);
  useEffect(() => {
    if (!nav || nav.app !== platform) return;
    const n = useNotificationStore.getState().get(nav.notifId);
    useNotificationStore.getState().setNav(null);
    if (n) ref.current(n);
  }, [nav, platform]);
}

/**
 * The trend board: what the game's world is talking about (the artist's
 * moments first), with what's trending in the real world mixed in.
 */
export function useTrendBoard(): TrendingTopic[] {
  const game = useSocialStore((s) => s.trending);
  const fetchedAt = useRealWorldStore((s) => s.fetchedAt);
  const on = useSettingsStore((s) => s.realWorld);
  return useMemo(() => {
    const real = on ? realTrends(realTopicsNow(), realRegion()) : [];
    if (real.length === 0) return game;
    // The artist's own trends stay on top; the real world fills in between the rest.
    const mine = game.filter((t) => !t.world).slice(0, 3);
    const rest = game.filter((t) => !mine.includes(t));
    const out: TrendingTopic[] = [...mine];
    for (let i = 0; i < Math.max(rest.length, real.length); i++) {
      if (real[i]) out.push(real[i]);
      if (rest[i]) out.push(rest[i]);
    }
    return out;
    // `fetchedAt` brings in a fresh fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, fetchedAt, on]);
}
