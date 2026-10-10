import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NpcAccount, SocialPost } from '../../../../types/social';
import type { DmTheme } from '../../dm/DmChat';
import type { ThreadReply } from '../../../../systems/social/threadGenerator';
import { planPostMedia } from '../../../../systems/visuals/scenes';
import { T } from '../../T';
import { Avatar } from '../../Avatar';
import { PostMedia } from '../../../visuals/PostMedia';
import { Photo } from '../../../visuals/Photo';
import type { StockPhoto } from '../../../../data/photos/photoPack';
import { Verified, chirpTime, countShort, sinceMs } from '../../bits';
import { hashOf } from '../../kit';

/** A finished X poll: result bars, the winner in bold. */
export function Poll({ post }: { post: SocialPost }) {
  const poll = post.poll;
  if (!poll) return null;
  const pcts = [poll.pct, 100 - poll.pct];
  const win = pcts[0] >= pcts[1] ? 0 : 1;
  return (
    <View style={pollStyles.wrap}>
      {poll.options.map((o, i) => (
        <View key={i} style={pollStyles.row}>
          <View style={[pollStyles.bar, { width: `${Math.max(2, pcts[i])}%`, backgroundColor: i === win ? 'rgba(29,155,240,0.55)' : '#2F3336' }]} />
          <T size={15} weight={i === win ? '700' : '400'} color={C.text} numberOfLines={1} style={pollStyles.label}>
            {o}
          </T>
          <T size={15} weight={i === win ? '700' : '400'} color={C.text}>
            {pcts[i]}%
          </T>
        </View>
      ))}
      <T size={14} color={C.muted}>
        {countShort(poll.votes)} votes · Final results
      </T>
    </View>
  );
}

const pollStyles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 8, marginBottom: 2 },
  row: { height: 32, borderRadius: 6, justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 10, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6 },
  label: { flexShrink: 1, marginRight: 8 },
});

/** X's "Lights out" palette. */
export const C = {
  bg: '#000000',
  text: '#E7E9EA',
  muted: '#71767B',
  line: '#2F3336',
  field: '#202327',
  blue: '#1D9BF0',
  pink: '#F91880',
  green: '#00BA7C',
  white: '#EFF3F4',
  header: 'rgba(0,0,0,0.92)',
};

/** X-style chat: blue bubbles out, dark grey in. */
export const CHIRP_DM: DmTheme = {
  app: 'Chirp',
  bg: '#000000',
  text: '#E7E9EA',
  muted: '#71767B',
  line: '#2F3336',
  field: '#202327',
  bubbleIn: '#2F3336',
  bubbleOut: ['#1D9BF0', '#1D9BF0'],
  outText: '#FFFFFF',
  accent: '#1D9BF0',
  chip: '#16181C',
  chipText: '#1D9BF0',
  chevron: false,
  radius: 22,
};

export type Page =
  | { kind: 'post'; post: SocialPost; highlight?: string }
  | { kind: 'account'; account: NpcAccount }
  | { kind: 'trend'; hashtag: string; volume: number }
  | { kind: 'compose'; replyTo?: SocialPost }
  | { kind: 'community'; name: string }
  | { kind: 'dm'; threadId: string };

/** What every row needs to react to taps. */
export interface Acts {
  week: number;
  liked: ReadonlySet<string>;
  reposted: ReadonlySet<string>;
  bookmarked: ReadonlySet<string>;
  like: (id: string) => void;
  repost: (id: string) => void;
  bookmark: (id: string) => void;
  openPost: (post: SocialPost) => void;
  openAccount: (account: NpcAccount) => void;
  compose: (replyTo?: SocialPost) => void;
}

export function Rule() {
  return <View style={styles.rule} />;
}

/** A post's picture, the X way: rounded, hairline-edged, wide; two to four photos tile into a grid. */
export function ChirpMedia({ post }: { post: SocialPost }) {
  const plan = post.media ? planPostMedia(post, { orientation: 'landscape' }) : null;
  if (!plan) return null;
  if (plan.kind === 'photo' && plan.photos.length > 1 && post.account.id === 'player') return <PhotoGrid photos={plan.photos.slice(0, 4)} />;
  if (plan.kind === 'photo' && post.media?.real) {
    const p = plan.photos[0];
    return <PostMedia plan={plan} style={[styles.media, { aspectRatio: Math.min(1.91, Math.max(0.75, p.w / p.h)) }]} />;
  }
  return <PostMedia plan={plan} style={styles.media} />;
}

/** X's photo grid: two side by side, three as one tall plus two, four as a square. */
function PhotoGrid({ photos }: { photos: StockPhoto[] }) {
  const [a, b, c, d] = photos;
  return (
    <View style={[styles.media, styles.grid]}>
      <View style={styles.gridCol}>
        <Photo photo={a} style={styles.flexCell} />
        {d ? <Photo photo={c} style={styles.flexCell} /> : null}
      </View>
      <View style={styles.gridCol}>
        <Photo photo={b} style={styles.flexCell} />
        {d ? <Photo photo={d} style={styles.flexCell} /> : c ? <Photo photo={c} style={styles.flexCell} /> : null}
      </View>
    </View>
  );
}

/** A post in a timeline. */
export function PostRow({ post, acts, pinned }: { post: SocialPost; acts: Acts; pinned?: boolean }) {
  return (
    <Pressable onPress={() => acts.openPost(post)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {pinned ? (
        <View style={styles.context}>
          <Ionicons name="pin" size={13} color={C.muted} />
          <T size={13} weight="700" color={C.muted}>
            Pinned
          </T>
        </View>
      ) : null}
      <View style={styles.rowInner}>
        <Pressable onPress={() => acts.openAccount(post.account)} hitSlop={4}>
          <Avatar id={post.account.id} name={post.account.username} size={40} />
        </Pressable>
        <View style={styles.body}>
          <View style={styles.nameLine}>
            <T size={15} weight="700" color={C.text} numberOfLines={1} style={styles.shrink}>
              {post.account.username}
            </T>
            {post.account.isVerified ? <Verified app="chirp" size={17} /> : null}
            <T size={15} color={C.muted} numberOfLines={1} style={styles.shrinkMore}>
              @{post.account.handle}
              {post.sponsored ? '' : ` · ${chirpTime(post, acts.week)}`}
            </T>
            <View style={styles.flex} />
            {post.sponsored ? (
              <T size={13} color={C.muted} style={styles.adLabel}>
                Ad
              </T>
            ) : null}
            <Ionicons name="ellipsis-horizontal" size={17} color={C.muted} />
          </View>
          {post.content ? (
            <T size={15} color={C.text} lh={20} style={styles.text}>
              {post.content}
            </T>
          ) : null}
          {post.poll ? <Poll post={post} /> : null}
          <ChirpMedia post={post} />
          {post.location ? (
            <View style={styles.locLine}>
              <Ionicons name="location-outline" size={14} color={C.muted} />
              <T size={13} color={C.muted} numberOfLines={1}>
                {post.location}
              </T>
            </View>
          ) : null}
          <Actions post={post} acts={acts} />
        </View>
      </View>
    </Pressable>
  );
}

/** Reply, repost, like, views, bookmark, share: X's action row. */
export function Actions({ post, acts, big }: { post: SocialPost; acts: Acts; big?: boolean }) {
  const liked = acts.liked.has(post.id);
  const reposted = acts.reposted.has(post.id);
  const saved = acts.bookmarked.has(post.id);
  const size = big ? 22 : 18;
  return (
    <View style={[styles.actions, big && styles.actionsBig]}>
      <Stat icon="chatbubble-outline" n={big ? undefined : post.replies} color={C.muted} size={size} onPress={() => acts.compose(post)} />
      <Stat
        icon="repeat"
        n={big ? undefined : post.reposts + (reposted ? 1 : 0)}
        color={reposted ? C.green : C.muted}
        size={size + 2}
        onPress={() => acts.repost(post.id)}
      />
      <Stat
        icon={liked ? 'heart' : 'heart-outline'}
        n={big ? undefined : post.likes + (liked ? 1 : 0)}
        color={liked ? C.pink : C.muted}
        size={size}
        onPress={() => acts.like(post.id)}
      />
      {!big ? <Stat icon="stats-chart" n={post.views ?? 0} color={C.muted} size={size - 2} /> : null}
      <View style={styles.tail}>
        <Pressable onPress={() => acts.bookmark(post.id)} hitSlop={8}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={size - 1} color={saved ? C.blue : C.muted} />
        </Pressable>
        <Ionicons name="share-outline" size={size} color={C.muted} />
      </View>
    </View>
  );
}

function Stat({
  icon,
  n,
  color,
  size,
  onPress,
}: {
  icon: string;
  n?: number;
  color: string;
  size: number;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={8} style={styles.stat}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={size} color={color} />
      {n !== undefined && n > 0 ? (
        <T size={13} color={color}>
          {countShort(n)}
        </T>
      ) : null}
    </Pressable>
  );
}

/** A reply under a post (detail page), optionally the one a notification pointed at. */
export function ReplyRow({
  reply,
  to,
  acts,
  highlight,
  onAccount,
  onReply,
}: {
  reply: ThreadReply;
  to: string;
  acts: Acts;
  highlight?: boolean;
  onAccount: () => void;
  /** Answer this reply. */
  onReply?: () => void;
}) {
  const liked = acts.liked.has(reply.id);
  const age = reply.at !== undefined ? sinceMs(reply.at) : `${(hashOf(reply.id) % 50) + 1}m`;
  return (
    <View style={[styles.row, highlight && styles.highlight]}>
      <View style={styles.rowInner}>
        <Pressable onPress={onAccount} hitSlop={4}>
          <Avatar id={reply.accountId} name={reply.username} size={40} />
        </Pressable>
        <View style={styles.body}>
          <View style={styles.nameLine}>
            <T size={15} weight="700" color={C.text} numberOfLines={1} style={styles.shrink}>
              {reply.username}
            </T>
            {reply.verified ? <Verified app="chirp" size={17} /> : null}
            <T size={15} color={C.muted} numberOfLines={1} style={styles.shrinkMore}>
              @{reply.handle} · {age}
            </T>
          </View>
          <T size={15} color={C.muted} style={styles.replying}>
            Replying to <T size={15} color={C.blue}>@{to}</T>
          </T>
          <T size={15} color={C.text} lh={20} style={styles.text}>
            {reply.content}
          </T>
          <View style={styles.actions}>
            <Stat icon="chatbubble-outline" n={reply.children?.length || undefined} color={C.muted} size={18} onPress={onReply} />
            <Stat icon="repeat" color={C.muted} size={20} />
            <Stat
              icon={liked ? 'heart' : 'heart-outline'}
              n={reply.likes + (liked ? 1 : 0)}
              color={liked ? C.pink : C.muted}
              size={18}
              onPress={() => acts.like(reply.id)}
            />
            <Stat icon="stats-chart" n={reply.likes * 14 + 30} color={C.muted} size={16} />
            <View style={styles.tail}>
              <Ionicons name="bookmark-outline" size={17} color={C.muted} />
              <Ionicons name="share-outline" size={18} color={C.muted} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <T size={31} weight="800" color={C.text} lh={36}>
        {title}
      </T>
      <T size={15} color={C.muted} lh={20}>
        {body}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: C.line },
  pressed: { backgroundColor: 'rgba(255,255,255,0.03)' },
  highlight: { backgroundColor: 'rgba(29,155,240,0.1)' },
  row: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  context: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 26, marginBottom: 4 },
  rowInner: { flexDirection: 'row', gap: 10 },
  body: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shrink: { flexShrink: 1 },
  shrinkMore: { flexShrink: 2 },
  text: { marginTop: 2 },
  replying: { marginTop: 1 },
  media: { marginTop: 12, aspectRatio: 16 / 10, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  grid: { flexDirection: 'row', gap: 2, overflow: 'hidden' },
  adLabel: { marginRight: 6 },
  locLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  gridCol: { flex: 1, gap: 2 },
  flexCell: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 8 },
  actionsBig: { marginTop: 0, marginBottom: 0, paddingHorizontal: 4 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 48 },
  tail: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  empty: { paddingHorizontal: 32, paddingVertical: 40, gap: 8 },
});
