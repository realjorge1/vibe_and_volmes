import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DmTheme } from '../../dm/DmChat';
import { useThreads } from '../../dm/DmList';
import type { NpcAccount, SocialPost, TrendingTopic } from '../../../../types/social';
import type { PhoneNotification } from '../../../../types/notifications';
import { usePlayerStore } from '../../../../store/playerStore';
import { useMusicStore } from '../../../../store/musicStore';
import { BEAT_CATALOG } from '../../../../data/beats/beatCatalog';
import { planClip } from '../../../../systems/visuals/clips';
import { findAccount, findPost } from '../../../../systems/social/postLookup';
import { hashOf } from '../../../../systems/visuals/photoIndex';
import type { PhotoPick } from '../../../../systems/social/postFromPhone';
import { T } from '../../T';
import { Avatar } from '../../Avatar';
import { PageHeader } from '../../Page';
import { ExitButton } from '../../PhoneApp';
import { Photo } from '../../../visuals/Photo';
import { Verified, countShort, sinceMs } from '../../bits';
import { someAccounts } from '../../kit';
import { useGallery, usePickSelection } from '../../gallery/useGallery';
import { AccessBanner, GalleryGrid, PickImage } from '../../gallery/Gallery';
import { LocationPicker, type PickerTheme } from '../../gallery/LocationPicker';
import { KeyboardSpacer } from '../../KeyboardSpacer';

/** TikTok's dark palette. */
export const K = {
  bg: '#000000',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.6)',
  faint: 'rgba(255,255,255,0.12)',
  line: '#2A2A2A',
  pink: '#FE2C55',
  cyan: '#25F4EE',
  sheet: '#161616',
  field: '#2A2A2A',
  grey: '#2F2F2F',
};

export interface TokActs {
  week: number;
  liked: ReadonlySet<string>;
  saved: ReadonlySet<string>;
  followed: ReadonlySet<string>;
  like: (id: string) => void;
  likeOnce: (id: string) => void;
  save: (id: string) => void;
  follow: (id: string) => void;
  comments: (post: SocialPost, highlight?: string) => void;
  watch: (posts: SocialPost[], start: number) => void;
  openAccount: (account: NpcAccount) => void;
}

/** A video tile: its first frame, the view count in the corner. */
export function VideoTile({ post, w, pinned, onPress }: { post: SocialPost; w: number; pinned?: boolean; onPress: () => void }) {
  const name = usePlayerStore((s) => s.player?.artistName ?? '');
  const track = useMusicStore((s) => s.discography[0]?.title ?? null);
  const shot = useMemo(() => planClip(post, { playerName: name, trackTitle: track }).shots[0], [post, name, track]);
  return (
    <Pressable onPress={onPress} style={{ width: w, height: w * (4 / 3) }}>
      {shot ? <Photo photo={shot.photo} style={StyleSheet.absoluteFill} /> : null}
      {pinned ? (
        <View style={styles.pinned}>
          <T size={11} weight="700">
            Pinned
          </T>
        </View>
      ) : null}
      <View style={styles.tileViews}>
        <Ionicons name="play-outline" size={13} color="#FFFFFF" />
        <T size={12} weight="700" style={styles.shadow}>
          {countShort(post.views ?? post.likes * 12)}
        </T>
      </View>
    </Pressable>
  );
}

// --- Search / Discover ---------------------------------------------------------

export function Discover({ data, trending, acts, onBack }: { data: SocialPost[]; trending: TrendingTopic[]; acts: TokActs; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const query = submitted.trim().toLowerCase();
  const results = useMemo(
    () => (query ? data.filter((p) => p.content.toLowerCase().includes(query) || p.account.username.toLowerCase().includes(query) || p.account.handle.includes(query)) : data),
    [data, query]
  );
  const cardW = (width - 8 * 3) / 2;

  return (
    <View style={styles.fill}>
      <View style={[styles.searchBar, { paddingTop: insets.top + 6 }]}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10}>
            <Ionicons name="chevron-back" size={28} color={K.text} />
          </Pressable>
        ) : null}
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={K.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => setSubmitted(q)}
            placeholder="Search"
            placeholderTextColor={K.muted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <Pressable onPress={() => setSubmitted(q)} hitSlop={8}>
          <T size={16} weight="700" color={K.pink}>
            Search
          </T>
        </Pressable>
      </View>
      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.cardRow}
        contentContainerStyle={styles.cards}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          !query ? (
            <View style={styles.mayLike}>
              <View style={styles.mayHead}>
                <T size={16} weight="700">
                  You may like
                </T>
                <Ionicons name="refresh" size={16} color={K.muted} />
              </View>
              {trending.slice(0, 6).map((t, i) => (
                <Pressable key={t.hashtag} onPress={() => setSubmitted(t.hashtag.replace(/^#/, ''))} style={styles.suggestion}>
                  <View style={[styles.dot, { backgroundColor: i < 3 ? K.pink : 'rgba(255,255,255,0.35)' }]} />
                  <T size={15} numberOfLines={1} style={styles.flex}>
                    {t.hashtag.replace(/^#/, '')}
                  </T>
                  {i === 0 ? (
                    <View style={styles.hot}>
                      <T size={10} weight="800">
                        HOT
                      </T>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <Pressable onPress={() => acts.watch(results, index)} style={[styles.card, { width: cardW }]}>
            <VideoTile post={item} w={cardW} onPress={() => acts.watch(results, index)} />
            <T size={14} weight="600" numberOfLines={2} style={styles.cardText}>
              {item.content}
            </T>
            <View style={styles.cardFoot}>
              <Avatar id={item.account.id} name={item.account.username} size={18} />
              <T size={12} color={K.muted} numberOfLines={1} style={styles.flex}>
                {item.account.username}
              </T>
              <Ionicons name="heart-outline" size={13} color={K.muted} />
              <T size={12} color={K.muted}>
                {countShort(item.likes)}
              </T>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <T size={15} color={K.muted} center style={styles.emptyText}>
            No results found
          </T>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// --- Inbox ---------------------------------------------------------------------

const DMS: readonly string[] = ['ur song is stuck in my head 😭', 'collab?? 👀', 'saw u live!!', 'can u follow back pls', 'new music when'];

/** TokTalk's chat look. */
export const TOK_DM: DmTheme = {
  app: 'TokTalk',
  bg: '#000000',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.6)',
  line: '#2A2A2A',
  field: '#2A2A2A',
  bubbleIn: '#2F2F2F',
  bubbleOut: ['#FE2C55', '#FE2C55'],
  outText: '#FFFFFF',
  accent: '#FE2C55',
  chip: '#2F2F2F',
  chipText: '#FFFFFF',
  chevron: true,
  radius: 18,
};

export function Inbox({
  items,
  onActivity,
  onFollowers,
  onOpenDm,
  acts,
}: {
  items: PhoneNotification[];
  onActivity: () => void;
  onFollowers: () => void;
  onOpenDm: (threadId: string) => void;
  acts: TokActs;
}) {
  const insets = useSafeAreaInsets();
  const follows = items.filter((n) => n.kind === 'follow');
  const activity = items.filter((n) => n.kind !== 'follow');
  const threads = useThreads('tunetok');
  const real = [...threads.primary, ...threads.requests];
  const convos = useMemo(() => someAccounts('tok-dms', 'tunetok', 5), []);
  return (
    <View style={styles.fill}>
      <View style={[styles.inboxBar, { paddingTop: insets.top }]}>
        <View style={styles.inboxSide}>
          <ExitButton color={K.text} />
          <MaterialCommunityIcons name="account-plus-outline" size={24} color={K.text} />
        </View>
        <T size={17} weight="700">
          Inbox
        </T>
        <View style={[styles.inboxSide, styles.sideEnd]}>
          <Ionicons name="search" size={23} color={K.text} />
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <InboxRow
          icon="people"
          color="#20D5EC"
          title="New followers"
          sub={follows[0] ? `${follows[0].actor?.name ?? 'Someone'} started following you.` : 'See who followed you.'}
          badge={follows.length}
          onPress={onFollowers}
        />
        <InboxRow
          icon="notifications"
          color={K.pink}
          title="Activity"
          sub={activity[0] ? `${activity[0].title} ${activity[0].body}` : 'Likes, comments and mentions show up here.'}
          badge={activity.length}
          onPress={onActivity}
        />
        <InboxRow icon="musical-note" color="#3A3A3A" title="System notifications" sub="TokTalk: Your account is in good standing." />
        {real.map((t) => {
          const last = [...t.messages].reverse().find((m) => m.at <= Date.now()) ?? t.messages[0];
          return (
            <Pressable key={t.id} onPress={() => onOpenDm(t.id)} style={styles.inboxRow}>
              <Avatar id={t.person.id} name={t.person.name} size={52} />
              <View style={styles.flex}>
                <T size={15} weight={t.unread ? '800' : '600'} numberOfLines={1}>
                  {t.person.name}
                  {t.request ? '  ·  Request' : ''}
                </T>
                <T size={14} color={t.unread ? K.text : K.muted} weight={t.unread ? '600' : '400'} numberOfLines={1}>
                  {last?.from === 'me' ? `You: ${last.text}` : last?.text}
                </T>
              </View>
              {t.unread ? <View style={styles.dmDot} /> : null}
            </Pressable>
          );
        })}
        {real.length === 0 && convos.map((a, i) => (
          <Pressable key={a.id} onPress={() => acts.openAccount(a)} style={styles.inboxRow}>
            <Avatar id={a.id} name={a.username} size={52} />
            <View style={styles.flex}>
              <T size={15} weight="600" numberOfLines={1}>
                {a.username}
              </T>
              <T size={14} color={K.muted} numberOfLines={1}>
                {DMS[(hashOf(a.id) + i) % DMS.length]} · {(hashOf(a.id) % 20) + 1}h
              </T>
            </View>
          </Pressable>
        ))}
        <View style={styles.pad} />
      </ScrollView>
    </View>
  );
}

function InboxRow({ icon, color, title, sub, badge = 0, onPress }: { icon: string; color: string; title: string; sub: string; badge?: number; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.inboxRow, pressed && styles.pressed]}>
      <View style={[styles.inboxIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.flex}>
        <T size={15} weight="600">
          {title}
        </T>
        <T size={14} color={K.muted} numberOfLines={1}>
          {sub}
        </T>
      </View>
      {badge > 0 ? (
        <View style={styles.inboxBadge}>
          <T size={12} weight="700">
            {badge > 99 ? '99+' : badge}
          </T>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={K.muted} />
    </Pressable>
  );
}

export function ActivityPage({ items, acts, onBack, onOpenPost }: { items: PhoneNotification[]; acts: TokActs; onBack: () => void; onOpenPost: (n: PhoneNotification) => void }) {
  return (
    <View style={styles.fill}>
      <PageHeader title="All activity" onBack={onBack} color={K.text} background={K.bg} center titleSize={17} />
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => {
          const post = item.post ? (findPost(item.post.id) ?? item.post) : null;
          return (
            <Pressable onPress={() => onOpenPost(item)} style={({ pressed }) => [styles.activity, pressed && styles.pressed]}>
              {item.actor ? <Avatar id={item.actor.id} name={item.actor.name} size={48} /> : <View style={[styles.inboxIcon, { backgroundColor: K.pink }]} />}
              <View style={styles.flex}>
                <T size={15} weight="600" numberOfLines={1}>
                  {item.title}
                </T>
                <T size={14} color={K.muted} numberOfLines={2}>
                  {item.body} <T size={14} color="rgba(255,255,255,0.4)">{sinceMs(item.at)}</T>
                </T>
              </View>
              {post ? <VideoTile post={post} w={42} onPress={() => onOpenPost(item)} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <T size={15} color={K.muted} center style={styles.emptyText}>
            No activity yet
          </T>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export function FollowersPage({ items, acts, onBack }: { items: PhoneNotification[]; acts: TokActs; onBack: () => void }) {
  return (
    <View style={styles.fill}>
      <PageHeader title="New followers" onBack={onBack} color={K.text} background={K.bg} center titleSize={17} />
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => {
          const a = item.actor ? findAccount(item.actor.id, 'tunetok', item.actor) : null;
          if (!a) return null;
          const on = acts.followed.has(a.id);
          return (
            <Pressable onPress={() => acts.openAccount(a)} style={styles.activity}>
              <Avatar id={a.id} name={a.username} size={48} />
              <View style={styles.flex}>
                <T size={15} weight="600">
                  {a.username}
                </T>
                <T size={14} color={K.muted}>
                  Started following you. {sinceMs(item.at)}
                </T>
              </View>
              <Pressable onPress={() => acts.follow(a.id)} style={[styles.smallBtn, on ? styles.btnGrey : styles.btnPink]}>
                <T size={14} weight="600">
                  {on ? 'Friends' : 'Follow back'}
                </T>
              </Pressable>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <T size={15} color={K.muted} center style={styles.emptyText}>
            No new followers yet
          </T>
        }
      />
    </View>
  );
}

// --- Profile -------------------------------------------------------------------

export function TokProfile({
  account,
  bio,
  following,
  likes,
  posts,
  acts,
  isMe,
  onBack,
}: {
  account: NpcAccount;
  bio: string;
  following: number;
  likes: number;
  posts: SocialPost[];
  acts: TokActs;
  isMe?: boolean;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState(0);
  const follows = acts.followed.has(account.id);
  const cell = (width - 2) / 3;
  const liked = useMemo(() => posts.filter((_, i) => i % 2 === 1), [posts]);
  const shown = tab === 0 ? posts : tab === 3 ? posts.filter((p) => acts.saved.has(p.id)) : tab === 4 && isMe ? liked : [];
  const pinned = isMe ? Math.min(2, posts.length) : hashOf(account.id) % 2;

  const header = (
    <View>
      <View style={[styles.profileBar, { paddingTop: insets.top }]}>
        <View style={styles.barSide}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={10}>
              <Ionicons name="chevron-back" size={28} color={K.text} />
            </Pressable>
          ) : (
            <>
              <ExitButton color={K.text} />
              <MaterialCommunityIcons name="account-plus-outline" size={25} color={K.text} />
            </>
          )}
        </View>
        <View style={styles.barMid}>
          <T size={17} weight="700" numberOfLines={1}>
            {account.username}
          </T>
          {isMe ? <Ionicons name="chevron-down" size={14} color={K.text} /> : null}
        </View>
        <View style={[styles.barSide, styles.barRight]}>
          {isMe ? <Ionicons name="menu" size={27} color={K.text} /> : <Ionicons name="share-social-outline" size={24} color={K.text} />}
        </View>
      </View>
      <View style={styles.profileHead}>
        <View>
          <Avatar id={account.id} name={account.username} size={96} />
          {isMe ? (
            <View style={styles.addStory}>
              <Ionicons name="add" size={14} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
        <View style={styles.handleRow}>
          <T size={17} weight="700">
            @{account.handle}
          </T>
          {account.isVerified ? <Verified app="tok" size={15} /> : null}
        </View>
        <View style={styles.counts}>
          <TokCount n={following} label="Following" />
          <View style={styles.countSep} />
          <TokCount n={account.followers + (follows ? 1 : 0)} label="Followers" />
          <View style={styles.countSep} />
          <TokCount n={likes} label="Likes" />
        </View>
        <View style={styles.btnRow}>
          {isMe ? (
            <>
              <View style={[styles.wideBtn, styles.btnGrey]}>
                <T size={15} weight="600">
                  Edit profile
                </T>
              </View>
              <View style={[styles.wideBtn, styles.btnGrey]}>
                <T size={15} weight="600">
                  Share profile
                </T>
              </View>
            </>
          ) : (
            <>
              <Pressable onPress={() => acts.follow(account.id)} style={[styles.wideBtn, follows ? styles.btnGrey : styles.btnPink]}>
                <T size={15} weight="600">
                  {follows ? 'Following' : 'Follow'}
                </T>
              </Pressable>
              <View style={[styles.wideBtn, styles.btnGrey]}>
                <T size={15} weight="600">
                  Message
                </T>
              </View>
            </>
          )}
          <View style={[styles.squareBtn, styles.btnGrey]}>
            <MaterialCommunityIcons name="account-plus-outline" size={20} color={K.text} />
          </View>
        </View>
        <T size={14} center lh={19} style={styles.bio}>
          {bio}
        </T>
      </View>
      <View style={styles.tabs}>
        {(['grid-outline', 'lock-closed-outline', 'repeat', 'bookmark-outline', 'heart-outline'] as const).map((icon, i) => (
          <Pressable key={icon} onPress={() => setTab(i)} style={[styles.tab, tab === i && styles.tabOn]}>
            <Ionicons name={(tab === i ? icon.replace('-outline', '') : icon) as keyof typeof Ionicons.glyphMap} size={21} color={tab === i ? K.text : K.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <FlatList
      data={shown}
      keyExtractor={(p) => p.id}
      numColumns={3}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridPad}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => <VideoTile post={item} w={cell} pinned={tab === 0 && index < pinned} onPress={() => acts.watch(shown, index)} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name={tab === 1 ? 'lock-closed-outline' : tab === 4 ? 'heart-outline' : 'videocam-outline'} size={44} color={K.muted} />
          <T size={17} weight="700" center>
            {tab === 0 ? (isMe ? 'Share your first video' : 'No videos yet') : tab === 1 ? 'Private videos' : tab === 4 && !isMe ? 'This user’s liked videos are private' : 'Nothing here yet'}
          </T>
          <T size={14} color={K.muted} center>
            {tab === 0 && isMe ? 'Tap + to post a video, or release a track in the Studio and a snippet will post here.' : ' '}
          </T>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

function TokCount({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.tokCount}>
      <T size={17} weight="700">
        {countShort(n)}
      </T>
      <T size={13} color={K.muted}>
        {label}
      </T>
    </View>
  );
}

// --- Create --------------------------------------------------------------------

const TOK_PICKER: PickerTheme = { bg: K.bg, text: K.text, muted: K.muted, line: K.line, field: K.field, accent: K.pink };

/**
 * TikTok's photo mode: pick up to ten photos (the phone's real ones when
 * shared), choose a sound, then a description and a location.
 */
export function TokCreate({
  seed,
  onClose,
  onPost,
}: {
  seed: string;
  onClose: () => void;
  onPost: (picks: PhotoPick[], caption: string, beatId: string | null, location: string | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const home = usePlayerStore((s) => s.player?.city ?? null);
  const gallery = useGallery(seed);
  const sel = usePickSelection(gallery.items, 10, { multi: true });
  const latest = useMusicStore((s) => s.discography[0] ?? null);
  // A handful of sounds to pick from, the way the sound picker suggests them.
  const beats = useMemo(
    () =>
      BEAT_CATALOG.filter((b) => b.asset != null)
        .map((b) => ({ b, k: hashOf(`${seed}:${b.id}`) }))
        .sort((x, y) => x.k - y.k)
        .slice(0, 8)
        .map((x) => x.b),
    [seed]
  );
  const [beatId, setBeatId] = useState<string | null>(latest ? null : beats[0]?.id ?? null);
  const [step, setStep] = useState<'pick' | 'post'>('pick');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState<string | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const picks = sel.picked;
  const focus = sel.focus;

  if (locOpen) {
    return (
      <LocationPicker
        theme={TOK_PICKER}
        title="Location"
        home={home}
        value={location}
        onClose={() => setLocOpen(false)}
        onPick={(l) => {
          setLocation(l);
          setLocOpen(false);
        }}
      />
    );
  }

  if (step === 'post' && picks.length > 0) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top }]}>
        <PageHeader title="Post" onBack={() => setStep('pick')} color={K.text} background={K.bg} center titleSize={17} />
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.postRow}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add description..."
              placeholderTextColor={K.muted}
              style={styles.postInput}
              multiline
              autoFocus
              maxLength={2200}
            />
            <View>
              <PickImage pick={picks[0]} style={styles.postThumb} />
              {picks.length > 1 ? (
                <View style={styles.photoCount}>
                  <Ionicons name="images" size={11} color="#FFFFFF" />
                  <T size={11} weight="700">
                    {picks.length}
                  </T>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.tagRow}>
            {['# Hashtags', '@ Mention'].map((t) => (
              <View key={t} style={styles.tagChip}>
                <T size={13} weight="600">
                  {t}
                </T>
              </View>
            ))}
          </View>
          <Pressable onPress={() => setLocOpen(true)} style={styles.optRow}>
            <Ionicons name={location ? 'location' : 'location-outline'} size={20} color={K.text} />
            <T size={15} style={styles.flex} numberOfLines={1}>
              {location ?? 'Location'}
            </T>
            {location ? (
              <Pressable onPress={() => setLocation(null)} hitSlop={10}>
                <Ionicons name="close" size={18} color={K.muted} />
              </Pressable>
            ) : (
              <Ionicons name="chevron-forward" size={16} color={K.muted} />
            )}
          </Pressable>
          {(['Everyone can view this post', 'More options'] as const).map((r) => (
            <View key={r} style={styles.optRow}>
              <Ionicons name={r === 'More options' ? 'ellipsis-horizontal' : 'earth'} size={20} color={K.text} />
              <T size={15} style={styles.flex}>
                {r}
              </T>
              <Ionicons name="chevron-forward" size={16} color={K.muted} />
            </View>
          ))}
        </ScrollView>
        {/* Post stays above the keyboard (the app draws edge to edge, so nothing else moves it). */}
        <View style={[styles.postBtns, { marginBottom: insets.bottom }]}>
          <View style={[styles.postBtn, styles.btnGrey]}>
            <T size={15} weight="600">
              Drafts
            </T>
          </View>
          <Pressable onPress={() => onPost(picks, caption, beatId, location)} style={[styles.postBtn, styles.btnPink]}>
            <T size={15} weight="700">
              Post
            </T>
          </Pressable>
        </View>
        <KeyboardSpacer inset={insets.bottom} />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { paddingTop: insets.top }]}>
      <View style={styles.createBar}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={30} color={K.text} />
        </Pressable>
        <View style={styles.soundPill}>
          <Ionicons name="musical-notes" size={14} color={K.text} />
          <T size={14} weight="600" numberOfLines={1}>
            {beatId ? (BEAT_CATALOG.find((b) => b.id === beatId)?.title ?? 'Add sound') : latest ? `${latest.title} (your song)` : 'Add sound'}
          </T>
        </View>
        <Pressable onPress={() => picks.length > 0 && setStep('post')} hitSlop={10} style={[styles.nextBtn, picks.length === 0 && styles.dim]}>
          <T size={15} weight="700">
            {picks.length > 1 ? `Next (${picks.length})` : 'Next'}
          </T>
        </Pressable>
      </View>
      {focus ? (
        <PickImage pick={focus} style={[styles.preview, { height: width * 0.9 }]} />
      ) : (
        <View style={[styles.preview, styles.blank, { height: width * 0.9 }]} />
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sounds}>
        {latest ? (
          <Pressable onPress={() => setBeatId(null)} style={[styles.soundChip, beatId === null && styles.soundOn]}>
            <T size={13} weight="700">
              ★ {latest.title}
            </T>
          </Pressable>
        ) : null}
        {beats.map((b) => (
          <Pressable key={b.id} onPress={() => setBeatId(b.id)} style={[styles.soundChip, beatId === b.id && styles.soundOn]}>
            <T size={13} weight="600">
              {b.title}
            </T>
          </Pressable>
        ))}
      </ScrollView>
      <AccessBanner access={gallery.access} app="TokTalk" text={K.text} muted={K.muted} accent={K.pink} onAllow={gallery.allow} />
      <GalleryGrid
        items={gallery.items}
        multi
        order={sel.order}
        focus={focus}
        onPress={sel.press}
        onEndReached={gallery.real ? gallery.loadMore : undefined}
        aspect={1.25}
        accent={K.pink}
      />
    </View>
  );
}

export function openNotificationIn(n: PhoneNotification, acts: TokActs, watchOne: (post: SocialPost, comments?: string) => void): void {
  const t = n.target;
  if (t.kind === 'post' || t.kind === 'comments') {
    const post = findPost(t.postId) ?? n.post;
    if (post) watchOne(post, t.kind === 'comments' ? (t.replyId ?? '') : undefined);
  } else if (t.kind === 'account') {
    const a = findAccount(t.accountId, 'tunetok', n.actor);
    if (a) acts.openAccount(a);
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  pressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  pad: { height: 40 },
  shadow: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  pinned: { position: 'absolute', top: 6, left: 6, backgroundColor: K.pink, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  tileViews: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  emptyText: { paddingVertical: 48 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingBottom: 10 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12, borderRadius: 6, backgroundColor: K.field },
  searchInput: { flex: 1, color: K.text, fontSize: 15, paddingVertical: 0 },
  mayLike: { paddingHorizontal: 8, paddingBottom: 12 },
  mayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  hot: { backgroundColor: K.pink, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  cards: { paddingHorizontal: 8, gap: 10 },
  cardRow: { gap: 8 },
  card: { gap: 6 },
  cardText: {},
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  inboxBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 50 },
  inboxSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sideEnd: { justifyContent: 'flex-end' },
  dmDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: K.pink },
  inboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  inboxIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  inboxBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: K.pink, alignItems: 'center', justifyContent: 'center' },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  smallBtn: { height: 32, paddingHorizontal: 14, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  btnPink: { backgroundColor: K.pink },
  btnGrey: { backgroundColor: K.grey },

  profileBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 50 },
  barSide: { width: 72, flexDirection: 'row', alignItems: 'center', gap: 12 },
  barRight: { justifyContent: 'flex-end' },
  barMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  profileHead: { alignItems: 'center', gap: 10, paddingTop: 8, paddingHorizontal: 20 },
  addStory: { position: 'absolute', right: 2, bottom: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#20D5EC', borderWidth: 2, borderColor: K.bg, alignItems: 'center', justifyContent: 'center' },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  counts: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 4 },
  tokCount: { flex: 1, alignItems: 'center' },
  countSep: { width: StyleSheet.hairlineWidth, height: 14, backgroundColor: K.muted },
  btnRow: { flexDirection: 'row', gap: 6, alignSelf: 'stretch', paddingHorizontal: 20, marginTop: 4 },
  wideBtn: { flex: 1, height: 42, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  squareBtn: { width: 42, height: 42, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  bio: { marginTop: 2 },
  tabs: { flexDirection: 'row', marginTop: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: K.line },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  tabOn: { borderBottomWidth: 2, borderBottomColor: K.text },
  gridRow: { gap: 1 },
  gridPad: { gap: 1 },
  empty: { alignItems: 'center', gap: 10, paddingHorizontal: 40, paddingVertical: 40 },

  createBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, height: 54 },
  soundPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14 },
  nextBtn: { height: 34, paddingHorizontal: 16, borderRadius: 4, backgroundColor: K.pink, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.5 },
  blank: { backgroundColor: '#161616' },
  photoCount: { position: 'absolute', right: 5, bottom: 5, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.6)' },
  preview: { width: '100%' },
  sounds: { paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  soundChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: K.field },
  soundOn: { backgroundColor: K.pink },
  postRow: { flexDirection: 'row', gap: 12, padding: 16 },
  postInput: { flex: 1, color: K.text, fontSize: 16, minHeight: 120, textAlignVertical: 'top' },
  postThumb: { width: 96, height: 128, borderRadius: 6 },
  tagRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, backgroundColor: K.field },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 54, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: K.line },
  postBtns: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  postBtn: { flex: 1, height: 46, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
});
