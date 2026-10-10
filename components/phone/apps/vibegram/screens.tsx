import React, { useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NpcAccount, SocialPost } from '../../../../types/social';
import type { PhoneNotification } from '../../../../types/notifications';
import { usePlayerStore } from '../../../../store/playerStore';
import { hashOf, pickPhoto } from '../../../../systems/visuals/photoIndex';
import { pickKey, type PhotoPick } from '../../../../systems/social/postFromPhone';
import { planPostMedia } from '../../../../systems/visuals/scenes';
import { findAccount, findPost } from '../../../../systems/social/postLookup';
import { genreLabel } from '../../../../utils/formatters';
import { T } from '../../T';
import { Avatar } from '../../Avatar';
import { PageHeader } from '../../Page';
import { ExitButton } from '../../PhoneApp';
import { Photo } from '../../../visuals/Photo';
import { PostMedia } from '../../../visuals/PostMedia';
import { Verified, count, countShort, sinceMs } from '../../bits';
import { someAccounts } from '../../kit';
import { G, GRAM_DM, GramPost, type GramActs } from './parts';
import { DmList } from '../../dm/DmList';
import { useGallery, usePickSelection } from '../../gallery/useGallery';
import { AccessBanner, GalleryGrid, PickImage } from '../../gallery/Gallery';
import { LocationPicker, type PickerTheme } from '../../gallery/LocationPicker';
import { KeyboardSpacer, useKeyboardOpen } from '../../KeyboardSpacer';

// --- Profile --------------------------------------------------------------------

export function GramProfile({
  account,
  bio,
  following,
  posts,
  acts,
  isMe,
  onBack,
  onMessage,
  hasStory,
  openStory,
}: {
  account: NpcAccount;
  bio: string;
  following: number;
  posts: SocialPost[];
  acts: GramActs;
  isMe?: boolean;
  onBack?: () => void;
  onMessage?: () => void;
  hasStory: boolean;
  openStory: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const player = usePlayerStore((s) => s.player);
  const [tab, setTab] = useState(0);
  const follows = acts.followed.has(account.id);
  const cell = (width - 3) / 3;
  const shown = tab === 1 ? posts.filter((p) => p.media?.kind === 'video' || p.platform === 'tunetok') : tab === 2 ? [] : posts;
  const mutuals = someAccounts(`${account.id}:mutual`, 'flashpic', 2);
  const highlights = isMe ? ['Tour', 'Studio', 'Fans', 'Press'] : ['Faves', 'Concerts', 'Life'];

  const header = (
    <View>
      <View style={[styles.profileBar, { paddingTop: insets.top }]}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10}>
            <Ionicons name="chevron-back" size={28} color={G.text} />
          </Pressable>
        ) : (
          <ExitButton color={G.text} />
        )}
        <View style={styles.barTitle}>
          <T size={21} weight="700" color={G.text} numberOfLines={1}>
            {account.handle}
          </T>
          {account.isVerified ? <Verified app="gram" size={16} /> : null}
          {isMe ? <Ionicons name="chevron-down" size={16} color={G.text} /> : null}
        </View>
        <View style={styles.barIcons}>
          {isMe ? (
            <>
              <MaterialCommunityIcons name="at" size={25} color={G.text} />
              <MaterialCommunityIcons name="plus-box-outline" size={27} color={G.text} />
              <Ionicons name="menu" size={28} color={G.text} />
            </>
          ) : (
            <>
              <Ionicons name="notifications-outline" size={25} color={G.text} />
              <Ionicons name="ellipsis-horizontal" size={24} color={G.text} />
            </>
          )}
        </View>
      </View>
      <View style={styles.profileRow}>
        <Pressable onPress={hasStory ? openStory : undefined}>
          <Avatar id={account.id} name={account.username} size={84} ring={hasStory ? 'new' : undefined} gapColor={G.bg} />
        </Pressable>
        <View style={styles.profileStats}>
          <Big n={posts.length} label="posts" />
          <Big n={account.followers + (follows ? 1 : 0)} label="followers" />
          <Big n={following} label="following" />
        </View>
      </View>
      <View style={styles.profileText}>
        <T size={14} weight="700" color={G.text}>
          {account.username}
        </T>
        <T size={14} color={G.muted}>
          {isMe ? 'Musician/band' : account.accountType === 'news' || account.accountType === 'industry' ? 'Media/news company' : account.accountType === 'gossip' ? 'Entertainment website' : 'Personal blog'}
        </T>
        <T size={14} color={G.text} lh={19}>
          {bio}
        </T>
        {isMe && player ? (
          <T size={14} weight="600" color="#E0F1FF">
            🔗 vibestream.fm/{account.handle} · {genreLabel(player.genre)}
          </T>
        ) : null}
        {!isMe && mutuals.length > 1 ? (
          <View style={styles.mutuals}>
            <View style={styles.pair}>
              <Avatar id={mutuals[0].id} name={mutuals[0].username} size={20} />
              <View style={styles.pairBack}>
                <Avatar id={mutuals[1].id} name={mutuals[1].username} size={20} />
              </View>
            </View>
            <T size={13} color={G.text} style={styles.flexShrink}>
              Followed by <T size={13} weight="700">{mutuals[0].handle}</T>, <T size={13} weight="700">{mutuals[1].handle}</T> and{' '}
              {count(4 + (hashOf(account.id) % 90))} others
            </T>
          </View>
        ) : null}
      </View>
      <View style={styles.btnRow}>
        {isMe ? (
          <>
            <View style={[styles.btn, styles.btnGrey]}>
              <T size={14} weight="600" color={G.text}>
                Edit profile
              </T>
            </View>
            <View style={[styles.btn, styles.btnGrey]}>
              <T size={14} weight="600" color={G.text}>
                Share profile
              </T>
            </View>
          </>
        ) : (
          <>
            <Pressable onPress={() => acts.follow(account.id)} style={[styles.btn, follows ? styles.btnGrey : styles.btnBlue]}>
              <T size={14} weight="600" color="#FFFFFF">
                {follows ? 'Following' : 'Follow'}
              </T>
            </Pressable>
            <Pressable onPress={onMessage} style={[styles.btn, styles.btnGrey]}>
              <T size={14} weight="600" color={G.text}>
                Message
              </T>
            </Pressable>
          </>
        )}
        <View style={[styles.btnSquare, styles.btnGrey]}>
          <Ionicons name="person-add-outline" size={16} color={G.text} />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlights}>
        {highlights.map((h) => (
          <View key={h} style={styles.highlight}>
            <View style={styles.highlightRing}>
              <Photo photo={pickPhoto(h === 'Studio' ? ['studio'] : h === 'Press' ? ['press'] : h === 'Life' ? ['lifestyle'] : ['crowd', 'stage'], `hl:${account.id}:${h}`)} style={styles.highlightFace} />
            </View>
            <T size={12} color={G.text}>
              {h}
            </T>
          </View>
        ))}
        {isMe ? (
          <View style={styles.highlight}>
            <View style={[styles.highlightRing, styles.newRing]}>
              <Ionicons name="add" size={30} color={G.text} />
            </View>
            <T size={12} color={G.text}>
              New
            </T>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.gridTabs}>
        {(['grid', 'movie-open-play-outline', 'account-box-outline'] as const).map((icon, i) => (
          <Pressable key={icon} onPress={() => setTab(i)} style={[styles.gridTab, tab === i && styles.gridTabOn]}>
            {i === 0 ? (
              <MaterialCommunityIcons name="grid" size={24} color={tab === i ? G.text : G.muted} />
            ) : (
              <MaterialCommunityIcons name={icon} size={25} color={tab === i ? G.text : G.muted} />
            )}
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
      ListHeaderComponent={header}
      renderItem={({ item }) => <Tile post={item} w={cell} h={cell * (4 / 3)} onPress={() => acts.openPost(item)} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyRing}>
            <Ionicons name={tab === 2 ? 'person-outline' : 'camera-outline'} size={34} color={G.text} />
          </View>
          <T size={22} weight="800" color={G.text} center>
            {tab === 2 ? 'Photos of you' : isMe ? 'Share photos' : 'No posts yet'}
          </T>
          <T size={14} color={G.muted} center>
            {tab === 2
              ? 'When people tag you in photos, they’ll appear here.'
              : isMe
                ? 'Tap + to share a photo, or release a track in the Studio and its cover will post here.'
                : 'When they share photos, you’ll see them here.'}
          </T>
        </View>
      }
      contentContainerStyle={styles.gridPad}
      showsVerticalScrollIndicator={false}
    />
  );
}

function Big({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.big}>
      <T size={17} weight="700" color={G.text}>
        {countShort(n)}
      </T>
      <T size={14} color={G.text}>
        {label}
      </T>
    </View>
  );
}

/** A grid tile: the post's first picture, with a reel or carousel mark. */
export function Tile({ post, w, h, onPress }: { post: SocialPost; w: number; h: number; onPress: () => void }) {
  const plan = planPostMedia(post, { textCards: true, orientation: 'portrait' });
  const multi = plan?.kind === 'photo' && plan.photos.length > 1;
  return (
    <Pressable onPress={onPress} style={{ width: w, height: h }}>
      {plan ? <PostMedia plan={plan} thumb style={{ width: w, height: h }} /> : <View style={[styles.blank, { width: w, height: h }]} />}
      {multi ? <MaterialCommunityIcons name="checkbox-multiple-blank" size={16} color="#FFFFFF" style={styles.tileMark} /> : null}
      {post.media?.kind === 'video' ? (
        <View style={styles.tileViews}>
          <Ionicons name="play" size={13} color="#FFFFFF" />
          <T size={12} weight="700">
            {countShort(post.views ?? post.likes * 9)}
          </T>
        </View>
      ) : null}
    </Pressable>
  );
}

// --- Activity (the heart) --------------------------------------------------------

function bucket(at: number, now: number): string {
  const h = (now - at) / 3_600_000;
  if (h < 24) return 'Today';
  if (h < 24 * 7) return 'This week';
  if (h < 24 * 30) return 'This month';
  return 'Earlier';
}

export function Activity({
  items,
  myPosts,
  myFollowers,
  acts,
  onBack,
}: {
  items: PhoneNotification[];
  myPosts: SocialPost[];
  myFollowers: number;
  acts: GramActs;
  onBack: () => void;
}) {
  const now = Date.now();
  const rows = useMemo(() => {
    const out: ({ kind: 'head'; title: string } | { kind: 'note'; n: PhoneNotification })[] = [];
    let last = '';
    for (const n of items) {
      const b = bucket(n.at, now);
      if (b !== last) {
        out.push({ kind: 'head', title: b });
        last = b;
      }
      out.push({ kind: 'note', n });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  const latest = myPosts[0];
  const fans = someAccounts('new-followers', 'flashpic', 3);

  return (
    <View style={styles.fill}>
      <PageHeader title="Notifications" onBack={onBack} color={G.text} background={G.bg} chevron titleSize={22} />
      <FlatList
        data={rows}
        keyExtractor={(r, i) => (r.kind === 'head' ? `h-${r.title}` : r.n.id) + i}
        renderItem={({ item }) =>
          item.kind === 'head' ? (
            <T size={16} weight="700" color={G.text} style={styles.section}>
              {item.title}
            </T>
          ) : (
            <NoteRow n={item.n} acts={acts} />
          )
        }
        ListFooterComponent={
          <View>
            <T size={16} weight="700" color={G.text} style={styles.section}>
              Earlier
            </T>
            {latest && latest.likes > 1 ? (
              <Pressable onPress={() => acts.openPost(latest)} style={styles.note}>
                <View style={styles.pairBig}>
                  <Avatar id={fans[0]?.id ?? 'a'} name={fans[0]?.username ?? 'a'} size={34} />
                  <View style={styles.pairBigBack}>
                    <Avatar id={fans[1]?.id ?? 'b'} name={fans[1]?.username ?? 'b'} size={34} />
                  </View>
                </View>
                <T size={14} color={G.text} lh={19} style={styles.noteText}>
                  <T size={14} weight="700">{fans[0]?.handle}</T> and {count(Math.max(1, latest.likes - 1))} others liked your post.{' '}
                  <T size={14} color={G.muted}>1w</T>
                </T>
                <PostThumb post={latest} />
              </Pressable>
            ) : null}
            <T size={14} color={G.muted} style={styles.moreFollowers}>
              {count(Math.max(3, Math.round(myFollowers * 0.03)))} people followed you this month.
            </T>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function PostThumb({ post }: { post: SocialPost }) {
  const plan = planPostMedia(post, { textCards: true, orientation: 'portrait' });
  return plan ? <PostMedia plan={plan} thumb style={styles.noteThumb} /> : <View style={[styles.noteThumb, styles.blank]} />;
}

function NoteRow({ n, acts }: { n: PhoneNotification; acts: GramActs }) {
  const post = n.post ? (findPost(n.post.id) ?? n.post) : null;
  const handle = n.actor?.handle ?? 'someone';
  const ago = sinceMs(n.at);
  const open = () => {
    const t = n.target;
    if (t.kind === 'story') acts.openStory(t.accountId);
    else if ((t.kind === 'post' || t.kind === 'comments') && post) acts.openPost(post);
    else if (t.kind === 'account') {
      const a = findAccount(t.accountId, 'flashpic', n.actor);
      if (a) acts.openAccount(a);
    }
  };
  const text =
    n.kind === 'follow'
      ? 'started following you.'
      : n.kind === 'like'
        ? n.body.replace(`${handle}`, '').trim()
        : n.kind === 'comment'
          ? n.body.replace(`${handle} `, '')
          : n.body.replace(`${handle} `, '');
  const following = n.actor ? acts.followed.has(n.actor.id) : false;
  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.note, pressed && styles.pressed]}>
      {n.actor ? <Avatar id={n.actor.id} name={n.actor.name} size={44} ring={n.kind === 'story' ? 'new' : undefined} gapColor={G.bg} /> : null}
      <T size={14} color={G.text} lh={19} style={styles.noteText} numberOfLines={3}>
        <T size={14} weight="700">{handle}</T> {text} <T size={14} color={G.muted}>{ago}</T>
      </T>
      {n.kind === 'follow' && n.actor ? (
        <Pressable onPress={() => acts.follow(n.actor!.id)} style={[styles.smallBtn, following ? styles.btnGrey : styles.btnBlue]}>
          <T size={14} weight="600" color="#FFFFFF">
            {following ? 'Following' : 'Follow back'}
          </T>
        </Pressable>
      ) : post ? (
        <PostThumb post={post} />
      ) : null}
    </Pressable>
  );
}

// --- Messages ---------------------------------------------------------------------

const DM_LINES: Record<NpcAccount['accountType'], readonly string[]> = {
  stan: ['I LOVE YOU SO MUCH', 'can you please follow back 🥺🥺', 'your music saved me this year fr'],
  fan: ['omg your new song 😭', 'saw you live last month, still thinking about it', 'when is the next drop??'],
  public: ['heard your song in a cafe today!', 'collab?? 👀'],
  critic: ['Hi! Would love 15 minutes for a feature on the new record.'],
  gossip: ['hey! any comment on the rumors? 👀'],
  industry: ['Loved the new single. Let’s talk sync opportunities.', 'Our team would like to set up a call this week.'],
  news: ['Hi, reaching out for a quick quote for our story.'],
  'rival-fan': ['lol', 'mid'],
  hater: ['who asked', 'mid'],
  artist: ['we should talk.'],
};

export function dmThread(account: NpcAccount): string[] {
  const lines = DM_LINES[account.accountType];
  const h = hashOf(`dm:${account.id}`);
  return [lines[h % lines.length], ...(h % 3 === 0 ? [lines[(h >>> 3) % lines.length]] : [])];
}

export function Messages({ me, onBack, onOpen }: { me: NpcAccount; onBack: () => void; onOpen: (threadId: string) => void }) {
  return (
    <View style={styles.fill}>
      <PageHeader title={me.handle} onBack={onBack} color={G.text} background={G.bg} chevron titleSize={21} right={<Ionicons name="create-outline" size={26} color={G.text} />} />
      <DmList
        platform="flashpic"
        theme={GRAM_DM}
        onOpen={onOpen}
        header={
          <View style={styles.dmSearch}>
            <Ionicons name="search" size={16} color={G.muted} />
            <T size={15} color={G.muted}>
              Search
            </T>
          </View>
        }
      />
    </View>
  );
}

export function Chat({ account, onBack }: { account: NpcAccount; onBack: () => void }) {
  const [sent, setSent] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const incoming = useMemo(() => dmThread(account), [account]);
  return (
    <View style={styles.fill}>
      <PageHeader
        onBack={onBack}
        color={G.text}
        background={G.bg}
        chevron
        right={
          <View style={styles.chatIcons}>
            <Ionicons name="call-outline" size={24} color={G.text} />
            <Ionicons name="videocam-outline" size={27} color={G.text} />
          </View>
        }
        title={account.username}
        subtitle={`Active ${(hashOf(account.id) % 50) + 1}m ago`}
        muted={G.muted}
        titleSize={16}
      />
      <ScrollView contentContainerStyle={styles.chat}>
        <View style={styles.chatIntro}>
          <Avatar id={account.id} name={account.username} size={92} />
          <T size={20} weight="700" color={G.text}>
            {account.username}
          </T>
          <T size={14} color={G.muted}>
            {account.handle} · VibeGram
          </T>
          <T size={14} color={G.muted}>
            {countShort(account.followers)} followers
          </T>
        </View>
        {incoming.map((m, i) => (
          <View key={i} style={styles.inRow}>
            {i === incoming.length - 1 ? <Avatar id={account.id} name={account.username} size={28} /> : <View style={styles.avatarGap} />}
            <View style={styles.inBubble}>
              <T size={15} color={G.text}>
                {m}
              </T>
            </View>
          </View>
        ))}
        {sent.map((m, i) => (
          <LinearGradient key={i} colors={['#A033FF', '#5B51FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.outBubble}>
            <T size={15} color="#FFFFFF">
              {m}
            </T>
          </LinearGradient>
        ))}
        {sent.length > 0 ? (
          <T size={12} color={G.muted} style={styles.seen}>
            Seen just now
          </T>
        ) : null}
      </ScrollView>
      <View style={styles.chatBar}>
        <View style={styles.camera}>
          <Ionicons name="camera" size={20} color="#FFFFFF" />
        </View>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message..."
          placeholderTextColor={G.muted}
          style={styles.chatInput}
          onSubmitEditing={() => {
            if (draft.trim()) setSent((s) => [...s, draft.trim()]);
            setDraft('');
          }}
          returnKeyType="send"
        />
        {draft.trim() ? (
          <Pressable
            onPress={() => {
              setSent((s) => [...s, draft.trim()]);
              setDraft('');
            }}
          >
            <T size={15} weight="700" color={G.blue}>
              Send
            </T>
          </Pressable>
        ) : (
          <View style={styles.chatIcons}>
            <Ionicons name="mic-outline" size={24} color={G.text} />
            <Ionicons name="image-outline" size={24} color={G.text} />
            <MaterialCommunityIcons name="sticker-emoji" size={24} color={G.text} />
          </View>
        )}
      </View>
      <KeyboardSpacer />
    </View>
  );
}

// --- Create -----------------------------------------------------------------------

const GRAM_PICKER: PickerTheme = { bg: G.bg, text: G.text, muted: G.muted, line: G.line, field: G.field, accent: G.blue };

/**
 * The create flow: the phone's real Recents (or the game's own roll when
 * photos aren't shared), one photo or a numbered carousel of up to ten, then
 * a caption and a location. No filters, no editing: straight to Share.
 */
export function CreateFlow({
  seed,
  onClose,
  onShare,
}: {
  seed: string;
  onClose: () => void;
  onShare: (picks: PhotoPick[], caption: string, mode: 'post' | 'story', location: string | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const home = usePlayerStore((s) => s.player?.city ?? null);
  const gallery = useGallery(seed);
  const sel = usePickSelection(gallery.items, 10);
  const [step, setStep] = useState<'pick' | 'caption'>('pick');
  const [mode, setMode] = useState<'post' | 'story'>('post');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState<string | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const keyboardOpen = useKeyboardOpen();
  const focus = sel.focus;
  const picks = sel.picked.length > 0 ? sel.picked : focus ? [focus] : [];

  if (locOpen) {
    return (
      <LocationPicker
        theme={GRAM_PICKER}
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

  if (step === 'caption' && picks.length > 0) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top }]}>
        <View style={styles.createBar}>
          <Pressable onPress={() => setStep('pick')} hitSlop={10}>
            <Ionicons name="arrow-back" size={26} color={G.text} />
          </Pressable>
          <T size={20} weight="700" color={G.text} style={styles.flexShrink}>
            New post
          </T>
          <View style={styles.flex} />
          {/* Instagram's "OK" while typing: closes the keyboard. */}
          {keyboardOpen ? (
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10}>
              <T size={17} weight="700" color={G.blue}>
                OK
              </T>
            </Pressable>
          ) : null}
        </View>
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {picks.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.captionStrip}>
              {picks.map((p) => (
                <PickImage key={pickKey(p)} pick={p} style={styles.stripFrame} />
              ))}
            </ScrollView>
          ) : null}
          <View style={styles.captionRow}>
            {picks.length === 1 ? <PickImage pick={picks[0]} style={styles.captionThumb} /> : null}
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Write a caption..."
              placeholderTextColor={G.muted}
              style={styles.captionInput}
              multiline
              autoFocus
              maxLength={2200}
            />
          </View>
          <View style={styles.optRow}>
            <Ionicons name="person-outline" size={22} color={G.text} />
            <T size={16} color={G.text} style={styles.flex}>
              Tag people
            </T>
            <Ionicons name="chevron-forward" size={18} color={G.muted} />
          </View>
          <Pressable onPress={() => setLocOpen(true)} style={styles.optRow}>
            <Ionicons name="location-outline" size={22} color={G.text} />
            <View style={styles.flex}>
              <T size={16} color={G.text}>
                {location ? location : 'Add location'}
              </T>
            </View>
            {location ? (
              <Pressable onPress={() => setLocation(null)} hitSlop={10}>
                <Ionicons name="close" size={20} color={G.muted} />
              </Pressable>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={G.muted} />
            )}
          </Pressable>
          <View style={styles.optRow}>
            <Ionicons name="musical-notes-outline" size={22} color={G.text} />
            <T size={16} color={G.text} style={styles.flex}>
              Add music
            </T>
            <Ionicons name="chevron-forward" size={18} color={G.muted} />
          </View>
          <View style={styles.optRow}>
            <Ionicons name="eye-outline" size={22} color={G.text} />
            <T size={16} color={G.text} style={styles.flex}>
              Audience
            </T>
            <T size={14} color={G.muted}>
              Everyone
            </T>
            <Ionicons name="chevron-forward" size={18} color={G.muted} />
          </View>
        </ScrollView>
        {/* Share stays above the keyboard (the app draws edge to edge, so nothing else moves it). */}
        <Pressable onPress={() => onShare(picks, caption, 'post', location)} style={[styles.shareBtn, { marginTop: 8, marginBottom: 12 + insets.bottom }]}>
          <T size={16} weight="700" color="#FFFFFF">
            Share
          </T>
        </Pressable>
        <KeyboardSpacer inset={insets.bottom} />
      </View>
    );
  }

  const story = mode === 'story';
  return (
    <View style={[styles.fill, { paddingTop: insets.top }]}>
      <View style={styles.createBar}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={30} color={G.text} />
        </Pressable>
        <T size={20} weight="700" color={G.text}>
          {story ? 'Add to story' : 'New post'}
        </T>
        <View style={styles.flex} />
        <Pressable
          disabled={!focus}
          onPress={() => (story ? focus && onShare([focus], '', 'story', null) : setStep('caption'))}
          hitSlop={10}
        >
          <T size={17} weight="700" color={focus ? G.blue : G.muted}>
            {story ? 'Share' : 'Next'}
          </T>
        </Pressable>
      </View>
      {focus ? (
        <PickImage pick={focus} style={{ width, height: story ? width * 1.2 : width }} />
      ) : (
        <View style={[styles.blank, { width, height: width }]} />
      )}
      <View style={styles.recents}>
        <T size={17} weight="700" color={G.text}>
          Recents
        </T>
        <Ionicons name="chevron-down" size={16} color={G.text} />
        <View style={styles.flex} />
        {!story ? (
          <Pressable onPress={sel.toggleMulti} style={[styles.roundIcon, sel.multi && styles.roundIconOn]} accessibilityLabel="Select multiple">
            <MaterialCommunityIcons name="checkbox-multiple-blank-outline" size={18} color={G.text} />
          </Pressable>
        ) : null}
        <View style={styles.roundIcon}>
          <Ionicons name="camera-outline" size={20} color={G.text} />
        </View>
      </View>
      <AccessBanner access={gallery.access} app="VibeGram" text={G.text} muted={G.muted} accent={G.blue} onAllow={gallery.allow} />
      <GalleryGrid
        items={gallery.items}
        multi={sel.multi && !story}
        order={sel.order}
        focus={focus}
        onPress={sel.press}
        onEndReached={gallery.real ? gallery.loadMore : undefined}
        accent={G.blue}
      />
      <View style={[styles.modes, { bottom: 18 + insets.bottom }]}>
        {(['post', 'story'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} hitSlop={8}>
            <T size={14} weight="700" color={mode === m ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}>
              {m.toUpperCase()}
            </T>
          </Pressable>
        ))}
        <T size={14} weight="700" color="rgba(255,255,255,0.55)">
          REEL
        </T>
      </View>
    </View>
  );
}

// --- A single post ------------------------------------------------------------------

export function PostPage({
  post,
  acts,
  artist,
  track,
  onBack,
}: {
  post: SocialPost;
  acts: GramActs;
  artist: string;
  track: string | null;
  onBack: () => void;
}) {
  return (
    <View style={styles.fill}>
      <PageHeader title="Posts" onBack={onBack} color={G.text} background={G.bg} chevron titleSize={20} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <GramPost post={post} acts={acts} artist={artist} track={track} />
        <View style={styles.pad} />
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  pressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  pad: { height: 40 },
  blank: { backgroundColor: '#1A1A1A' },

  profileBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 54 },
  barTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  barIcons: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  profileRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 4, gap: 16 },
  profileStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  big: { alignItems: 'center' },
  profileText: { paddingHorizontal: 14, paddingTop: 10, gap: 2 },
  mutuals: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  pair: { width: 34, height: 20 },
  pairBack: { position: 'absolute', left: 13, borderWidth: 1.5, borderColor: G.bg, borderRadius: 11 },
  btnRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, marginTop: 14 },
  btn: { flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnSquare: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnGrey: { backgroundColor: G.button },
  btnBlue: { backgroundColor: G.blue },
  highlights: { paddingHorizontal: 12, paddingVertical: 14, gap: 16 },
  highlight: { alignItems: 'center', gap: 5 },
  highlightRing: { width: 66, height: 66, borderRadius: 33, borderWidth: 1, borderColor: '#555', alignItems: 'center', justifyContent: 'center' },
  highlightFace: { width: 58, height: 58, borderRadius: 29 },
  newRing: { borderColor: G.text },
  gridTabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: G.line },
  gridTab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  gridTabOn: { borderBottomWidth: 1, borderBottomColor: G.text },
  gridRow: { gap: 1.5 },
  gridPad: { gap: 1.5 },
  tileMark: { position: 'absolute', top: 7, right: 7 },
  tileViews: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  empty: { alignItems: 'center', gap: 10, paddingHorizontal: 40, paddingVertical: 36 },
  emptyRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: G.text, alignItems: 'center', justifyContent: 'center' },

  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  noteText: { flex: 1 },
  noteThumb: { width: 44, height: 44, borderRadius: 4 },
  smallBtn: { paddingHorizontal: 14, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pairBig: { width: 44, height: 44 },
  pairBigBack: { position: 'absolute', right: 0, top: 0, zIndex: -1 },
  moreFollowers: { paddingHorizontal: 16, paddingVertical: 10 },

  dmSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, marginHorizontal: 14, paddingHorizontal: 12, borderRadius: 10, backgroundColor: G.field },
  dmHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  dm: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: G.blue, marginRight: 6 },
  chatIcons: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  chat: { padding: 14, gap: 6 },
  chatIntro: { alignItems: 'center', gap: 4, paddingVertical: 24 },
  inRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatarGap: { width: 28 },
  inBubble: { maxWidth: '75%', backgroundColor: G.field, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  outBubble: { alignSelf: 'flex-end', maxWidth: '75%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  seen: { alignSelf: 'flex-end', marginTop: 2 },
  chatBar: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 10, paddingLeft: 6, paddingRight: 14, height: 48, borderRadius: 24, backgroundColor: G.field },
  camera: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3797F0', alignItems: 'center', justifyContent: 'center' },
  chatInput: { flex: 1, color: G.text, fontSize: 15, paddingVertical: 0 },

  createBar: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 14, height: 54 },
  recents: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12 },
  roundIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: G.button, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  roundIconOn: { backgroundColor: G.blue },
  pickedVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.35)' },
  modes: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', gap: 22, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 22, backgroundColor: 'rgba(30,30,30,0.92)' },

  captionRow: { flexDirection: 'row', gap: 12, padding: 16 },
  captionStrip: { gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  stripFrame: { width: 150, height: 188, borderRadius: 6 },
  captionThumb: { width: 72, height: 90, borderRadius: 6 },
  captionInput: { flex: 1, color: G.text, fontSize: 16, minHeight: 90, textAlignVertical: 'top' },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 54, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: G.line },
  shareBtn: { marginHorizontal: 16, height: 46, borderRadius: 10, backgroundColor: G.blue, alignItems: 'center', justifyContent: 'center' },
});
