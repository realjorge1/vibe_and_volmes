import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { NpcAccount, SocialPost, TrendingTopic } from '../../../../types/social';
import type { ThreadReply } from '../../../../systems/social/threadGenerator';
import type { PhoneNotification } from '../../../../types/notifications';
import { usePlayerStore } from '../../../../store/playerStore';
import { useNotificationStore } from '../../../../store/notificationStore';
import { findAccount, findPost } from '../../../../systems/social/postLookup';
import { freshAuthored, isAuthored } from '../../../../systems/social/authored';
import { pickKey, postFromPhone, type PhotoPick } from '../../../../systems/social/postFromPhone';
import { useGallery } from '../../gallery/useGallery';
import { realTopicsNow } from '../../../../systems/realworld/refresh';
import { bareName, realPost } from '../../../../systems/realworld/posts';
import { PickImage } from '../../gallery/Gallery';
import { GalleryPage } from '../../gallery/GalleryPage';
import { LocationPicker, type PickerTheme } from '../../gallery/LocationPicker';
import { KeyboardSpacer } from '../../KeyboardSpacer';
import { pickPhoto } from '../../../../systems/visuals/photoIndex';
import { genreLabel } from '../../../../utils/formatters';
import { T } from '../../T';
import { ExitButton, PhoneApp } from '../../PhoneApp';
import { AppNav, type NavTab } from '../../AppNav';
import { Avatar } from '../../Avatar';
import { PageHeader, PageLayer } from '../../Page';
import { Photo } from '../../../visuals/Photo';
import { Verified, count, countShort, sinceMs } from '../../bits';
import {
  searchableOn,
  useAccountPosts,
  useMyAccount,
  useNotificationTarget,
  usePages,
  usePlatformFeed,
  useSendComment,
  useThread,
  useToggleSet,
  useTrendBoard,
  useWeek,
  type AppProps,
} from '../../hooks';
import { TREND_KIND, bioOf, followingOf, hashOf, someAccounts } from '../../kit';
import { Actions, C, CHIRP_DM, ChirpMedia, Empty, Poll, PostRow, ReplyRow, Rule, type Acts, type Page } from './parts';
import { DmChat } from '../../dm/DmChat';
import { DmList } from '../../dm/DmList';
import { useDramaStore } from '../../../../store/dramaStore';

type Tab = 'home' | 'explore' | 'communities' | 'alerts' | 'messages';

/** Accounts on the Following timeline: the outlets and voices the artist follows. */
const FOLLOWS: ReadonlySet<NpcAccount['accountType']> = new Set(['news', 'industry', 'critic', 'gossip']);

/**
 * Chirp: the timeline app, built like X. Lights-out black, the header that
 * slides away as you scroll, For you / Following, the blue compose button,
 * Explore, Communities, Notifications and Messages.
 */
export function ChirpApp({ origin, notifId, tab: startTab }: AppProps) {
  const first: Tab = startTab === 'inbox' ? 'alerts' : startTab === 'explore' ? 'explore' : 'home';
  const pages = usePages<Page>();
  const [tab, setTab] = useState<Tab>(first);
  const [opened, setOpened] = useState<ReadonlySet<Tab>>(() => new Set<Tab>([first]));
  const liked = useToggleSet();
  const reposted = useToggleSet();
  const bookmarked = useToggleSet();
  const followed = useToggleSet();
  const [profileOpen, setProfileOpen] = useState(false);
  const { data, loadMore, refresh } = usePlatformFeed('chirper');
  const trending = useTrendBoard();
  const items = useNotificationStore((s) => s.items);
  const dramaDms = useDramaStore((s) => s.dms);
  const bellSeen = useNotificationStore((s) => s.inboxSeen.chirper ?? 0);
  const me = useMyAccount('chirper');
  const week = useWeek();

  const go = useCallback(
    (t: Tab) => {
      setTab(t);
      setOpened((o) => (o.has(t) ? o : new Set(o).add(t)));
      if (t === 'alerts') useNotificationStore.getState().markInboxSeen('chirper');
      setProfileOpen(false);
      pages.home();
    },
    [pages]
  );

  // Opened straight onto Notifications (a summary tap): they count as seen.
  React.useEffect(() => {
    if (first === 'alerts') useNotificationStore.getState().markInboxSeen('chirper');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useNotificationTarget('chirper', notifId, (n: PhoneNotification) => {
    const t = n.target;
    if (t.kind === 'post' || t.kind === 'comments') {
      const post = findPost(t.postId) ?? n.post;
      if (post) {
        pages.home();
        pages.push({ kind: 'post', post, highlight: t.replyId });
      }
    } else if (t.kind === 'account') {
      const a = findAccount(t.accountId, 'chirper', n.actor);
      if (a) pages.push({ kind: 'account', account: a });
    } else if (t.kind === 'trend') {
      pages.push({ kind: 'trend', hashtag: t.hashtag, volume: 0 });
    } else if (t.kind === 'dm') {
      go('messages');
      pages.push({ kind: 'dm', threadId: t.threadId });
    } else {
      go('alerts');
    }
  });

  const acts: Acts = {
    week,
    liked: liked.set,
    reposted: reposted.set,
    bookmarked: bookmarked.set,
    like: liked.toggle,
    repost: reposted.toggle,
    bookmark: bookmarked.toggle,
    openPost: (post) => pages.push({ kind: 'post', post }),
    openAccount: (account) => (account.id === 'player' ? setProfileOpen(true) : pages.push({ kind: 'account', account })),
    compose: (replyTo) => pages.push({ kind: 'compose', replyTo }),
  };

  const mine = useMemo(() => (me ? freshAuthored(me.posts) : []), [me]);
  const forYou = useMemo(() => [...mine.slice(0, 3), ...data], [mine, data]);
  const following = useMemo(() => [...mine.slice(0, 3), ...data.filter((p) => FOLLOWS.has(p.account.accountType) || followed.set.has(p.account.id))], [mine, data, followed.set]);

  if (!me) return null;

  const chirps = items.filter((n) => n.app === 'chirper');
  const unreadDms = Math.min(20, dramaDms.filter((d) => d.platform === 'chirper' && d.unread && d.state !== 'blocked').length);
  const bell = Math.min(20, chirps.filter((n) => n.at > bellSeen).length);

  const tabs: NavTab<Tab>[] = [
    { key: 'home', icon: 'home' },
    { key: 'explore', icon: 'search', render: (on) => <Ionicons name="search" size={on ? 27 : 25} color={on ? C.text : C.muted} /> },
    { key: 'communities', icon: 'people' },
    { key: 'alerts', icon: 'notifications', badge: tab === 'alerts' ? 0 : bell },
    { key: 'messages', icon: 'mail', badge: unreadDms },
  ];

  const onBack = () => {
    if (pages.back()) return true;
    if (profileOpen) {
      setProfileOpen(false);
      return true;
    }
    if (tab !== 'home') {
      go('home');
      return true;
    }
    return false;
  };

  return (
    <PhoneApp origin={origin} background={C.bg} statusBar="light" baseColor={C.bg} indicatorColor="#FFFFFF" onBack={onBack}>
      <View style={styles.fill}>
        {opened.has('home') ? (
          <View style={[styles.fill, tab !== 'home' && styles.hidden]}>
            <Timeline forYou={forYou} following={following} acts={acts} onEnd={loadMore} onRefresh={refresh} meName={me.account.username} onMe={() => setProfileOpen(true)} />
          </View>
        ) : null}
        {opened.has('explore') ? (
          <View style={[styles.fill, tab !== 'explore' && styles.hidden]}>
            <Explore data={data} trending={trending} acts={acts} meName={me.account.username} onMe={() => setProfileOpen(true)} onTrend={(t) => pages.push({ kind: 'trend', hashtag: t.hashtag, volume: t.volume })} followed={followed.set} follow={followed.toggle} />
          </View>
        ) : null}
        {opened.has('communities') ? (
          <View style={[styles.fill, tab !== 'communities' && styles.hidden]}>
            <Communities meName={me.account.username} onMe={() => setProfileOpen(true)} onOpen={(name) => pages.push({ kind: 'community', name })} />
          </View>
        ) : null}
        {opened.has('alerts') ? (
          <View style={[styles.fill, tab !== 'alerts' && styles.hidden]}>
            <Alerts items={chirps} myPosts={me.posts} acts={acts} meName={me.account.username} meHandle={me.account.handle} onMe={() => setProfileOpen(true)} />
          </View>
        ) : null}
        {opened.has('messages') ? (
          <View style={[styles.fill, tab !== 'messages' && styles.hidden]}>
            <Messages meName={me.account.username} onMe={() => setProfileOpen(true)} onOpen={(threadId) => pages.push({ kind: 'dm', threadId })} />
          </View>
        ) : null}

        {tab === 'home' ? (
          <Pressable onPress={() => acts.compose()} style={styles.fab} accessibilityLabel="Post">
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </Pressable>
        ) : null}

        {profileOpen ? (
          <PageLayer background={C.bg}>
            <Profile account={me.account} bio={me.bio} following={me.following} posts={me.posts} acts={acts} isMe onBack={() => setProfileOpen(false)} />
          </PageLayer>
        ) : null}

        {pages.stack.map((page, i) => (
          <PageLayer key={i} background={C.bg}>
            {page.kind === 'post' ? (
              <PostPage post={page.post} highlight={page.highlight} acts={acts} meName={me.account.username} onBack={pages.back} />
            ) : page.kind === 'account' ? (
              <AccountPage account={page.account} acts={acts} onBack={pages.back} followed={followed.set.has(page.account.id)} follow={() => followed.toggle(page.account.id)} />
            ) : page.kind === 'trend' ? (
              <TrendPage hashtag={page.hashtag} volume={page.volume} data={data} acts={acts} onBack={pages.back} />
            ) : page.kind === 'community' ? (
              <CommunityPage name={page.name} data={data} acts={acts} onBack={pages.back} />
            ) : page.kind === 'dm' ? (
              <DmChat threadId={page.threadId} theme={CHIRP_DM} onBack={pages.back} />
            ) : (
              <Compose replyTo={page.replyTo} meName={me.account.username} account={me.account} onClose={pages.back} />
            )}
          </PageLayer>
        ))}
      </View>
      <AppNav tabs={tabs} value={tab} onChange={go} background={C.bg} active={C.text} inactive={C.text} border={C.line} badgeColor={C.blue} />
    </PhoneApp>
  );
}

// --- Home ---------------------------------------------------------------------

function Timeline({
  forYou,
  following,
  acts,
  onEnd,
  onRefresh,
  meName,
  onMe,
}: {
  forYou: SocialPost[];
  following: SocialPost[];
  acts: Acts;
  onEnd: () => void;
  onRefresh: () => void;
  meName: string;
  onMe: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<'foryou' | 'following'>('foryou');
  const [refreshing, setRefreshing] = useState(false);
  const HEADER = insets.top + 53 + 47;
  const y = useSharedValue(0);
  const last = useSharedValue(0);

  // The header slides away as you read down and comes back as soon as you scroll up.
  const onScroll = useAnimatedScrollHandler((e) => {
    const cur = e.contentOffset.y;
    const dy = cur - last.value;
    last.value = cur;
    if (cur <= 0) {
      y.value = 0;
      return;
    }
    y.value = Math.min(0, Math.max(-HEADER, y.value - dy));
  });
  const headerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const data = kind === 'foryou' ? forYou : following;
  return (
    <View style={styles.fill}>
      <Animated.FlatList
        key={kind}
        data={data}
        keyExtractor={(p: SocialPost) => p.id}
        renderItem={({ item }: { item: SocialPost }) => <PostRow post={item} acts={acts} />}
        ItemSeparatorComponent={Rule}
        onEndReached={kind === 'foryou' ? onEnd : undefined}
        onEndReachedThreshold={0.6}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER, paddingBottom: 80 }}
        extraData={acts}
        initialNumToRender={6}
        windowSize={9}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Empty title="Welcome to Chirp!" body="Follow some accounts and their posts will show up here." />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => {
                onRefresh();
                setRefreshing(false);
              }, 650);
            }}
            progressViewOffset={HEADER}
            colors={[C.blue]}
            progressBackgroundColor="#16181C"
            tintColor={C.blue}
          />
        }
      />
      <Animated.View style={[styles.header, { paddingTop: insets.top }, headerStyle]}>
        <View style={styles.logoRow}>
          <View style={[styles.logoSide, styles.lead]}>
            <ExitButton color={C.text} />
            <Pressable onPress={onMe} hitSlop={8}>
              <Avatar id="player" name={meName} size={32} />
            </Pressable>
          </View>
          <MaterialCommunityIcons name="bird" size={28} color={C.text} />
          <View style={[styles.logoSide, styles.right]}>
            <View style={styles.upgrade}>
              <T size={13} weight="700" color={C.text}>
                Upgrade
              </T>
            </View>
          </View>
        </View>
        <TopTabs tabs={['For you', 'Following']} value={kind === 'foryou' ? 0 : 1} onChange={(i) => setKind(i === 0 ? 'foryou' : 'following')} />
      </Animated.View>
    </View>
  );
}

/** X's text tabs with the short blue bar under the active one. */
function TopTabs({ tabs, value, onChange, scroll }: { tabs: string[]; value: number; onChange: (i: number) => void; scroll?: boolean }) {
  const items = tabs.map((t, i) => (
    <Pressable key={t} onPress={() => onChange(i)} style={[styles.topTab, !scroll && styles.flex, scroll && styles.topTabScroll]}>
      <View style={styles.topTabInner}>
        <T size={15} weight={i === value ? '700' : '500'} color={i === value ? C.text : C.muted}>
          {t}
        </T>
        {i === value ? <View style={styles.topTabBar} /> : null}
      </View>
    </Pressable>
  ));
  return scroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topTabsScroll} contentContainerStyle={styles.topTabsContent}>
      {items}
    </ScrollView>
  ) : (
    <View style={styles.topTabs}>{items}</View>
  );
}

function SearchHeader({
  meName,
  onMe,
  value,
  onChange,
  placeholder,
  right,
}: {
  meName: string;
  onMe: () => void;
  value?: string;
  onChange?: (s: string) => void;
  placeholder: string;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.searchHead, { paddingTop: insets.top + 6 }]}>
      <View style={styles.lead}>
        <ExitButton color={C.text} />
        <Pressable onPress={onMe} hitSlop={8}>
          <Avatar id="player" name={meName} size={32} />
        </Pressable>
      </View>
      {onChange ? (
        <View style={styles.searchField}>
          <Ionicons name="search" size={16} color={C.muted} />
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={C.muted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {value ? (
            <Pressable onPress={() => onChange('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={C.muted} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <T size={20} weight="800" color={C.text} style={styles.flex}>
          {placeholder}
        </T>
      )}
      {right ?? <Ionicons name="settings-outline" size={22} color={C.text} />}
    </View>
  );
}

// --- Explore -----------------------------------------------------------------

function trendLine(t: TrendingTopic, i: number): string {
  return `${i + 1} · ${t.label ?? `${TREND_KIND[t.kind ?? 'ambient']} · Trending`}`;
}

function Explore({
  data,
  trending,
  acts,
  meName,
  onMe,
  onTrend,
  followed,
  follow,
}: {
  data: SocialPost[];
  trending: TrendingTopic[];
  acts: Acts;
  meName: string;
  onMe: () => void;
  onTrend: (t: TrendingTopic) => void;
  followed: ReadonlySet<string>;
  follow: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState(0);
  const query = q.trim().toLowerCase();
  const people = useMemo(
    () => (query ? searchableOn('chirper').filter((a) => a.username.toLowerCase().includes(query) || a.handle.includes(query)) : []),
    [query]
  );
  const results = useMemo(
    () =>
      query
        ? data.filter((p) => p.content.toLowerCase().includes(query) || p.account.username.toLowerCase().includes(query) || p.account.handle.includes(query))
        : [],
    [data, query]
  );
  const news = useMemo(() => data.filter((p) => p.account.accountType === 'news' || p.account.accountType === 'industry'), [data]);
  const media = useMemo(() => data.filter((p) => p.media), [data]);
  // A big page, an artist and someone from the usual crowd, the way X suggests a mix.
  const suggestions = useMemo(() => {
    const big = searchableOn('chirper').filter((a) => a.isVerified && !a.id.startsWith('ad-'));
    const pick = (pool: NpcAccount[], k: string) => pool[hashOf(`wtf:${k}`) % Math.max(1, pool.length)];
    const out = [
      pick(big.filter((a) => a.id.startsWith('ev-')), 'page'),
      pick(big.filter((a) => a.accountType === 'artist'), 'artist'),
      ...someAccounts('who-to-follow', 'chirper', 3).filter((a) => a.isVerified || a.followers > 50_000),
    ].filter((a): a is NpcAccount => !!a);
    return out.filter((a, i) => out.findIndex((b) => b.id === a.id) === i).slice(0, 3);
  }, []);
  const hero = trending[0];

  if (query) {
    return (
      <View style={styles.fill}>
        <SearchHeader meName={meName} onMe={onMe} value={q} onChange={setQ} placeholder="Search" right={<View />} />
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostRow post={item} acts={acts} />}
          ItemSeparatorComponent={Rule}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            people.length > 0 ? (
              <View>
                {people.slice(0, 3).map((a) => (
                  <PersonRow key={a.id} account={a} onOpen={() => acts.openAccount(a)} following={followed.has(a.id)} onFollow={() => follow(a.id)} />
                ))}
                <Rule />
              </View>
            ) : null
          }
          ListEmptyComponent={people.length === 0 ? <Empty title={`No results for "${q.trim()}"`} body="Try searching for something else." /> : null}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <SearchHeader meName={meName} onMe={onMe} value={q} onChange={setQ} placeholder="Search" />
      <TopTabs tabs={['For you', 'Trending', 'News', 'Entertainment']} value={topic} onChange={setTopic} scroll />
      {topic === 2 || topic === 3 ? (
        <FlatList
          data={topic === 2 ? news : media}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostRow post={item} acts={acts} />}
          ItemSeparatorComponent={Rule}
          ListEmptyComponent={<Empty title="Nothing here yet" body="Check back soon." />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {topic === 0 && hero ? (
            <Pressable onPress={() => onTrend(hero)}>
              <Photo photo={pickPhoto(['crowd', 'stage'], `trend:${hero.hashtag}`, { orientation: 'landscape' })} style={styles.hero} />
              <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']} style={[StyleSheet.absoluteFill, styles.heroShade]} />
              <View style={styles.heroText}>
                <T size={13} weight="700" color="#FFFFFF">
                  {hero.label ?? `${TREND_KIND[hero.kind ?? 'ambient']} · Trending`}
                </T>
                <T size={22} weight="800" color="#FFFFFF" numberOfLines={2}>
                  {hero.hashtag}
                </T>
              </View>
            </Pressable>
          ) : null}
          {topic === 0 ? (
            <T size={20} weight="800" color={C.text} style={styles.sectionTitle}>
              Trends for you
            </T>
          ) : null}
          {trending.length === 0 ? (
            <Empty title="Nothing’s trending yet" body="Make some noise and the timeline will follow." />
          ) : (
            trending.map((t, i) => (
              <Pressable key={t.hashtag} onPress={() => onTrend(t)} style={({ pressed }) => [styles.trend, pressed && styles.pressed]}>
                <View style={styles.flex}>
                  <T size={13} color={C.muted}>
                    {trendLine(t, i)}
                  </T>
                  <T size={15} weight="700" color={C.text} numberOfLines={1} style={styles.trendTag}>
                    {t.hashtag}
                  </T>
                  <T size={13} color={C.muted}>
                    {countShort(t.volume)} posts
                  </T>
                </View>
                <Ionicons name="ellipsis-horizontal" size={16} color={C.muted} />
              </Pressable>
            ))
          )}
          {topic === 0 && suggestions.length > 0 ? (
            <>
              <Rule />
              <T size={20} weight="800" color={C.text} style={styles.sectionTitle}>
                Who to follow
              </T>
              {suggestions.map((a) => (
                <PersonRow key={a.id} account={a} onOpen={() => acts.openAccount(a)} following={followed.has(a.id)} onFollow={() => follow(a.id)} />
              ))}
            </>
          ) : null}
          <View style={styles.pad} />
        </ScrollView>
      )}
    </View>
  );
}

function PersonRow({ account, onOpen, following, onFollow }: { account: NpcAccount; onOpen: () => void; following: boolean; onFollow: () => void }) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
      <Avatar id={account.id} name={account.username} size={40} />
      <View style={styles.flex}>
        <View style={styles.nameLine}>
          <T size={15} weight="700" color={C.text} numberOfLines={1} style={styles.shrink}>
            {account.username}
          </T>
          {account.isVerified ? <Verified app="chirp" size={16} /> : null}
        </View>
        <T size={15} color={C.muted} numberOfLines={1}>
          @{account.handle}
        </T>
      </View>
      <Pressable onPress={onFollow} style={[styles.followPill, following ? styles.followingPill : styles.followWhite]}>
        <T size={14} weight="700" color={following ? C.text : '#0F1419'}>
          {following ? 'Following' : 'Follow'}
        </T>
      </Pressable>
    </Pressable>
  );
}

// --- Communities --------------------------------------------------------------

const COMMUNITIES = [
  { name: 'New Music Friday', members: 48_200, tags: ['vinyl', 'headphones'] as const },
  { name: 'Hip-Hop Heads', members: 212_000, tags: ['stage', 'mic'] as const },
  { name: 'Concert Photography', members: 31_400, tags: ['crowd', 'stage'] as const },
  { name: 'Bedroom Producers', members: 96_800, tags: ['studio'] as const },
  { name: 'Tour Life', members: 18_900, tags: ['tourbus', 'jet'] as const },
];

function Communities({ meName, onMe, onOpen }: { meName: string; onMe: () => void; onOpen: (name: string) => void }) {
  const artist = usePlayerStore((s) => s.player?.artistName ?? 'Artist');
  const list = [{ name: `${artist} Fans`, members: 0, tags: ['player', 'crowd'] as const }, ...COMMUNITIES];
  const fans = usePlayerStore((s) => s.player?.stats.fans ?? 0);
  return (
    <View style={styles.fill}>
      <SearchHeader meName={meName} onMe={onMe} placeholder="Communities" right={<Ionicons name="people-outline" size={22} color={C.text} />} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <T size={20} weight="800" color={C.text} style={styles.sectionTitle}>
          Discover new Communities
        </T>
        {list.map((c, i) => (
          <Pressable key={c.name} onPress={() => onOpen(c.name)} style={({ pressed }) => [styles.community, pressed && styles.pressed]}>
            <Photo photo={pickPhoto([...c.tags], `community:${c.name}`)} style={styles.communityCover} />
            <View style={styles.flex}>
              <T size={15} weight="700" color={C.text} numberOfLines={1}>
                {c.name}
              </T>
              <View style={styles.members}>
                {someAccounts(c.name, 'chirper', 3).map((a, k) => (
                  <View key={a.id} style={[styles.memberFace, { marginLeft: k === 0 ? 0 : -8 }]}>
                    <Avatar id={a.id} name={a.username} size={20} />
                  </View>
                ))}
                <T size={13} color={C.muted}>
                  {countShort(i === 0 ? Math.max(40, Math.round(fans * 0.02)) : c.members)} Members
                </T>
              </View>
            </View>
          </Pressable>
        ))}
        <View style={styles.pad} />
      </ScrollView>
    </View>
  );
}

function CommunityPage({ name, data, acts, onBack }: { name: string; data: SocialPost[]; acts: Acts; onBack: () => void }) {
  const [joined, setJoined] = useState(false);
  const posts = useMemo(() => {
    const k = hashOf(name) % 3;
    return data.filter((_, i) => i % 3 === k || i % 5 === 0);
  }, [data, name]);
  return (
    <View style={styles.fill}>
      <PageHeader title={name} onBack={onBack} color={C.text} background={C.bg} titleSize={18} />
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostRow post={item} acts={acts} />}
        ItemSeparatorComponent={Rule}
        ListHeaderComponent={
          <View>
            <Photo photo={pickPhoto(['crowd', 'stage'], `community:${name}`, { orientation: 'landscape' })} style={styles.communityBanner} />
            <View style={styles.communityHead}>
              <T size={22} weight="800" color={C.text}>
                {name}
              </T>
              <Pressable onPress={() => setJoined((j) => !j)} style={[styles.followPill, joined ? styles.followingPill : styles.followWhite]}>
                <T size={14} weight="700" color={joined ? C.text : '#0F1419'}>
                  {joined ? 'Joined' : 'Join'}
                </T>
              </Pressable>
            </View>
            <Rule />
          </View>
        }
        extraData={acts}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// --- Notifications -------------------------------------------------------------

function Alerts({
  items,
  myPosts,
  acts,
  meName,
  meHandle,
  onMe,
}: {
  items: PhoneNotification[];
  myPosts: SocialPost[];
  acts: Acts;
  meName: string;
  meHandle: string;
  onMe: () => void;
}) {
  const [filter, setFilter] = useState(0);
  const shown = useMemo(() => {
    if (filter === 1) return items.filter((n) => n.actor?.verified);
    if (filter === 2) return items.filter((n) => n.kind === 'mention' || n.kind === 'reply');
    return items;
  }, [items, filter]);
  const latest = myPosts[0];

  return (
    <View style={styles.fill}>
      <SearchHeader meName={meName} onMe={onMe} placeholder="Notifications" />
      <TopTabs tabs={['All', 'Verified', 'Mentions']} value={filter} onChange={setFilter} />
      <FlatList
        data={shown}
        keyExtractor={(n) => n.id}
        ItemSeparatorComponent={Rule}
        renderItem={({ item }) => <AlertRow n={item} acts={acts} meHandle={meHandle} />}
        ListFooterComponent={
          filter === 0 && latest && latest.likes > 1 ? (
            <View>
              <Rule />
              <Aggregate
                icon="heart"
                color={C.pink}
                seed={`${latest.id}:likes`}
                total={latest.likes}
                verb="liked your post"
                snippet={latest.content}
                onPress={() => acts.openPost(latest)}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Empty
            title={filter === 2 ? 'Nothing to see here — yet' : 'Join the conversation'}
            body={filter === 2 ? 'When someone mentions you, you’ll find it here.' : 'From likes to reposts and a whole lot more, this is where all the action happens.'}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function AlertRow({ n, acts, meHandle }: { n: PhoneNotification; acts: Acts; meHandle: string }) {
  const open = () => {
    const t = n.target;
    if (t.kind === 'post' || t.kind === 'comments') {
      const post = findPost(t.postId) ?? n.post;
      if (post) acts.openPost(post);
    } else if (t.kind === 'account') {
      const a = findAccount(t.accountId, 'chirper', n.actor);
      if (a) acts.openAccount(a);
    }
  };
  if ((n.kind === 'mention' && n.post) || n.kind === 'reply') {
    if (n.kind === 'mention' && n.post) return <PostRow post={n.post} acts={acts} />;
    return (
      <Pressable onPress={open} style={({ pressed }) => [styles.alertPost, pressed && styles.pressed]}>
        <Avatar id={n.actor?.id ?? 'x'} name={n.actor?.name ?? '?'} size={40} />
        <View style={styles.flex}>
          <View style={styles.nameLine}>
            <T size={15} weight="700" color={C.text} numberOfLines={1} style={styles.shrink}>
              {n.actor?.name}
            </T>
            <T size={15} color={C.muted} numberOfLines={1} style={styles.shrink}>
              @{n.actor?.handle} · {sinceMs(n.at)}
            </T>
          </View>
          <T size={15} color={C.muted}>
            Replying to <T size={15} color={C.blue}>@{meHandle}</T>
          </T>
          <T size={15} color={C.text} lh={20}>
            {n.body}
          </T>
        </View>
      </Pressable>
    );
  }
  const icon = n.kind === 'like' ? 'heart' : n.kind === 'repost' ? 'repeat' : n.kind === 'follow' ? 'person' : 'notifications';
  const color = n.kind === 'like' ? C.pink : n.kind === 'repost' ? C.green : C.blue;
  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.agg, pressed && styles.pressed]}>
      <Ionicons name={icon} size={26} color={color} style={styles.aggIcon} />
      <View style={styles.flex}>
        {n.actor ? (
          <View style={styles.aggFaces}>
            <Avatar id={n.actor.id} name={n.actor.name} size={32} />
          </View>
        ) : null}
        <T size={15} color={C.text} lh={20}>
          <T size={15} weight="700" color={C.text}>
            {n.title}
          </T>{' '}
          {n.body}
        </T>
      </View>
    </Pressable>
  );
}

function Aggregate({
  icon,
  color,
  seed,
  total,
  verb,
  snippet,
  onPress,
}: {
  icon: 'heart' | 'repeat' | 'person';
  color: string;
  seed: string;
  total: number;
  verb: string;
  snippet?: string;
  onPress?: () => void;
}) {
  const who = someAccounts(seed, 'chirper', 4);
  const others = Math.max(0, total - 1);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.agg, pressed && styles.pressed]}>
      <Ionicons name={icon} size={26} color={color} style={styles.aggIcon} />
      <View style={styles.flex}>
        <View style={styles.aggFaces}>
          {who.map((a) => (
            <Avatar key={a.id} id={a.id} name={a.username} size={32} />
          ))}
        </View>
        <T size={15} color={C.text} lh={20}>
          <T size={15} weight="700" color={C.text}>
            {who[0]?.username ?? 'Someone'}
          </T>
          {others > 0 ? ` and ${countShort(others)} others ` : ' '}
          {verb}
        </T>
        {snippet ? (
          <T size={15} color={C.muted} numberOfLines={2} style={styles.aggSnippet}>
            {snippet}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
}

// --- Messages ------------------------------------------------------------------

function Messages({ meName, onMe, onOpen }: { meName: string; onMe: () => void; onOpen: (threadId: string) => void }) {
  const has = useDramaStore((s) => s.dms.some((d) => d.platform === 'chirper' && d.state !== 'blocked'));
  if (has) {
    return (
      <View style={styles.fill}>
        <SearchHeader meName={meName} onMe={onMe} placeholder="Search Direct Messages" />
        <DmList platform="chirper" theme={CHIRP_DM} onOpen={onOpen} />
        <View style={[styles.fab, styles.fabMail]}>
          <MaterialCommunityIcons name="email-plus-outline" size={24} color="#FFFFFF" />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.fill}>
      <SearchHeader meName={meName} onMe={onMe} placeholder="Messages" />
      <View style={styles.inbox}>
        <T size={31} weight="800" color={C.text} lh={36}>
          Welcome to your inbox!
        </T>
        <T size={15} color={C.muted} lh={20}>
          Drop a line, share posts and more with private conversations between you and others on Chirp.
        </T>
        <View style={styles.writeBtn}>
          <T size={17} weight="700" color="#FFFFFF">
            Write a message
          </T>
        </View>
      </View>
      <View style={[styles.fab, styles.fabMail]}>
        <MaterialCommunityIcons name="email-plus-outline" size={24} color="#FFFFFF" />
      </View>
    </View>
  );
}

// --- Profiles -------------------------------------------------------------------

function Profile({
  account,
  bio,
  following,
  posts,
  acts,
  isMe,
  onBack,
  followed,
  follow,
}: {
  account: NpcAccount;
  bio: string;
  following: number;
  posts: SocialPost[];
  acts: Acts;
  isMe?: boolean;
  onBack: () => void;
  followed?: boolean;
  follow?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const player = usePlayerStore((s) => s.player);
  const [tabIx, setTabIx] = useState(0);
  const banner = pickPhoto(isMe ? ['stage', 'crowd'] : ['city', 'texture', 'sky'], `banner:${account.id}`, { orientation: 'landscape' });
  const joined = 2015 + (hashOf(account.id) % 10);
  const shown = tabIx === 4 ? posts.filter((p) => p.media) : tabIx === 0 ? posts : [];

  const header = (
    <View>
      <View style={[styles.banner, { height: 120 + insets.top }]}>
        <Photo photo={banner} style={StyleSheet.absoluteFill} />
        <Pressable onPress={onBack} style={[styles.bannerBtn, styles.bannerLeft, { top: insets.top + 8 }]} hitSlop={8} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>
        <View style={[styles.bannerRight, { top: insets.top + 8 }]}>
          <View style={styles.bannerBtn}>
            <Ionicons name="search" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.bannerBtn}>
            <Ionicons name="ellipsis-vertical" size={18} color="#FFFFFF" />
          </View>
        </View>
      </View>
      <View style={styles.profileTop}>
        <View style={styles.profileAvatar}>
          <Avatar id={account.id} name={account.username} size={78} />
        </View>
        {isMe ? (
          <View style={[styles.followPill, styles.followingPill, styles.editBtn]}>
            <T size={15} weight="700" color={C.text}>
              Edit profile
            </T>
          </View>
        ) : (
          <View style={styles.profileBtns}>
            <View style={styles.roundBtn}>
              <Ionicons name="mail-outline" size={18} color={C.text} />
            </View>
            <Pressable onPress={follow} style={[styles.followPill, styles.editBtn, followed ? styles.followingPill : styles.followWhite]}>
              <T size={15} weight="700" color={followed ? C.text : '#0F1419'}>
                {followed ? 'Following' : 'Follow'}
              </T>
            </Pressable>
          </View>
        )}
      </View>
      <View style={styles.profileText}>
        <View style={styles.nameLine}>
          <T size={21} weight="800" color={C.text}>
            {account.username}
          </T>
          {account.isVerified ? <Verified app="chirp" size={20} /> : null}
        </View>
        <T size={15} color={C.muted}>
          @{account.handle}
        </T>
        <T size={15} color={C.text} lh={20} style={styles.bio}>
          {bio}
        </T>
        <View style={styles.meta}>
          {isMe && player ? (
            <>
              <Meta icon="location-outline" text={player.city} />
              <Meta icon="link-outline" text={`vibestream.fm/${account.handle}`} link />
              <Meta icon="musical-notes-outline" text={genreLabel(player.genre)} />
            </>
          ) : (
            <Meta icon="link-outline" text={`${account.handle}.com`} link />
          )}
          <Meta icon="calendar-outline" text={`Joined ${['March', 'June', 'August', 'November'][hashOf(account.id) % 4]} ${joined}`} />
        </View>
        <View style={styles.counts}>
          <T size={15} color={C.muted}>
            <T size={15} weight="700" color={C.text}>
              {count(following)}
            </T>{' '}
            Following
          </T>
          <T size={15} color={C.muted}>
            <T size={15} weight="700" color={C.text}>
              {countShort(account.followers + (followed ? 1 : 0))}
            </T>{' '}
            Followers
          </T>
        </View>
      </View>
      <TopTabs tabs={['Posts', 'Replies', 'Highlights', 'Articles', 'Media', 'Likes']} value={tabIx} onChange={setTabIx} scroll />
    </View>
  );

  return (
    <FlatList
      data={shown}
      keyExtractor={(p) => p.id}
      renderItem={({ item, index }) => <PostRow post={item} acts={acts} pinned={isMe && index === 0 && tabIx === 0 && !isAuthored(item)} />}
      ItemSeparatorComponent={Rule}
      ListHeaderComponent={header}
      ListEmptyComponent={
        isMe && tabIx === 0 ? (
          <Empty title="You haven’t posted yet" body="Tap the blue button on Home to post, or release a track in the Studio and you’ll announce it here." />
        ) : (
          <Empty title="Nothing to see here — yet" body={tabIx === 0 ? 'They’ve been quiet lately.' : 'When there’s something here, it’ll show up.'} />
        )
      }
      extraData={acts}
      showsVerticalScrollIndicator={false}
    />
  );
}

function Meta({ icon, text, link }: { icon: string; text: string; link?: boolean }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={C.muted} />
      <T size={15} color={link ? C.blue : C.muted}>
        {text}
      </T>
    </View>
  );
}

function AccountPage({
  account,
  acts,
  onBack,
  followed,
  follow,
}: {
  account: NpcAccount;
  acts: Acts;
  onBack: () => void;
  followed: boolean;
  follow: () => void;
}) {
  const posts = useAccountPosts(account, 'chirper');
  return (
    <Profile
      account={account}
      bio={bioOf(account)}
      following={followingOf(account)}
      posts={posts}
      acts={acts}
      onBack={onBack}
      followed={followed}
      follow={follow}
    />
  );
}

// --- A post and its replies --------------------------------------------------------

/** "9:14 PM · Oct 1, 2026": the post's time on the device clock. */
function stamp(post: SocialPost, week: number): string {
  const diff = week - post.week;
  const hours = diff <= 0 ? (hashOf(post.id) % 22) + 1 : diff * 24 * 7;
  const d = new Date(Date.now() - hours * 3_600_000 - (hashOf(`${post.id}:m`) % 60) * 60_000);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${time} · ${date}`;
}

function PostPage({ post, highlight, acts, meName, onBack }: { post: SocialPost; highlight?: string; acts: Acts; meName: string; onBack: () => void }) {
  const thread = useThread(post);
  const send = useSendComment(post);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ThreadReply | null>(null);
  // X lists a conversation in order: each reply, then the replies under it ("Replying to @them").
  const replies = useMemo(() => {
    const hit = highlight ? thread.find((r) => r.id === highlight || (r.children ?? []).some((k) => k.id === highlight)) : undefined;
    const ordered = hit ? [hit, ...thread.filter((r) => r.id !== hit.id)] : thread;
    return ordered.flatMap((r) => [r, ...(r.children ?? [])]);
  }, [thread, highlight]);
  const handle = usePlayerStore((s) => s.player?.artistName ?? '');

  const header = (
    <View>
      <View style={styles.bigPost}>
        <View style={styles.bigHead}>
          <Pressable onPress={() => acts.openAccount(post.account)} style={styles.bigWho}>
            <Avatar id={post.account.id} name={post.account.username} size={40} />
            <View style={styles.flex}>
              <View style={styles.nameLine}>
                <T size={15} weight="700" color={C.text} numberOfLines={1} style={styles.shrink}>
                  {post.account.username}
                </T>
                {post.account.isVerified ? <Verified app="chirp" size={17} /> : null}
              </View>
              <T size={15} color={C.muted}>
                @{post.account.handle}
              </T>
            </View>
          </Pressable>
          <Ionicons name="ellipsis-horizontal" size={18} color={C.muted} />
        </View>
        <T size={17} color={C.text} lh={24} style={styles.bigText}>
          {post.content}
        </T>
        {post.poll ? <Poll post={post} /> : null}
        {post.media ? <ChirpMedia post={post} /> : null}
        <T size={15} color={C.muted} style={styles.bigMeta}>
          {stamp(post, acts.week)} ·{' '}
          <T size={15} weight="700" color={C.text}>
            {countShort(post.views ?? 0)}
          </T>{' '}
          Views
        </T>
      </View>
      <Rule />
      <View style={styles.bigCounts}>
        <BigCount n={post.reposts + (acts.reposted.has(post.id) ? 1 : 0)} label="Reposts" />
        <BigCount n={Math.round(post.reposts * 0.3)} label="Quotes" />
        <BigCount n={post.likes + (acts.liked.has(post.id) ? 1 : 0)} label="Likes" />
        <BigCount n={(post.shares ?? 0) + (acts.bookmarked.has(post.id) ? 1 : 0)} label="Bookmarks" />
      </View>
      <Rule />
      <View style={styles.bigActions}>
        <Actions post={post} acts={acts} big />
      </View>
      <Rule />
    </View>
  );

  return (
    <View style={styles.fill}>
      <PageHeader title="Post" onBack={onBack} color={C.text} background={C.bg} />
      <FlatList
        data={replies}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <ReplyRow
            reply={item}
            to={item.toHandle ?? post.account.handle}
            acts={acts}
            highlight={item.id === highlight}
            onReply={() => setReplyTo(item)}
            onAccount={() => {
              // Your own reply: you're already here.
              if (item.mine) return;
              const a = findAccount(item.accountId, 'chirper', { id: item.accountId, name: item.username, handle: item.handle, verified: item.verified });
              if (a) acts.openAccount(a);
            }}
          />
        )}
        ItemSeparatorComponent={Rule}
        ListHeaderComponent={header}
        extraData={acts}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
      {replyTo ? (
        <View style={styles.replyingBar}>
          <T size={14} color={C.muted} numberOfLines={1} style={styles.flex}>
            Replying to <T size={14} color={C.blue}>@{replyTo.mine ? 'yourself' : replyTo.handle}</T>
          </T>
          <Pressable onPress={() => setReplyTo(null)} hitSlop={10} accessibilityLabel="Cancel reply">
            <Ionicons name="close" size={18} color={C.muted} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.replyBar}>
        <Avatar id="player" name={meName || handle} size={30} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Post your reply"
          placeholderTextColor={C.muted}
          style={styles.replyInput}
          multiline
        />
        <Pressable
          disabled={!draft.trim()}
          onPress={() => {
            send(draft, replyTo);
            setDraft('');
            setReplyTo(null);
          }}
          style={[styles.replyBtn, !draft.trim() && styles.dim]}
        >
          <T size={14} weight="700" color="#FFFFFF">
            Reply
          </T>
        </Pressable>
      </View>
      <KeyboardSpacer />
    </View>
  );
}


function BigCount({ n, label }: { n: number; label: string }) {
  return (
    <T size={14} color={C.muted}>
      <T size={14} weight="700" color={C.text}>
        {countShort(n)}
      </T>{' '}
      {label}
    </T>
  );
}

function TrendPage({ hashtag, volume, data, acts, onBack }: { hashtag: string; volume: number; data: SocialPost[]; acts: Acts; onBack: () => void }) {
  const [tabIx, setTabIx] = useState(0);
  const word = hashtag.replace(/^#/, '').toLowerCase().replace(/\s+/g, '');
  const week = acts.week;
  const city = usePlayerStore((s) => s.player?.city ?? '');
  // A real-world trend: the people and pages talking about that story right now.
  const about = useMemo(() => {
    const topic = realTopicsNow().find((t) => t.name && bareName(t.name).toLowerCase().replace(/\s+/g, '') === word);
    if (!topic) return [];
    return Array.from({ length: 10 }, (_, i) => realPost(topic, 'chirper', i, { week, idPrefix: `trend-${topic.id}`, city }));
  }, [word, week, city]);
  const posts = useMemo(() => {
    // "#BlazeOmen" finds "Blaze Omen": hashtags drop the spaces.
    const on = [...about, ...data.filter((p) => p.content.toLowerCase().replace(/\s+/g, '').includes(word) || p.subject?.name.toLowerCase().replace(/\s+/g, '') === word)];
    const rest = data.filter((p) => !on.includes(p));
    const all = [...on, ...rest];
    return tabIx === 1 ? [...all].reverse() : tabIx === 3 ? all.filter((p) => p.media) : all;
  }, [about, data, word, tabIx]);
  return (
    <View style={styles.fill}>
      <PageHeader title={hashtag} subtitle={volume ? `${countShort(volume)} posts` : undefined} onBack={onBack} color={C.text} muted={C.muted} background={C.bg} titleSize={18} />
      <TopTabs tabs={['Top', 'Latest', 'People', 'Media']} value={tabIx} onChange={setTabIx} />
      <FlatList
        data={tabIx === 2 ? [] : posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostRow post={item} acts={acts} />}
        ItemSeparatorComponent={Rule}
        ListHeaderComponent={
          tabIx === 2 ? (
            <View>
              {someAccounts(hashtag, 'chirper', 6).map((a) => (
                <PersonRow key={a.id} account={a} onOpen={() => acts.openAccount(a)} following={false} onFollow={() => undefined} />
              ))}
            </View>
          ) : null
        }
        extraData={acts}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// --- Composer -----------------------------------------------------------------------

const LIMIT = 280;
const MAX_MEDIA = 4;
const CHIRP_PICKER: PickerTheme = { bg: C.bg, text: C.text, muted: C.muted, line: C.line, field: C.field, accent: C.blue };

/**
 * X's composer: text, up to four photos (the phone's real ones when shared:
 * the strip of recent photos above the toolbar, or the full Recents grid),
 * and a location. Real photos only ever get kind replies.
 */
function Compose({ replyTo, meName, account, onClose }: { replyTo?: SocialPost; meName: string; account: NpcAccount; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const seed = usePlayerStore((s) => s.player?.id ?? 'chirp');
  const home = usePlayerStore((s) => s.player?.city ?? null);
  const [text, setText] = useState('');
  const [picks, setPicks] = useState<PhotoPick[]>([]);
  const [location, setLocation] = useState<string | null>(null);
  const [panel, setPanel] = useState<'none' | 'photos' | 'location'>('none');
  // The strip only shows photos the player already shares: composing never prompts by itself.
  const strip = useGallery(seed, { ask: false });
  const left = LIMIT - text.length;
  const ok = (text.trim().length > 0 || picks.length > 0) && left >= 0;
  const room = MAX_MEDIA - picks.length;

  const add = (more: PhotoPick[]) => {
    setPicks((prev) => {
      const have = new Set(prev.map(pickKey));
      return [...prev, ...more.filter((p) => !have.has(pickKey(p)))].slice(0, MAX_MEDIA);
    });
  };

  const post = () => {
    if (!ok) return;
    if (!replyTo) {
      void postFromPhone({ platform: 'chirper', account, caption: text, picks, location: location ?? undefined });
    }
    onClose();
  };

  if (panel === 'photos') {
    return (
      <GalleryPage
        seed={seed}
        app="Chirp"
        theme={CHIRP_PICKER}
        max={Math.max(1, room)}
        onClose={() => setPanel('none')}
        onDone={(more) => {
          add(more);
          setPanel('none');
        }}
      />
    );
  }
  if (panel === 'location') {
    return (
      <LocationPicker
        theme={CHIRP_PICKER}
        title="Tag location"
        home={home}
        value={location}
        onClose={() => setPanel('none')}
        onPick={(l) => {
          setLocation(l);
          setPanel('none');
        }}
      />
    );
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top }]}>
      <View style={styles.composeBar}>
        <Pressable onPress={onClose} hitSlop={10}>
          <T size={16} color={C.text}>
            Cancel
          </T>
        </Pressable>
        <View style={styles.flex} />
        <T size={15} weight="700" color={C.blue} style={styles.drafts}>
          Drafts
        </T>
        <Pressable onPress={post} disabled={!ok} style={[styles.postBtn, !ok && styles.dim]}>
          <T size={15} weight="700" color="#FFFFFF">
            {replyTo ? 'Reply' : 'Post'}
          </T>
        </Pressable>
      </View>
      {replyTo ? (
        <T size={15} color={C.muted} style={styles.replyingTo}>
          Replying to <T size={15} color={C.blue}>@{replyTo.account.handle}</T>
        </T>
      ) : null}
      <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled">
        <View style={styles.composeRow}>
          <Avatar id="player" name={meName} size={40} />
          <View style={styles.flex}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={replyTo ? 'Post your reply' : 'What’s happening?'}
              placeholderTextColor={C.muted}
              style={[styles.composeInput, picks.length > 0 && styles.composeInputShort]}
              multiline
              autoFocus
              maxLength={LIMIT + 20}
            />
            {picks.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attached}>
                {picks.map((p) => (
                  <View key={pickKey(p)}>
                    <PickImage pick={p} style={[styles.attachedImg, picks.length === 1 && styles.attachedOne]} />
                    <Pressable onPress={() => setPicks((prev) => prev.filter((x) => pickKey(x) !== pickKey(p)))} style={styles.attachedX} hitSlop={8}>
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            {location ? (
              <Pressable onPress={() => setPanel('location')} style={styles.locChip}>
                <Ionicons name="location" size={14} color={C.blue} />
                <T size={14} color={C.blue} numberOfLines={1} style={styles.shrink}>
                  {location}
                </T>
                <Pressable onPress={() => setLocation(null)} hitSlop={10}>
                  <Ionicons name="close" size={14} color={C.blue} />
                </Pressable>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
      <View style={styles.everyone}>
        <Ionicons name="earth" size={15} color={C.blue} />
        <T size={14} weight="700" color={C.blue}>
          Everyone can reply
        </T>
      </View>
      {!replyTo && strip.real && room > 0 ? (
        <FlatList
          horizontal
          data={strip.items.slice(0, 24)}
          keyExtractor={pickKey}
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
          ListHeaderComponent={
            <Pressable onPress={() => setPanel('photos')} style={[styles.stripCell, styles.stripCamera]} accessibilityLabel="All photos">
              <Ionicons name="images-outline" size={26} color={C.blue} />
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => add([item])}>
              <PickImage pick={item} style={styles.stripCell} />
            </Pressable>
          )}
        />
      ) : null}
      <View style={[styles.composeTools, { marginBottom: insets.bottom }]}>
        <Pressable onPress={() => !replyTo && room > 0 && setPanel('photos')} hitSlop={8} accessibilityLabel="Add photos">
          <Ionicons name="image-outline" size={21} color={replyTo || room === 0 ? C.muted : C.blue} />
        </Pressable>
        {(['film-outline', 'list-outline', 'happy-outline', 'calendar-outline'] as const).map((i) => (
          <Ionicons key={i} name={i} size={21} color={C.blue} />
        ))}
        <Pressable onPress={() => !replyTo && setPanel('location')} hitSlop={8} accessibilityLabel="Tag location">
          <Ionicons name={location ? 'location' : 'location-outline'} size={21} color={replyTo ? C.muted : C.blue} />
        </Pressable>
        <View style={styles.flex} />
        <T size={13} color={left < 0 ? '#F4212E' : left < 20 ? '#FFD400' : C.muted}>
          {left < 20 ? left : ''}
        </T>
        <View style={[styles.ring, { borderColor: left < 0 ? '#F4212E' : left < 20 ? '#FFD400' : text ? C.blue : C.line }]} />
      </View>
      {/* The toolbar (photos, location) rides on top of the keyboard, like X's. */}
      <KeyboardSpacer inset={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  hidden: { display: 'none' },
  right: { alignItems: 'flex-end' },
  shrink: { flexShrink: 1 },
  pressed: { backgroundColor: 'rgba(255,255,255,0.03)' },
  dim: { opacity: 0.5 },
  pad: { height: 60 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: C.header,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  logoRow: { height: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  logoSide: { width: 90 },
  lead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  upgrade: { paddingHorizontal: 12, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#536471', alignItems: 'center', justifyContent: 'center' },
  topTabs: { flexDirection: 'row', height: 47, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  topTabsScroll: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  topTabsContent: { paddingHorizontal: 8 },
  topTab: { alignItems: 'center', justifyContent: 'center', height: 47 },
  topTabScroll: { paddingHorizontal: 14 },
  topTabInner: { height: 47, alignItems: 'center', justifyContent: 'center' },
  topTabBar: { position: 'absolute', bottom: 0, height: 4, minWidth: 56, alignSelf: 'stretch', borderRadius: 2, backgroundColor: C.blue },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 10px rgba(0,0,0,0.5)',
  },
  fabMail: { bottom: 18 },

  searchHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 8 },
  searchField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: C.field },
  searchInput: { flex: 1, color: C.text, fontSize: 15, paddingVertical: 0 },
  sectionTitle: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  hero: { width: '100%', aspectRatio: 16 / 9 },
  heroShade: { top: 0 },
  heroText: { position: 'absolute', left: 16, right: 16, bottom: 14, gap: 2 },
  trend: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  trendTag: { marginVertical: 2 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  followPill: { height: 34, paddingHorizontal: 16, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  followWhite: { backgroundColor: C.white },
  followingPill: { borderWidth: 1, borderColor: '#536471' },

  community: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  communityCover: { width: 64, height: 64, borderRadius: 12 },
  members: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  memberFace: { borderWidth: 2, borderColor: C.bg, borderRadius: 12 },
  communityBanner: { width: '100%', aspectRatio: 3 },
  communityHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },

  agg: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  aggIcon: { width: 40, textAlign: 'right' },
  aggFaces: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  aggSnippet: { marginTop: 4 },
  alertPost: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },

  inbox: { paddingHorizontal: 32, paddingTop: 30, gap: 10 },
  writeBtn: { alignSelf: 'flex-start', marginTop: 18, height: 52, paddingHorizontal: 30, borderRadius: 26, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },

  banner: { overflow: 'hidden', backgroundColor: '#333639' },
  bannerBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(15,20,25,0.6)', alignItems: 'center', justifyContent: 'center' },
  bannerLeft: { position: 'absolute', left: 14 },
  bannerRight: { position: 'absolute', right: 14, flexDirection: 'row', gap: 10 },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: -40 },
  profileAvatar: { padding: 4, borderRadius: 44, backgroundColor: C.bg },
  profileBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#536471', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  editBtn: { marginBottom: 4, height: 36 },
  profileText: { paddingHorizontal: 16, paddingTop: 10, gap: 2 },
  bio: { marginTop: 10 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  counts: { flexDirection: 'row', gap: 18, marginTop: 10, marginBottom: 10 },

  bigPost: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  bigHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bigWho: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bigText: { marginTop: 12 },
  bigMedia: { marginTop: 12 },
  bigMeta: { marginTop: 14 },
  bigCounts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6, paddingHorizontal: 16, paddingVertical: 13 },
  bigActions: { paddingHorizontal: 12, paddingVertical: 10 },
  row2: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    backgroundColor: C.bg,
  },
  replyInput: { flex: 1, color: C.text, fontSize: 15, maxHeight: 90, paddingVertical: 6 },
  replyingBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  replyBtn: { height: 32, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },

  composeBar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 54 },
  drafts: { marginRight: 4 },
  postBtn: { height: 34, paddingHorizontal: 18, borderRadius: 17, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  replyingTo: { paddingHorizontal: 66, marginBottom: 4 },
  composeRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 6 },
  composeInput: { flex: 1, color: C.text, fontSize: 19, lineHeight: 25, minHeight: 120, textAlignVertical: 'top', paddingTop: 6 },
  composeInputShort: { minHeight: 56 },
  attached: { gap: 8, paddingTop: 8, paddingRight: 16 },
  attachedImg: { width: 150, height: 190, borderRadius: 16 },
  attachedOne: { width: 260, height: 300 },
  attachedX: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(15,20,25,0.75)', alignItems: 'center', justifyContent: 'center' },
  locChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 10, maxWidth: '90%' },
  strip: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  stripCell: { width: 76, height: 76, borderRadius: 12 },
  stripCamera: { borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  everyone: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  composeTools: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingHorizontal: 16, height: 52 },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5 },
});
