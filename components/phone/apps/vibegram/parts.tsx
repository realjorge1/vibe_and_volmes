import React, { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { DmTheme } from '../../dm/DmChat';
import type { NpcAccount, SocialPost } from '../../../../types/social';
import { planPostMedia } from '../../../../systems/visuals/scenes';
import { isPortrait } from '../../../../systems/visuals/photoIndex';
import { feedAspect } from '../../../../systems/social/realPhotos';
import { adCta } from '../../../../data/social/everyday/ads';
import { T } from '../../T';
import { Avatar } from '../../Avatar';
import { DoubleTapLike } from '../../DoubleTapLike';
import { Dots, PostMedia } from '../../../visuals/PostMedia';
import { Verified, count, countShort, gramTime } from '../../bits';
import { hashOf } from '../../kit';

/** Instagram's dark palette. */
export const G = {
  bg: '#000000',
  text: '#F5F5F5',
  muted: '#A8A8A8',
  line: '#262626',
  field: '#262626',
  red: '#FF3040',
  blue: '#0095F6',
  button: '#363636',
  sheet: '#262626',
};

/** VibeGram's chat look (Instagram-style purple-blue gradient bubbles). */
export const GRAM_DM: DmTheme = {
  app: 'VibeGram',
  bg: '#000000',
  text: '#F5F5F5',
  muted: '#A8A8A8',
  line: '#262626',
  field: '#262626',
  bubbleIn: '#262626',
  bubbleOut: ['#A033FF', '#5B51FF'],
  outText: '#FFFFFF',
  accent: '#0095F6',
  chip: '#262626',
  chipText: '#F5F5F5',
  chevron: true,
  radius: 20,
};

export type GramPage =
  | { kind: 'post'; post: SocialPost; comments?: boolean; highlight?: string }
  | { kind: 'account'; account: NpcAccount }
  | { kind: 'activity' }
  | { kind: 'messages' }
  | { kind: 'chat'; account: NpcAccount }
  | { kind: 'dm'; threadId: string }
  | { kind: 'reels'; posts: SocialPost[]; start: number }
  | { kind: 'create' };

export interface GramActs {
  week: number;
  liked: ReadonlySet<string>;
  saved: ReadonlySet<string>;
  followed: ReadonlySet<string>;
  like: (id: string) => void;
  likeOnce: (id: string) => void;
  save: (id: string) => void;
  follow: (id: string) => void;
  openPost: (post: SocialPost) => void;
  openComments: (post: SocialPost) => void;
  openAccount: (account: NpcAccount) => void;
  /** Accounts with a story up right now (their avatar wears the ring). */
  hasStory: (id: string) => boolean;
  openStory: (accountId: string) => void;
}

/** "VibeGram" in the script face the real wordmark uses. */
export function Wordmark({ size = 31 }: { size?: number }) {
  return (
    <T size={size} color={G.text} lh={size * 1.25} style={{ fontFamily: 'GrandHotel_400Regular', fontWeight: 'normal' }}>
      VibeGram
    </T>
  );
}

/** What the line under the username says: "Sponsored", the tagged place, a song, or nothing. */
function subline(post: SocialPost, artist: string, track: string | null): string | null {
  const h = hashOf(`${post.id}:sub`);
  if (post.sponsored) return 'Sponsored';
  if (post.location) return post.location;
  // Strangers' and other artists' posts don't play the player's song.
  if (post.lane) return h % 4 === 1 ? ['Los Angeles, California', 'London, United Kingdom', 'Atlanta, Georgia', 'Lagos, Nigeria', 'New York, New York', 'Toronto, Ontario'][h % 6] : null;
  if (post.account.id === 'player' && track) return `♫ ${artist} · ${track}`;
  if (h % 5 === 0 && track) return `♫ ${artist} · ${track}`;
  if (h % 5 === 1) return ['Los Angeles, California', 'London, United Kingdom', 'Atlanta, Georgia', 'Lagos, Nigeria', 'New York, New York', 'Toronto, Ontario'][h % 6];
  return null;
}

/** A post in the feed, the way Instagram lays it out. */
export function GramPost({ post, acts, artist, track }: { post: SocialPost; acts: GramActs; artist: string; track: string | null }) {
  const { width } = useWindowDimensions();
  const [more, setMore] = useState(false);
  const [frame, setFrame] = useState(0);
  const liked = acts.liked.has(post.id);
  const saved = acts.saved.has(post.id);
  const plan = planPostMedia(post, { textCards: true, orientation: 'portrait' });
  const photos = plan?.kind === 'photo' ? plan.photos : [];
  const tall = plan?.kind === 'photo' ? isPortrait(plan.photos[0]) : plan?.kind === 'headline' || plan?.kind === 'split';
  // The player's real photos keep their own shape, inside Instagram's 4:5 to 1.91:1.
  const frameH =
    plan?.kind === 'photo' && post.media?.real ? width / feedAspect(plan.photos[0].w, plan.photos[0].h) : tall ? width * 1.25 : width;
  const followsYou = post.account.id !== 'player' && !acts.followed.has(post.account.id) && hashOf(`${post.id}:f`) % 3 === 0;
  const sub = subline(post, artist, track);

  return (
    <View style={styles.post}>
      <View style={styles.postHead}>
        <Pressable onPress={() => (acts.hasStory(post.account.id) ? acts.openStory(post.account.id) : acts.openAccount(post.account))}>
          {acts.hasStory(post.account.id) ? (
            <Avatar id={post.account.id} name={post.account.username} size={30} ring="new" gapColor={G.bg} />
          ) : (
            <Avatar id={post.account.id} name={post.account.username} size={34} />
          )}
        </Pressable>
        <Pressable onPress={() => acts.openAccount(post.account)} style={styles.headText}>
          <View style={styles.nameLine}>
            <T size={14} weight="700" color={G.text} numberOfLines={1} style={styles.shrink}>
              {post.account.handle}
            </T>
            {post.account.isVerified ? <Verified app="gram" size={13} /> : null}
            {followsYou ? (
              <T size={14} weight="700" color={G.text}>
                {' '}
                •{' '}
                <T size={14} weight="700" color={G.blue} onPress={() => acts.follow(post.account.id)}>
                  Follow
                </T>
              </T>
            ) : null}
          </View>
          {sub ? (
            <T size={12} color={G.text} numberOfLines={1}>
              {sub}
            </T>
          ) : null}
        </Pressable>
        <Ionicons name="ellipsis-vertical" size={18} color={G.text} />
      </View>

      {plan ? (
        <DoubleTapLike onLike={() => acts.likeOnce(post.id)}>
          <PostMedia plan={plan} brand={post.account.handle} onIndexChange={setFrame} style={{ width, height: frameH }} />
        </DoubleTapLike>
      ) : null}
      {post.sponsored ? (
        <View style={styles.cta}>
          <T size={14} weight="600" color={G.text}>
            {adCta(post.account.id) ?? 'Learn more'}
          </T>
          <Ionicons name="chevron-forward" size={18} color={G.text} />
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={() => acts.like(post.id)} hitSlop={8} style={styles.act}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={27} color={liked ? G.red : G.text} />
          <T size={14} weight="600" color={G.text}>
            {countShort(post.likes + (liked ? 1 : 0))}
          </T>
        </Pressable>
        <Pressable onPress={() => acts.openComments(post)} hitSlop={8} style={styles.act}>
          <Ionicons name="chatbubble-outline" size={24} color={G.text} style={styles.flip} />
          {post.replies > 0 ? (
            <T size={14} weight="600" color={G.text}>
              {countShort(post.replies)}
            </T>
          ) : null}
        </Pressable>
        <View style={styles.act}>
          <MaterialCommunityIcons name="repeat-variant" size={27} color={G.text} />
          {post.reposts > 0 ? (
            <T size={14} weight="600" color={G.text}>
              {countShort(post.reposts)}
            </T>
          ) : null}
        </View>
        <View style={styles.act}>
          <Ionicons name="paper-plane-outline" size={23} color={G.text} />
          {(post.shares ?? 0) > 0 ? (
            <T size={14} weight="600" color={G.text}>
              {countShort(post.shares ?? 0)}
            </T>
          ) : null}
        </View>
        <View style={styles.flex}>{photos.length > 1 ? <Dots count={photos.length} index={frame} /> : null}</View>
        <Pressable onPress={() => acts.save(post.id)} hitSlop={8}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={24} color={G.text} />
        </Pressable>
      </View>

      <View style={styles.caption}>
        <Pressable onPress={() => setMore(true)} disabled={more}>
          <T size={14} color={G.text} lh={19} numberOfLines={more ? undefined : 2}>
            <T size={14} weight="700" color={G.text}>
              {post.account.handle}
            </T>{' '}
            {post.content}
          </T>
        </Pressable>
        {post.replies > 0 ? (
          <Pressable onPress={() => acts.openComments(post)} hitSlop={4}>
            <T size={14} color={G.muted} style={styles.line}>
              View all {count(post.replies)} comments
            </T>
          </Pressable>
        ) : null}
        <T size={12} color={G.muted} style={styles.age}>
          {gramTime(post, acts.week)}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, alignItems: 'center' },
  shrink: { flexShrink: 1 },
  post: { paddingBottom: 16 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, paddingRight: 8, height: 56 },
  headText: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  flip: { transform: [{ scaleX: -1 }] },
  caption: { paddingHorizontal: 14, gap: 4, marginTop: 4 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, height: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: G.line },
  line: { marginTop: 1 },
  age: { marginTop: 2 },
});
