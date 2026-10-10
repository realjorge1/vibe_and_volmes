import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { NpcAccount, SocialPost } from '../../../../types/social';
import type { PhoneNotification } from '../../../../types/notifications';
import { usePlayerStore } from '../../../../store/playerStore';
import { useMusicStore } from '../../../../store/musicStore';
import { useSocialStore } from '../../../../store/socialStore';
import { useNotificationStore } from '../../../../store/notificationStore';
import { findAccount, findPost } from '../../../../systems/social/postLookup';
import { freshAuthored } from '../../../../systems/social/authored';
import { postFromPhone, type PhotoPick } from '../../../../systems/social/postFromPhone';
import { PickImage } from '../../gallery/Gallery';
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
import { countShort } from '../../bits';
import {
  accountsOn,
  searchableOn,
  useAccountPosts,
  useMyAccount,
  useNotificationTarget,
  usePages,
  usePlatformFeed,
  useToggleSet,
  useWeek,
  type AppProps,
} from '../../hooks';
import { bioOf, followingOf } from '../../kit';
import { G, GRAM_DM, GramPost, Wordmark, type GramActs, type GramPage } from './parts';
import { DmChat } from '../../dm/DmChat';
import { unreadCount } from '../../dm/DmList';
import { useDramaStore } from '../../../../store/dramaStore';
import { Activity, Chat, CreateFlow, GramProfile, Messages, PostPage, Tile } from './screens';
import { StoryViewer, storiesFor, storyFromPost, type StoryReel } from './Stories';

type Tab = 'home' | 'explore' | 'reels' | 'me';

/**
 * VibeGram: the photo app, built like Instagram. Script wordmark, the stories
 * tray, edge-to-edge photos with counts beside the icons, Reels, Explore's
 * mosaic, the activity heart, DMs, and posting from your camera roll.
 */
export function VibeGramApp({ origin, notifId, tab: startTab }: AppProps) {
  const pages = usePages<GramPage>();
  const [tab, setTab] = useState<Tab>('home');
  const [opened, setOpened] = useState<ReadonlySet<Tab>>(() => new Set<Tab>(['home']));
  const [viewer, setViewer] = useState<{ reels: StoryReel[]; start: number } | null>(null);
  const [sheet, setSheet] = useState<{ post: SocialPost; highlight?: string } | null>(null);
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  /** A post on its way up (real photos are copied first): Instagram's "Posting..." bar. */
  const [upload, setUpload] = useState<{ pick: PhotoPick | null; failed: boolean } | null>(null);
  const liked = useToggleSet();
  const saved = useToggleSet();
  const followed = useToggleSet();
  const { data, loadMore, refresh } = usePlatformFeed('flashpic');
  const authored = useSocialStore((s) => s.authored);
  const items = useNotificationStore((s) => s.items);
  const player = usePlayerStore((s) => s.player);
  const track = useMusicStore((s) => s.discography[0]?.title ?? null);
  const me = useMyAccount('flashpic');
  const week = useWeek();
  const heartSeen = useNotificationStore((s) => s.inboxSeen.flashpic ?? 0);
  const openActivity = useCallback(() => {
    useNotificationStore.getState().markInboxSeen('flashpic');
    pages.push({ kind: 'activity' });
  }, [pages]);

  const artist = player?.artistName ?? '';
  const handle = me?.account.handle ?? '';
  const meInfo = useMemo(() => ({ handle, artist, trackTitle: track }), [handle, artist, track]);
  const storyAccounts = useMemo(() => accountsOn('flashpic'), []);
  const myStories = useMemo(() => authored.filter((p) => p.platform === 'flashpic' && /story/.test(p.media?.description ?? '')), [authored]);

  const reelFor = useCallback(
    (account: NpcAccount, lead?: SocialPost): StoryReel => {
      const base = account.id === 'player' ? myStories.map((p) => storyFromPost(p, meInfo)) : storiesFor(account, meInfo, week);
      return { account, items: lead ? [storyFromPost(lead, meInfo), ...base] : base };
    },
    [meInfo, week, myStories]
  );

  const openStoryOf = useCallback(
    (accountId: string, lead?: SocialPost) => {
      if (accountId === 'player') {
        if (!me || myStories.length === 0) return;
        setViewer({ reels: [reelFor(me.account, lead)], start: 0 });
        return;
      }
      const tray = storyAccounts.filter((a) => a.id !== accountId);
      const target = storyAccounts.find((a) => a.id === accountId) ?? lead?.account ?? findAccount(accountId, 'flashpic');
      if (!target) return;
      setViewer({ reels: [reelFor(target, lead), ...tray.map((a) => reelFor(a))], start: 0 });
    },
    [me, myStories.length, reelFor, storyAccounts]
  );

  const go = useCallback(
    (t: Tab) => {
      setTab(t);
      setOpened((o) => (o.has(t) ? o : new Set(o).add(t)));
      pages.home();
    },
    [pages]
  );

  useNotificationTarget('flashpic', notifId, (n: PhoneNotification) => {
    const t = n.target;
    pages.home();
    if (t.kind === 'story') openStoryOf(t.accountId, n.post);
    else if (t.kind === 'post' || t.kind === 'comments') {
      const post = findPost(t.postId) ?? n.post;
      if (!post) return;
      pages.push({ kind: 'post', post });
      if (t.replyId) setSheet({ post, highlight: t.replyId });
    } else if (t.kind === 'account') {
      const a = findAccount(t.accountId, 'flashpic', n.actor);
      if (a) pages.push({ kind: 'account', account: a });
    } else if (t.kind === 'dm') {
      pages.push({ kind: 'messages' });
      pages.push({ kind: 'dm', threadId: t.threadId });
    } else {
      openActivity();
    }
  });

  // A summary tap ("VibeGram · 4 new") opens on the activity heart.
  React.useEffect(() => {
    if (startTab === 'inbox') openActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acts: GramActs = {
    week,
    liked: liked.set,
    saved: saved.set,
    followed: followed.set,
    like: liked.toggle,
    likeOnce: liked.add,
    save: saved.toggle,
    follow: followed.toggle,
    openPost: (post) => pages.push({ kind: 'post', post }),
    openComments: (post) => setSheet({ post }),
    openAccount: (account) => (account.id === 'player' ? go('me') : pages.push({ kind: 'account', account })),
    hasStory: (id) => (id === 'player' ? myStories.length > 0 : storyAccounts.some((a) => a.id === id) && !seen.has(id)),
    openStory: (id) => openStoryOf(id),
  };

  const mine = useMemo(() => (me ? freshAuthored(me.posts).filter((p) => !/story/.test(p.media?.description ?? '')) : []), [me]);
  const feed = useMemo(() => [...mine.slice(0, 2), ...data], [mine, data]);
  const reels = useMemo(() => data.filter((p) => p.media), [data]);

  if (!me || !player) return null;

  const grams = items.filter((n) => n.app === 'flashpic');
  const newHearts = grams.filter((n) => n.at > heartSeen).length;
  const profilePosts = me.posts.filter((p) => !/story/.test(p.media?.description ?? ''));

  const share = (picks: PhotoPick[], caption: string, mode: 'post' | 'story', location: string | null) => {
    setUpload({ pick: picks[0] ?? null, failed: false });
    pages.home();
    go('home');
    void postFromPhone({ platform: 'flashpic', account: me.account, caption, picks, mode, location: location ?? undefined }).then((r) =>
      setUpload(r.ok ? null : { pick: picks[0] ?? null, failed: true })
    );
  };

  const tabs: NavTab<Tab | 'create'>[] = [
    { key: 'home', icon: 'home' },
    { key: 'explore', icon: 'search', render: (on) => <Ionicons name="search" size={on ? 28 : 26} color={G.text} /> },
    { key: 'create', icon: 'add', render: () => <MaterialCommunityIcons name="plus-box-outline" size={28} color={G.text} /> },
    { key: 'reels', icon: 'film', render: (on) => <MaterialCommunityIcons name={on ? 'movie-open-play' : 'movie-open-play-outline'} size={27} color={G.text} /> },
    {
      key: 'me',
      icon: 'person',
      render: (on) => (
        <View style={[styles.navMe, on && styles.navMeOn]}>
          <Avatar id="player" name={me.account.username} size={25} />
        </View>
      ),
    },
  ];

  const onBack = () => {
    if (viewer) {
      setViewer(null);
      return true;
    }
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

  return (
    <PhoneApp origin={origin} background={G.bg} statusBar="light" baseColor={G.bg} indicatorColor="#FFFFFF" onBack={onBack}>
      <View style={styles.fill}>
        {opened.has('home') ? (
          <View style={[styles.fill, tab !== 'home' && styles.hidden]}>
            <Home
              feed={feed}
              acts={acts}
              artist={artist}
              track={track}
              me={me.account}
              myStory={myStories.length > 0}
              storyAccounts={storyAccounts}
              seen={seen}
              hearts={newHearts}
              onHeart={openActivity}
              onMessages={() => pages.push({ kind: 'messages' })}
              onCreate={() => pages.push({ kind: 'create' })}
              onEnd={loadMore}
              onRefresh={refresh}
              upload={upload}
              onDismissUpload={() => setUpload(null)}
            />
          </View>
        ) : null}
        {opened.has('explore') ? (
          <View style={[styles.fill, tab !== 'explore' && styles.hidden]}>
            <Explore data={data} acts={acts} onReel={(posts, start) => pages.push({ kind: 'reels', posts, start })} />
          </View>
        ) : null}
        {opened.has('reels') ? (
          <View style={[styles.fill, tab !== 'reels' && styles.hidden]}>
            <Reels posts={reels} acts={acts} visible={tab === 'reels' && pages.stack.length === 0 && !viewer} onEnd={loadMore} />
          </View>
        ) : null}
        {opened.has('me') ? (
          <View style={[styles.fill, tab !== 'me' && styles.hidden]}>
            <GramProfile
              account={me.account}
              bio={me.bio}
              following={me.following}
              posts={profilePosts}
              acts={acts}
              isMe
              hasStory={myStories.length > 0}
              openStory={() => openStoryOf('player')}
            />
          </View>
        ) : null}

        {pages.stack.map((page, i) => (
          <PageLayer key={i} background={G.bg}>
            {page.kind === 'post' ? (
              <PostPage post={page.post} acts={acts} artist={artist} track={track} onBack={pages.back} />
            ) : page.kind === 'account' ? (
              <AccountPage
                account={page.account}
                acts={acts}
                onBack={pages.back}
                onMessage={() => pages.push({ kind: 'chat', account: page.account })}
                openStory={() => openStoryOf(page.account.id)}
              />
            ) : page.kind === 'activity' ? (
              <Activity items={grams} myPosts={profilePosts} myFollowers={me.account.followers} acts={acts} onBack={pages.back} />
            ) : page.kind === 'messages' ? (
              <Messages me={me.account} onBack={pages.back} onOpen={(threadId) => pages.push({ kind: 'dm', threadId })} />
            ) : page.kind === 'dm' ? (
              <DmChat threadId={page.threadId} theme={GRAM_DM} onBack={pages.back} />
            ) : page.kind === 'chat' ? (
              <Chat account={page.account} onBack={pages.back} />
            ) : page.kind === 'reels' ? (
              <Reels posts={page.posts} start={page.start} acts={acts} visible={i === pages.stack.length - 1 && !viewer} onBack={pages.back} />
            ) : (
              <CreateFlow seed={player.id} onClose={pages.back} onShare={share} />
            )}
          </PageLayer>
        ))}
      </View>
      <AppNav
        tabs={tabs}
        value={tab}
        onChange={(k) => (k === 'create' ? pages.push({ kind: 'create' }) : go(k))}
        background={G.bg}
        active={G.text}
        inactive={G.text}
        border={G.line}
        badgeColor={G.red}
      />
      {sheet ? (
        <CommentsSheet
          post={sheet.post}
          look="gram"
          highlight={sheet.highlight}
          liked={liked.set}
          like={liked.toggle}
          meName={me.account.username}
          meHandle={me.account.handle}
          week={week}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {viewer ? (
        <StoryViewer
          reels={viewer.reels}
          start={viewer.start}
          onSeen={(id) => setSeen((s) => (s.has(id) ? s : new Set(s).add(id)))}
          onClose={() => setViewer(null)}
          onAccount={(a) => {
            setViewer(null);
            acts.openAccount(a);
          }}
        />
      ) : null}
    </PhoneApp>
  );
}

// --- Home ---------------------------------------------------------------------

function Home({
  feed,
  acts,
  artist,
  track,
  me,
  myStory,
  storyAccounts,
  seen,
  hearts,
  onHeart,
  onMessages,
  onCreate,
  onEnd,
  onRefresh,
  upload,
  onDismissUpload,
}: {
  feed: SocialPost[];
  acts: GramActs;
  artist: string;
  track: string | null;
  me: NpcAccount;
  myStory: boolean;
  storyAccounts: NpcAccount[];
  seen: ReadonlySet<string>;
  hearts: number;
  onHeart: () => void;
  onMessages: () => void;
  onCreate: () => void;
  onEnd: () => void;
  onRefresh: () => void;
  upload: { pick: PhotoPick | null; failed: boolean } | null;
  onDismissUpload: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const unreadDms = useDramaStore((s) => unreadCount(s.dms, 'flashpic'));
  // Unseen stories first, the way the tray sorts them.
  const tray = useMemo(() => [...storyAccounts.filter((a) => !seen.has(a.id)), ...storyAccounts.filter((a) => seen.has(a.id))], [storyAccounts, seen]);

  const header = (
    <View>
      <View style={styles.storiesWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stories}>
          <Pressable onPress={myStory ? () => acts.openStory('player') : onCreate} style={styles.story}>
            <View>
              <Avatar id="player" name={me.username} size={70} ring={myStory ? 'new' : undefined} gapColor={G.bg} />
              {!myStory ? (
                <View style={styles.plus}>
                  <Ionicons name="add" size={15} color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <T size={12} color={G.muted} numberOfLines={1} style={styles.storyName}>
              Your story
            </T>
          </Pressable>
          {tray.map((a) => (
            <Pressable key={a.id} onPress={() => acts.openStory(a.id)} style={styles.story}>
              <Avatar id={a.id} name={a.username} size={66} ring={seen.has(a.id) ? 'seen' : 'new'} gapColor={G.bg} />
              <T size={12} color={G.text} numberOfLines={1} style={styles.storyName}>
                {a.handle}
              </T>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {upload ? (
        <View style={styles.upload}>
          {upload.pick ? <PickImage pick={upload.pick} style={styles.uploadThumb} /> : <View style={styles.uploadThumb} />}
          <T size={14} color={G.text} style={styles.fill}>
            {upload.failed ? 'Couldn’t post. That photo couldn’t be opened.' : 'Posting...'}
          </T>
          {upload.failed ? (
            <Pressable onPress={onDismissUpload} hitSlop={10}>
              <Ionicons name="close" size={20} color={G.text} />
            </Pressable>
          ) : null}
          {!upload.failed ? <View style={styles.uploadBar} /> : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.fill}>
      <View style={[styles.homeBar, { paddingTop: insets.top }]}>
        <View style={styles.lead}>
          <ExitButton color={G.text} />
          <Pressable style={styles.wordmark}>
            <Wordmark />
            <Ionicons name="chevron-down" size={15} color={G.text} style={styles.wordChevron} />
          </Pressable>
        </View>
        <View style={styles.homeIcons}>
          <Pressable onPress={onHeart} hitSlop={8} accessibilityLabel="Notifications">
            <Ionicons name="heart-outline" size={27} color={G.text} />
            {hearts > 0 ? <View style={styles.heartDot} /> : null}
          </Pressable>
          <Pressable onPress={onMessages} hitSlop={8} accessibilityLabel="Messages">
            <MaterialCommunityIcons name="message-flash-outline" size={27} color={G.text} />
            {unreadDms > 0 ? (
              <View style={styles.dmBadge}>
                <T size={11} weight="700">
                  {unreadDms > 9 ? '9+' : unreadDms}
                </T>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
      <FlatList
        data={feed}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <GramPost post={item} acts={acts} artist={artist} track={track} />}
        ListHeaderComponent={header}
        onEndReached={onEnd}
        onEndReachedThreshold={0.6}
        extraData={acts}
        initialNumToRender={3}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => {
                onRefresh();
                setRefreshing(false);
              }, 700);
            }}
            colors={['#FFFFFF']}
            progressBackgroundColor="#262626"
            tintColor="#FFFFFF"
          />
        }
      />
    </View>
  );
}

// --- Explore --------------------------------------------------------------------

function Explore({ data, acts, onReel }: { data: SocialPost[]; acts: GramActs; onReel: (posts: SocialPost[], start: number) => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const people = useMemo(
    () => (query ? searchableOn('flashpic').filter((a) => a.handle.includes(query) || a.username.toLowerCase().includes(query)) : []),
    [query]
  );
  const shown = useMemo(() => data.filter((p) => p.media), [data]);
  const cell = (width - 2) / 3;
  const blocks = useMemo(() => {
    const out: SocialPost[][] = [];
    for (let i = 0; i < shown.length; i += 5) out.push(shown.slice(i, i + 5));
    return out;
  }, [shown]);
  const reels = useMemo(() => shown.filter((p) => p.media?.kind === 'video' || hashOfStr(p.id) % 3 === 0), [shown]);

  return (
    <View style={styles.fill}>
      <View style={[styles.searchWrap, { paddingTop: insets.top + 8 }]}>
        <ExitButton color={G.text} />
        <View style={styles.search}>
          <Ionicons name="search" size={17} color={G.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search"
            placeholderTextColor={G.muted}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={G.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {query ? (
        <FlatList
          data={people}
          keyExtractor={(a) => a.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable onPress={() => acts.openAccount(item)} style={styles.person}>
              <Avatar id={item.id} name={item.username} size={48} />
              <View>
                <T size={14} weight="700" color={G.text}>
                  {item.handle}
                </T>
                <T size={14} color={G.muted}>
                  {item.username} · {countShort(item.followers)} followers
                </T>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <T size={14} color={G.muted} center style={styles.emptyText}>
              No results found for “{q.trim()}”.
            </T>
          }
        />
      ) : (
        <FlatList
          data={blocks}
          keyExtractor={(b, i) => `${b[0]?.id ?? 'b'}-${i}`}
          renderItem={({ item, index }) => <Block posts={item} cell={cell} tallLeft={index % 2 === 1} onOpen={(p) => (reels.includes(p) ? onReel(reels, reels.indexOf(p)) : acts.openPost(p))} />}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function hashOfStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Explore's mosaic: one tall reel beside four squares, alternating sides. */
function Block({ posts, cell, tallLeft, onOpen }: { posts: SocialPost[]; cell: number; tallLeft: boolean; onOpen: (p: SocialPost) => void }) {
  const [tall, ...small] = posts;
  const h = cell * 2 + 1;
  const tallX = tallLeft ? 0 : (cell + 1) * 2;
  const cols = tallLeft ? [cell + 1, (cell + 1) * 2] : [0, cell + 1];
  return (
    <View style={{ height: h }}>
      {tall ? (
        <View style={[styles.abs, { left: tallX, width: cell, height: h }]}>
          <Tile post={{ ...tall, media: tall.media ? { ...tall.media, kind: 'video' } : tall.media }} w={cell} h={h} onPress={() => onOpen(tall)} />
        </View>
      ) : null}
      {small.map((p, i) => (
        <View key={p.id} style={[styles.abs, { left: cols[i % 2], top: i < 2 ? 0 : cell + 1, width: cell, height: cell }]}>
          <Tile post={p} w={cell} h={cell} onPress={() => onOpen(p)} />
        </View>
      ))}
    </View>
  );
}

// --- Reels ------------------------------------------------------------------------

/** Reels: the tab leaves the app from its chevron; opened from Explore (`onBack`), it goes back there. */
function Reels({
  posts,
  acts,
  visible,
  start = 0,
  onEnd,
  onBack,
}: {
  posts: SocialPost[];
  acts: GramActs;
  visible: boolean;
  start?: number;
  onEnd?: () => void;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.fill}>
      <ShortsPager
        posts={posts}
        start={start}
        visible={visible}
        onEndReached={onEnd}
        renderItem={(post, active) => <ReelItem post={post} acts={acts} active={active} />}
        empty={
          <View style={styles.center}>
            <T size={16} color={G.muted}>
              No reels yet.
            </T>
          </View>
        }
      />
      <View style={[styles.reelsTop, { top: insets.top + 6 }]} pointerEvents="box-none">
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" style={styles.shadow} />
          </Pressable>
        ) : (
          <ExitButton color="#FFFFFF" shadow />
        )}
        <View style={styles.reelsTitle} pointerEvents="none">
          <T size={24} weight="800" style={styles.shadow}>
            Reels
          </T>
          <Ionicons name="camera-outline" size={28} color="#FFFFFF" style={styles.shadow} />
        </View>
      </View>
    </View>
  );
}

function ReelItem({ post, acts, active }: { post: SocialPost; acts: GramActs; active: boolean }) {
  const player = usePlayerStore((s) => s.player);
  const track = useMusicStore((s) => s.discography[0]?.title ?? null);
  const plan = useMemo(() => planClip(post, { playerName: player?.artistName ?? '', trackTitle: track }), [post, player?.artistName, track]);
  const sound = useMemo(() => resolveClipSound(plan.sound, post.id, post.account.handle), [plan.sound, post.id, post.account.handle]);
  const [muted, setMuted] = useState(false);
  const [flash, setFlash] = useState(0);
  useClipSound(sound, active, muted);
  const liked = acts.liked.has(post.id);
  const follows = acts.followed.has(post.account.id);

  return (
    <View style={styles.fill}>
      <DoubleTapLike
        onLike={() => acts.likeOnce(post.id)}
        onTap={() => {
          setMuted((m) => !m);
          setFlash(Date.now());
        }}
        style={StyleSheet.absoluteFill}
      >
        <ClipPlayer plan={plan} active={active} seed={post.id} style={StyleSheet.absoluteFill} captionInset={140} />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']} start={{ x: 0.5, y: 0.55 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      </DoubleTapLike>
      {flash ? (
        <Animated.View key={flash} entering={FadeIn.duration(120)} exiting={FadeOut.duration(400)} style={styles.muteFlash} pointerEvents="none">
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={26} color="#FFFFFF" />
        </Animated.View>
      ) : null}
      <View style={styles.rail}>
        <RailBtn icon={liked ? 'heart' : 'heart-outline'} color={liked ? G.red : '#FFFFFF'} n={post.likes + (liked ? 1 : 0)} onPress={() => acts.like(post.id)} />
        <RailBtn icon="chatbubble-outline" n={post.replies} onPress={() => acts.openComments(post)} flip />
        <RailBtn mci="repeat-variant" n={post.reposts} />
        <RailBtn icon="paper-plane-outline" n={post.shares ?? 0} />
        <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" style={styles.shadow} />
        <View style={styles.audioSquare}>
          <CoverArt coverArtId={null} title={sound.label} size={30} />
        </View>
      </View>
      <View style={styles.reelInfo}>
        <View style={styles.reelWho}>
          <Pressable onPress={() => acts.openAccount(post.account)} style={styles.reelWho}>
            <Avatar id={post.account.id} name={post.account.username} size={32} />
            <T size={14} weight="700" style={styles.shadow}>
              {post.account.handle}
            </T>
          </Pressable>
          {post.account.id !== 'player' ? (
            <Pressable onPress={() => acts.follow(post.account.id)} style={styles.reelFollow}>
              <T size={13} weight="700">
                {follows ? 'Following' : 'Follow'}
              </T>
            </Pressable>
          ) : null}
        </View>
        <T size={14} numberOfLines={2} lh={19} style={[styles.reelCaption, styles.shadow]}>
          {post.content}
        </T>
        <View style={styles.reelAudio}>
          <Ionicons name="musical-notes" size={13} color="#FFFFFF" />
          <T size={13} numberOfLines={1} style={[styles.flexShrink, styles.shadow]}>
            {sound.mine ? sound.label : `${post.account.handle} · Original audio`}
          </T>
        </View>
      </View>
    </View>
  );
}

function RailBtn({ icon, mci, n, color = '#FFFFFF', onPress, flip }: { icon?: string; mci?: string; n: number; color?: string; onPress?: () => void; flip?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={6} style={styles.railBtn}>
      {mci ? (
        <MaterialCommunityIcons name={mci as keyof typeof MaterialCommunityIcons.glyphMap} size={30} color={color} style={styles.shadow} />
      ) : (
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={28} color={color} style={[styles.shadow, flip && styles.flip]} />
      )}
      <T size={13} weight="600" style={styles.shadow}>
        {countShort(n)}
      </T>
    </Pressable>
  );
}

// --- Someone else's profile ----------------------------------------------------------

function AccountPage({
  account,
  acts,
  onBack,
  onMessage,
  openStory,
}: {
  account: NpcAccount;
  acts: GramActs;
  onBack: () => void;
  onMessage: () => void;
  openStory: () => void;
}) {
  const posts = useAccountPosts(account, 'flashpic', 12);
  return (
    <GramProfile
      account={account}
      bio={bioOf(account)}
      following={followingOf(account)}
      posts={posts}
      acts={acts}
      onBack={onBack}
      onMessage={onMessage}
      hasStory={acts.hasStory(account.id)}
      openStory={openStory}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  hidden: { display: 'none' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  abs: { position: 'absolute', top: 0 },
  gap: { height: 1 },
  flip: { transform: [{ scaleX: -1 }] },
  shadow: { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  homeBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 10, paddingRight: 16, minHeight: 56 },
  lead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wordChevron: { marginTop: 6 },
  homeIcons: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  heartDot: { position: 'absolute', right: -1, bottom: -2, width: 7, height: 7, borderRadius: 4, backgroundColor: G.red },
  dmBadge: { position: 'absolute', top: -5, right: -8, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: G.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: G.bg },

  navMe: { padding: 1.5, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
  navMeOn: { borderColor: G.text },

  storiesWrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: G.line },
  upload: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: G.line },
  uploadThumb: { width: 40, height: 40, borderRadius: 4, backgroundColor: G.field },
  uploadBar: { position: 'absolute', left: 0, bottom: 0, height: 2, width: '62%', backgroundColor: G.blue },
  stories: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 12, gap: 12 },
  story: { alignItems: 'center', width: 80, gap: 5 },
  storyName: { maxWidth: 78 },
  plus: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: G.blue,
    borderWidth: 2.5,
    borderColor: G.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8, paddingRight: 12, paddingBottom: 8 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 12, borderRadius: 10, backgroundColor: G.field },
  searchInput: { flex: 1, color: G.text, fontSize: 15, paddingVertical: 0 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  emptyText: { paddingVertical: 40 },

  reelsTop: { position: 'absolute', left: 10, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  reelsTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muteFlash: { position: 'absolute', alignSelf: 'center', top: '45%', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', right: 10, bottom: 22, alignItems: 'center', gap: 18 },
  railBtn: { alignItems: 'center', gap: 3 },
  audioSquare: { borderRadius: 6, borderWidth: 2, borderColor: '#FFFFFF', overflow: 'hidden' },
  reelInfo: { position: 'absolute', left: 14, right: 76, bottom: 22, gap: 8 },
  reelWho: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reelFollow: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  reelCaption: {},
  reelAudio: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '90%', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
});
