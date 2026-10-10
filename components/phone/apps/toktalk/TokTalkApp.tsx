import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { NpcAccount, SocialPost } from '../../../../types/social';
import type { PhoneNotification } from '../../../../types/notifications';
import { usePlayerStore } from '../../../../store/playerStore';
import { useMusicStore } from '../../../../store/musicStore';
import { useNotificationStore } from '../../../../store/notificationStore';
import { freshAuthored } from '../../../../systems/social/authored';
import { postFromPhone, type PhotoPick } from '../../../../systems/social/postFromPhone';
import { planClip } from '../../../../systems/visuals/clips';
import { T } from '../../T';
import { ExitButton, PhoneApp } from '../../PhoneApp';
import { AppNav, type NavTab } from '../../AppNav';
import { Avatar } from '../../Avatar';
import { PageLayer } from '../../Page';
import { CommentsSheet } from '../../Comments';
import { ShortsPager } from '../../ShortsPager';
import { DoubleTapLike } from '../../DoubleTapLike';
import { ClipPlayer } from '../../../visuals/ClipPlayer';
import { resolveClipSound, useClipSound } from '../../../visuals/useClipSound';
import { CoverArt } from '../../../audio/CoverArt';
import { ANIMATIONS_ENABLED } from '../../../../constants/theme';
import { Verified, compactTime, countShort } from '../../bits';
import {
  useAccountPosts,
  useMyAccount,
  useNotificationTarget,
  usePages,
  usePlatformFeed,
  useToggleSet,
  useTrendBoard,
  useWeek,
  type AppProps,
} from '../../hooks';
import { bioOf, followingOf } from '../../kit';
import { ActivityPage, Discover, FollowersPage, Inbox, K, TOK_DM, TokCreate, TokProfile, openNotificationIn, type TokActs } from './screens';
import { DmChat } from '../../dm/DmChat';
import { unreadCount } from '../../dm/DmList';
import { useDramaStore } from '../../../../store/dramaStore';

type Tab = 'home' | 'friends' | 'inbox' | 'me';
type Page =
  | { kind: 'watch'; posts: SocialPost[]; start: number }
  | { kind: 'account'; account: NpcAccount }
  | { kind: 'search' }
  | { kind: 'activity' }
  | { kind: 'followers' }
  | { kind: 'dm'; threadId: string }
  | { kind: 'create' };

/** Accounts on the Following / Friends feed: the people closest to the artist. */
const CLOSE: ReadonlySet<NpcAccount['accountType']> = new Set(['stan', 'fan']);

/**
 * TokTalk: the short-video app, built like TikTok. Full-screen videos with
 * sound, the rail on the right with the spinning sound disc, Following /
 * For You, comments that slide up, Friends, the Inbox, and posting a video
 * with one of your songs under it.
 */
export function TokTalkApp({ origin, notifId, tab: startTab }: AppProps) {
  const pages = usePages<Page>();
  const [tab, setTab] = useState<Tab>(startTab === 'inbox' ? 'inbox' : 'home');
  const [opened, setOpened] = useState<ReadonlySet<Tab>>(() => new Set<Tab>([startTab === 'inbox' ? 'inbox' : 'home']));
  const [feedKind, setFeedKind] = useState<'following' | 'foryou'>('foryou');
  const [sheet, setSheet] = useState<{ post: SocialPost; highlight?: string } | null>(null);
  const liked = useToggleSet();
  const saved = useToggleSet();
  const followed = useToggleSet();
  const { data, loadMore } = usePlatformFeed('tunetok');
  const trending = useTrendBoard();
  const items = useNotificationStore((s) => s.items);
  const player = usePlayerStore((s) => s.player);
  const me = useMyAccount('tunetok');
  const week = useWeek();

  const go = useCallback(
    (t: Tab) => {
      setTab(t);
      setOpened((o) => (o.has(t) ? o : new Set(o).add(t)));
      if (t === 'inbox') useNotificationStore.getState().markInboxSeen('tunetok');
      pages.home();
    },
    [pages]
  );

  const acts: TokActs = {
    week,
    liked: liked.set,
    saved: saved.set,
    followed: followed.set,
    like: liked.toggle,
    likeOnce: liked.add,
    save: saved.toggle,
    follow: followed.toggle,
    comments: (post, highlight) => setSheet({ post, highlight }),
    watch: (posts, start) => pages.push({ kind: 'watch', posts, start }),
    openAccount: (account) => (account.id === 'player' ? go('me') : pages.push({ kind: 'account', account })),
  };

  useNotificationTarget('tunetok', notifId, (n: PhoneNotification) => {
    pages.home();
    if (n.target.kind === 'tab') {
      go('inbox');
      return;
    }
    if (n.target.kind === 'dm') {
      go('inbox');
      pages.push({ kind: 'dm', threadId: n.target.threadId });
      return;
    }
    openNotificationIn(n, acts, (post, replyId) => {
      pages.push({ kind: 'watch', posts: [post], start: 0 });
      if (replyId !== undefined) setSheet({ post, highlight: replyId || undefined });
    });
  });

  useEffect(() => {
    if (startTab === 'inbox') {
      useNotificationStore.getState().markInboxSeen('tunetok');
      pages.push({ kind: 'activity' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mine = useMemo(() => (me ? freshAuthored(me.posts) : []), [me]);
  const forYou = useMemo(() => [...mine.slice(0, 1), ...data], [mine, data]);
  const friends = useMemo(() => data.filter((p) => CLOSE.has(p.account.accountType) || followed.set.has(p.account.id)), [data, followed.set]);
  const inboxSeen = useNotificationStore((s) => s.inboxSeen.tunetok ?? 0);
  const toks = items.filter((n) => n.app === 'tunetok');
  const unreadDms = useDramaStore((s) => unreadCount(s.dms, 'tunetok'));
  const unread = toks.filter((n) => n.at > inboxSeen).length + unreadDms;

  if (!me || !player) return null;

  const post = (picks: PhotoPick[], caption: string, beatId: string | null, location: string | null) => {
    pages.home();
    go('me');
    void postFromPhone({ platform: 'tunetok', account: me.account, caption, picks, beatId, location: location ?? undefined });
  };

  const tabs: NavTab<Tab | 'create'>[] = [
    { key: 'home', icon: 'home', label: 'Home' },
    { key: 'friends', icon: 'people', label: 'Friends' },
    { key: 'create', icon: 'add', render: () => <CreateButton /> },
    { key: 'inbox', icon: 'chatbox-ellipses', label: 'Inbox', badge: tab === 'inbox' ? 0 : Math.min(99, unread) },
    { key: 'me', icon: 'person', label: 'Profile' },
  ];

  const onBack = () => {
    if (sheet) {
      setSheet(null);
      return true;
    }
    if (pages.back()) return true;
    if (tab !== 'home') {
      go('home');
      return true;
    }
    return false;
  };

  const top = pages.stack.length === 0;
  const playing = (t: Tab) => tab === t && top && !sheet;

  return (
    <PhoneApp origin={origin} background={K.bg} statusBar="light" baseColor={K.bg} indicatorColor="#FFFFFF" onBack={onBack}>
      <View style={styles.fill}>
        {opened.has('home') ? (
          <View style={[styles.fill, tab !== 'home' && styles.hidden]}>
            <ShortsPager
              key={feedKind}
              posts={feedKind === 'foryou' ? forYou : friends}
              visible={playing('home')}
              onEndReached={feedKind === 'foryou' ? loadMore : undefined}
              renderItem={(p, active) => <TokItem post={p} acts={acts} active={active} />}
              empty={<Nobody />}
            />
            <FeedSwitch value={feedKind} onChange={setFeedKind} onSearch={() => pages.push({ kind: 'search' })} />
          </View>
        ) : null}
        {opened.has('friends') ? (
          <View style={[styles.fill, tab !== 'friends' && styles.hidden]}>
            <ShortsPager posts={friends} visible={playing('friends')} renderItem={(p, active) => <TokItem post={p} acts={acts} active={active} />} empty={<Nobody />} />
            <FriendsBar />
          </View>
        ) : null}
        {opened.has('inbox') ? (
          <View style={[styles.fill, tab !== 'inbox' && styles.hidden]}>
            <Inbox items={toks} acts={acts} onActivity={() => pages.push({ kind: 'activity' })} onFollowers={() => pages.push({ kind: 'followers' })} onOpenDm={(threadId) => pages.push({ kind: 'dm', threadId })} />
          </View>
        ) : null}
        {opened.has('me') ? (
          <View style={[styles.fill, tab !== 'me' && styles.hidden]}>
            <TokProfile account={me.account} bio={me.bio} following={me.following} likes={me.posts.reduce((s, p) => s + p.likes, 0)} posts={me.posts} acts={acts} isMe />
          </View>
        ) : null}

        {pages.stack.map((page, i) => (
          <PageLayer key={i} background={K.bg}>
            {page.kind === 'watch' ? (
              <View style={styles.fill}>
                <ShortsPager
                  posts={page.posts}
                  start={page.start}
                  visible={i === pages.stack.length - 1 && !sheet}
                  renderItem={(p, active) => <TokItem post={p} acts={acts} active={active} />}
                />
                <BackButton onPress={pages.back} />
              </View>
            ) : page.kind === 'account' ? (
              <AccountPage account={page.account} acts={acts} onBack={pages.back} />
            ) : page.kind === 'search' ? (
              <Discover data={data} trending={trending} acts={acts} onBack={pages.back} />
            ) : page.kind === 'activity' ? (
              <ActivityPage
                items={toks}
                acts={acts}
                onBack={pages.back}
                onOpenPost={(n) =>
                  openNotificationIn(n, acts, (p, replyId) => {
                    pages.push({ kind: 'watch', posts: [p], start: 0 });
                    if (replyId !== undefined) setSheet({ post: p, highlight: replyId || undefined });
                  })
                }
              />
            ) : page.kind === 'followers' ? (
              <FollowersPage items={toks.filter((n) => n.kind === 'follow')} acts={acts} onBack={pages.back} />
            ) : page.kind === 'dm' ? (
              <DmChat threadId={page.threadId} theme={TOK_DM} onBack={pages.back} />
            ) : (
              <TokCreate seed={player.id} onClose={pages.back} onPost={post} />
            )}
          </PageLayer>
        ))}
      </View>
      <AppNav
        tabs={tabs}
        value={tab}
        onChange={(k) => (k === 'create' ? pages.push({ kind: 'create' }) : go(k))}
        background={K.bg}
        active={K.text}
        inactive={K.muted}
        border={K.line}
        badgeColor={K.pink}
        variant="labeled"
        iconSize={25}
      />
      {sheet ? (
        <CommentsSheet
          post={sheet.post}
          look="tok"
          highlight={sheet.highlight}
          liked={liked.set}
          like={liked.toggle}
          meName={me.account.username}
          meHandle={me.account.handle}
          week={week}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </PhoneApp>
  );
}

/** TikTok's "+": a white key with a cyan edge and a pink edge. */
function CreateButton() {
  return (
    <View style={styles.create}>
      <View style={[styles.createEdge, styles.createCyan]} />
      <View style={[styles.createEdge, styles.createPink]} />
      <View style={styles.createFace}>
        <Ionicons name="add" size={22} color="#000000" />
      </View>
    </View>
  );
}

function Nobody() {
  return (
    <View style={styles.center}>
      <Ionicons name="people-outline" size={48} color={K.muted} />
      <T size={17} weight="700" style={styles.nobody}>
        Nothing from your friends yet
      </T>
      <T size={14} color={K.muted}>
        Follow people you know to see their videos here.
      </T>
    </View>
  );
}

function FriendsBar() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <View style={[styles.switch, { top: insets.top + 8 }]} pointerEvents="none">
        <T size={17} weight="700" style={styles.shadow}>
          Friends
        </T>
      </View>
      <ExitButton color={K.text} shadow style={[styles.friendsExit, { top: insets.top + 5 }]} />
    </>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable onPress={onPress} hitSlop={10} style={[styles.back, { top: insets.top + 8 }]} accessibilityLabel="Back">
      <Ionicons name="chevron-back" size={30} color={K.text} style={styles.shadow} />
    </Pressable>
  );
}

function FeedSwitch({ value, onChange, onSearch }: { value: 'following' | 'foryou'; onChange: (v: 'following' | 'foryou') => void; onSearch: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.switch, { top: insets.top + 6 }]} pointerEvents="box-none">
      <View style={styles.exitSide}>
        <ExitButton color={K.text} shadow />
      </View>
      <View style={styles.switchMid}>
        <Pressable onPress={onSearch} hitSlop={6}>
          <T size={16} weight="600" color="rgba(255,255,255,0.7)" style={styles.shadow}>
            Explore
          </T>
        </Pressable>
        {(['following', 'foryou'] as const).map((k) => (
          <Pressable key={k} onPress={() => onChange(k)} hitSlop={8} style={styles.switchTab}>
            <T size={value === k ? 17 : 16} weight={value === k ? '700' : '600'} color={value === k ? K.text : 'rgba(255,255,255,0.7)'} style={styles.shadow}>
              {k === 'following' ? 'Following' : 'For You'}
            </T>
            {value === k ? <View style={styles.switchBar} /> : null}
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onSearch} hitSlop={10} style={styles.switchSide} accessibilityLabel="Search">
        <Ionicons name="search" size={26} color={K.text} style={styles.shadow} />
      </Pressable>
    </View>
  );
}

// --- One video ----------------------------------------------------------------

function TokItem({ post, acts, active }: { post: SocialPost; acts: TokActs; active: boolean }) {
  const player = usePlayerStore((s) => s.player);
  const track = useMusicStore((s) => s.discography[0]?.title ?? null);
  const plan = useMemo(() => planClip(post, { playerName: player?.artistName ?? '', trackTitle: track }), [post, player?.artistName, track]);
  const sound = useMemo(() => resolveClipSound(plan.sound, post.id, post.account.handle), [plan.sound, post.id, post.account.handle]);
  const [paused, setPaused] = useState(false);
  const playing = active && !paused;
  useClipSound(sound, playing);

  // Leaving a video resets it: the next visit starts playing.
  useEffect(() => {
    if (!active) setPaused(false);
  }, [active]);

  const liked = acts.liked.has(post.id);
  const saved = acts.saved.has(post.id);
  const following = acts.followed.has(post.account.id);
  const isMe = post.account.id === 'player';
  const bookmarks = Math.round(post.likes * 0.06) + (saved ? 1 : 0);

  return (
    <View style={styles.fill}>
      <DoubleTapLike onLike={() => acts.likeOnce(post.id)} onTap={() => setPaused((p) => !p)} heartColor={K.pink} heartSize={110} style={StyleSheet.absoluteFill}>
        <ClipPlayer plan={plan} active={active} paused={paused} seed={post.id} style={StyleSheet.absoluteFill} progress captionInset={160} />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} start={{ x: 0.5, y: 0.6 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      </DoubleTapLike>
      {paused ? (
        <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)} style={styles.paused} pointerEvents="none">
          <Ionicons name="play" size={64} color="rgba(255,255,255,0.75)" />
        </Animated.View>
      ) : null}

      <View style={styles.rail}>
        <View style={styles.railFace}>
          <Pressable onPress={() => acts.openAccount(post.account)} accessibilityLabel={`${post.account.username}'s profile`}>
            <View style={styles.faceRing}>
              <Avatar id={post.account.id} name={post.account.username} size={46} />
            </View>
          </Pressable>
          {!isMe ? (
            <Pressable onPress={() => acts.follow(post.account.id)} style={[styles.followDot, following && styles.followDotOn]} hitSlop={6}>
              <Ionicons name={following ? 'checkmark' : 'add'} size={14} color={following ? K.pink : '#FFFFFF'} />
            </Pressable>
          ) : null}
        </View>
        <RailButton icon="heart" color={liked ? K.pink : K.text} n={post.likes + (liked ? 1 : 0)} onPress={() => acts.like(post.id)} />
        <RailButton icon="chatbubble-ellipses" color={K.text} n={post.replies} onPress={() => acts.comments(post)} />
        <RailButton icon="bookmark" color={saved ? '#FACE15' : K.text} n={bookmarks} onPress={() => acts.save(post.id)} />
        <RailButton icon="arrow-redo" color={K.text} n={post.shares ?? 0} />
        <Disc label={sound.label} spinning={playing} />
      </View>

      <View style={styles.caption} pointerEvents="box-none">
        <Pressable onPress={() => acts.openAccount(post.account)} style={styles.nameLine}>
          <T size={16} weight="700" style={styles.shadow}>
            {post.account.username}
          </T>
          {post.account.isVerified ? <Verified app="tok" size={14} /> : null}
          <T size={14} color="rgba(255,255,255,0.75)" style={styles.shadow}>
            · {compactTime(post, acts.week)}
          </T>
        </Pressable>
        <T size={15} lh={20} numberOfLines={3} style={styles.shadow}>
          {post.content}
        </T>
        {post.sponsored ? (
          <View style={styles.sponsored}>
            <T size={12} weight="600" style={styles.shadow}>
              Sponsored
            </T>
          </View>
        ) : post.location ? (
          <T size={13} color="rgba(255,255,255,0.85)" style={styles.shadow}>
            📍 {post.location}
          </T>
        ) : null}
        <Marquee text={sound.label} running={playing} />
      </View>
    </View>
  );
}

function RailButton({ icon, color, n, onPress }: { icon: string; color: string; n: number; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={6} style={styles.railBtn}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={36} color={color} style={styles.shadow} />
      <T size={13} weight="700" style={styles.shadow}>
        {countShort(n)}
      </T>
    </Pressable>
  );
}

/** The sound's record, turning while it plays. */
function Disc({ label, spinning }: { label: string; spinning: boolean }) {
  const r = useSharedValue(0);
  useEffect(() => {
    if (spinning && ANIMATIONS_ENABLED) {
      r.value = withRepeat(withTiming(r.value + 360, { duration: 6000, easing: Easing.linear }), -1);
    } else cancelAnimation(r);
    return () => cancelAnimation(r);
  }, [spinning, r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value % 360}deg` }] }));
  return (
    <Animated.View style={[styles.disc, st]}>
      <CoverArt coverArtId={null} title={label} size={26} />
    </Animated.View>
  );
}

/** The sound's name sliding along, while the sound plays. */
function Marquee({ text, running }: { text: string; running: boolean }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (running && w > 0 && ANIMATIONS_ENABLED) {
      x.value = 0;
      x.value = withRepeat(withTiming(-w - 40, { duration: (w + 40) * 28, easing: Easing.linear }), -1);
    } else {
      cancelAnimation(x);
      x.value = 0;
    }
    return () => cancelAnimation(x);
  }, [running, w, x]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const onLayout = (e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width);
    if (width !== w) setW(width);
  };
  return (
    <View style={styles.sound}>
      <Ionicons name="musical-note" size={14} color={K.text} />
      <View style={styles.marqueeBox}>
        <Animated.View style={[styles.marqueeRow, st]}>
          <T size={14} style={styles.shadow} onLayout={onLayout} numberOfLines={1}>
            {text}
          </T>
          <T size={14} style={[styles.shadow, styles.marqueeGap]} numberOfLines={1}>
            {text}
          </T>
        </Animated.View>
      </View>
    </View>
  );
}

function AccountPage({ account, acts, onBack }: { account: NpcAccount; acts: TokActs; onBack: () => void }) {
  const posts = useAccountPosts(account, 'tunetok', 12);
  const likes = useMemo(() => posts.reduce((s, p) => s + p.likes, 0), [posts]);
  return (
    <TokProfile
      account={account}
      bio={bioOf(account)}
      following={followingOf(account)}
      likes={likes}
      posts={posts}
      acts={acts}
      onBack={onBack}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { display: 'none' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 30 },
  nobody: { marginTop: 8 },
  shadow: { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  back: { position: 'absolute', left: 8 },
  friendsExit: { position: 'absolute', left: 14 },

  switch: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  exitSide: { width: 40 },
  switchMid: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 18 },
  switchTab: { alignItems: 'center' },
  switchBar: { width: 28, height: 3, borderRadius: 2, backgroundColor: K.text, marginTop: 5 },
  switchSide: { width: 40, alignItems: 'flex-end' },

  create: { width: 46, height: 30, alignItems: 'center', justifyContent: 'center' },
  createEdge: { position: 'absolute', width: 40, height: 30, borderRadius: 8 },
  createCyan: { left: 0, backgroundColor: K.cyan },
  createPink: { right: 0, backgroundColor: K.pink },
  createFace: { width: 38, height: 30, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },

  paused: { position: 'absolute', alignSelf: 'center', top: '42%' },
  rail: { position: 'absolute', right: 8, bottom: 26, alignItems: 'center', gap: 16 },
  railFace: { alignItems: 'center', marginBottom: 8 },
  faceRing: { padding: 1.5, borderRadius: 26, backgroundColor: '#FFFFFF' },
  followDot: { position: 'absolute', bottom: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: K.pink, alignItems: 'center', justifyContent: 'center' },
  followDotOn: { backgroundColor: '#FFFFFF' },
  railBtn: { alignItems: 'center', gap: 2 },
  disc: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#161616', borderWidth: 8, borderColor: '#2B2B2B', alignItems: 'center', justifyContent: 'center', marginTop: 6, overflow: 'hidden' },
  caption: { position: 'absolute', left: 14, right: 86, bottom: 22, gap: 6 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sponsored: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' },
  sound: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  marqueeBox: { flex: 1, overflow: 'hidden' },
  marqueeRow: { flexDirection: 'row' },
  marqueeGap: { marginLeft: 40 },
});
