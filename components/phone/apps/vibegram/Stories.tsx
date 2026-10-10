import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useKeyboardLift } from '../../KeyboardSpacer';
import type { NpcAccount, SocialPost } from '../../../../types/social';
import { hashOf, photoByKey, pickPhoto, postPhotoKeys, type PhotoTag, type StockPhoto } from '../../../../systems/visuals/photoIndex';
import { planPostMedia } from '../../../../systems/visuals/scenes';
import { T } from '../../T';
import { Avatar } from '../../Avatar';
import { Photo } from '../../../visuals/Photo';
import { ANIMATIONS_ENABLED } from '../../../../constants/theme';

const STORY_MS = 5000;

export interface StoryItem {
  id: string;
  photo: StockPhoto;
  text?: string;
  /** "@handle" mention sticker. */
  mention?: string;
  /** "Title · Artist" music sticker. */
  music?: string;
  ago: string;
}

export interface StoryReel {
  account: NpcAccount;
  items: StoryItem[];
}

interface Me {
  handle: string;
  artist: string;
  trackTitle: string | null;
}

const TAGS: Record<NpcAccount['accountType'], readonly (readonly PhotoTag[])[]> = {
  stan: [['crowd', 'fancam'], ['stage', 'player'], ['crowd']],
  fan: [['coffee', 'food'], ['city', 'night'], ['pets'], ['drive', 'sky'], ['crowd']],
  public: [['coffee', 'lifestyle'], ['pets'], ['sky', 'beach'], ['city']],
  gossip: [['press', 'paparazzi'], ['moody', 'street']],
  critic: [['vinyl'], ['headphones', 'studio']],
  industry: [['studio'], ['stage', 'crowd']],
  news: [['press'], ['city']],
  'rival-fan': [['stage'], ['crowd']],
  hater: [['moody'], ['city', 'night'], ['phone']],
  artist: [['stage', 'crowd'], ['studio'], ['flex', 'jewelry']],
};

const LINES: Record<NpcAccount['accountType'], readonly string[]> = {
  stan: ['best night of my life 😭', 'still not over this', 'we were RIGHT THERE'],
  fan: ['sunday reset ☕', 'city never sleeps', 'mood', 'on repeat'],
  public: ['', 'vibes', 'weekend'],
  gossip: ['👀 tea drops at 9', 'you did NOT hear it from us'],
  critic: ['currently spinning', 'review up tomorrow'],
  industry: ['big week 🚀', 'in session'],
  news: ['more on the feed', 'BREAKING on our page'],
  'rival-fan': ['our artist >>>', 'no contest'],
  hater: ['', 'touch grass', 'the internet is cooked'],
  artist: ['studio till sunrise 🌅', 'they not ready', 'number one. again.'],
};

/** An account's stories today: one to three frames, the same all week. */
export function storiesFor(account: NpcAccount, me: Me, week: number): StoryItem[] {
  const h = hashOf(`${account.id}:${week}:story`);
  const n = 1 + (h % 3);
  const groups = TAGS[account.accountType];
  const lines = LINES[account.accountType];
  const fanlike = account.accountType === 'stan' || account.accountType === 'fan';
  const out: StoryItem[] = [];
  for (let i = 0; i < n; i++) {
    const k = hashOf(`${account.id}:${week}:${i}`);
    out.push({
      id: `st-${account.id}-${week}-${i}`,
      photo: pickPhoto(groups[k % groups.length], `story:${account.id}:${week}:${i}`, { orientation: 'portrait' }),
      text: lines[k % lines.length] || undefined,
      mention: fanlike && k % 3 === 0 ? `@${me.handle}` : undefined,
      music: fanlike && me.trackTitle && k % 2 === 0 ? `${me.trackTitle} · ${me.artist}` : undefined,
      ago: `${(k % 20) + 1}h`,
    });
  }
  return out;
}

/** A story post (from a notification, or the artist's own) as a frame. */
export function storyFromPost(post: SocialPost, me: Me): StoryItem {
  const plan = planPostMedia(post, { orientation: 'portrait' });
  const own = photoByKey(postPhotoKeys(post.media)[0]);
  const photo = own ?? (plan?.kind === 'photo' ? plan.photos[0] : pickPhoto(['crowd', 'stage'], post.id, { orientation: 'portrait' }));
  const mentions = post.content.includes(`@${me.handle}`);
  return {
    id: post.id,
    photo,
    text: mentions ? post.content.replace(`@${me.handle}`, '').replace(/\s+/g, ' ').trim() : post.content || undefined,
    mention: mentions ? `@${me.handle}` : undefined,
    music: mentions && me.trackTitle ? `${me.trackTitle} · ${me.artist}` : undefined,
    ago: '1m',
  };
}

interface Props {
  reels: StoryReel[];
  start: number;
  onSeen: (accountId: string) => void;
  onClose: () => void;
  onAccount: (account: NpcAccount) => void;
}

/**
 * Stories the way Instagram plays them: a bar per frame filling across the
 * top, tap the right side to go on and the left to go back, hold to pause,
 * swipe down to leave. Reply at the bottom.
 */
export function StoryViewer({ reels, start, onSeen, onClose, onAccount }: Props) {
  const insets = useSafeAreaInsets();
  const [reel, setReel] = useState(start);
  const [frame, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState<ReadonlySet<string>>(() => new Set());
  const [reply, setReply] = useState('');
  const progress = useSharedValue(0);
  const zoom = useSharedValue(1);
  const drag = useSharedValue(0);
  // The reply bar rides on top of the keyboard.
  const lift = useKeyboardLift();
  const cur = reels[reel];
  const item = cur?.items[frame];

  const state = useRef({ reel, frame });
  state.current = { reel, frame };
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const next = useCallback(() => {
    const { reel: r, frame: f } = state.current;
    if (f + 1 < (reels[r]?.items.length ?? 0)) setFrame(f + 1);
    else if (r + 1 < reels.length) {
      setReel(r + 1);
      setFrame(0);
    } else closeRef.current();
  }, [reels]);

  const prev = useCallback(() => {
    const { reel: r, frame: f } = state.current;
    if (f > 0) setFrame(f - 1);
    else if (r > 0) {
      setReel(r - 1);
      setFrame(Math.max(0, (reels[r - 1]?.items.length ?? 1) - 1));
    } else {
      progress.value = 0;
    }
  }, [reels, progress]);

  const run = useCallback(
    (from: number) => {
      progress.value = from;
      // The story clock, not just a visual: it must keep time even with
      // animations off (the bar is drawn still then).
      progress.value = withTiming(
        1,
        { duration: STORY_MS * (1 - from), easing: Easing.linear, reduceMotion: ReduceMotion.Never },
        (done) => {
          if (done) runOnJS(next)();
        }
      );
      if (ANIMATIONS_ENABLED) zoom.value = withTiming(1.08, { duration: STORY_MS * (1 - from), easing: Easing.linear });
    },
    [next, progress, zoom]
  );

  // A new frame starts from zero.
  useEffect(() => {
    if (!cur) return;
    onSeen(cur.account.id);
    zoom.value = 1;
    if (!paused) run(0);
    else progress.value = 0;
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel, frame]);

  // Hold to pause; let go to carry on from where it stopped.
  useEffect(() => {
    if (paused) {
      cancelAnimation(progress);
      cancelAnimation(zoom);
    } else if (progress.value > 0 && progress.value < 1) run(progress.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  const tapAt = (x: number, w: number) => (x < w * 0.33 ? prev() : next());
  const [w, setW] = useState(1);

  const pan = Gesture.Pan()
    .activeOffsetY(14)
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 130 || e.velocityY > 900) runOnJS(onClose)();
      else drag.value = withSpring(0);
    });
  const hold = Gesture.LongPress()
    .minDuration(220)
    .onStart(() => runOnJS(setPaused)(true))
    .onFinalize(() => runOnJS(setPaused)(false));
  const tap = Gesture.Tap()
    .maxDuration(240)
    .onEnd((e, ok) => {
      if (ok) runOnJS(tapAt)(e.x, w);
    });

  const bar = useAnimatedStyle(() => ({ width: ANIMATIONS_ENABLED ? `${progress.value * 100}%` : '0%' }));
  const photoStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));
  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: drag.value }, { scale: 1 - Math.min(0.12, drag.value / 2000) }],
    borderRadius: drag.value > 0 ? 18 : 0,
  }));

  if (!cur || !item) return null;
  const isLiked = liked.has(item.id);

  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(150)} style={[StyleSheet.absoluteFill, styles.root]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.card, sheet]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <GestureDetector gesture={Gesture.Exclusive(pan, Gesture.Exclusive(hold, tap))}>
          <View style={StyleSheet.absoluteFill}>
            <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
              <Photo photo={item.photo} style={StyleSheet.absoluteFill} priority="high" />
            </Animated.View>
            <LinearGradient colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']} style={styles.topShade} />
            <View style={styles.stickers} pointerEvents="none">
              {item.text ? (
                <View style={styles.textSticker}>
                  <T size={20} weight="700" center lh={26}>
                    {item.text}
                  </T>
                </View>
              ) : null}
              {item.mention ? (
                <View style={styles.mention}>
                  <T size={18} weight="800" color="#E1306C">
                    {item.mention.toUpperCase()}
                  </T>
                </View>
              ) : null}
              {item.music ? (
                <View style={styles.music}>
                  <Ionicons name="musical-notes" size={15} color="#111" />
                  <T size={13} weight="700" color="#111" numberOfLines={1}>
                    {item.music}
                  </T>
                </View>
              ) : null}
            </View>
          </View>
        </GestureDetector>

        <View style={[styles.top, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
          <View style={styles.bars}>
            {cur.items.map((it, i) => (
              <View key={it.id} style={styles.track}>
                {i < frame ? <View style={styles.full} /> : i === frame ? <Animated.View style={[styles.fillBar, bar]} /> : null}
              </View>
            ))}
          </View>
          <View style={styles.who} pointerEvents="box-none">
            <Pressable onPress={() => onAccount(cur.account)} style={styles.whoTap}>
              <Avatar id={cur.account.id} name={cur.account.username} size={32} />
              <T size={14} weight="700" numberOfLines={1} style={styles.shadow}>
                {cur.account.handle}
              </T>
              <T size={14} color="rgba(255,255,255,0.75)" style={styles.shadow}>
                {item.ago}
              </T>
            </Pressable>
            <View style={styles.flex} />
            <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close stories">
              <Ionicons name="close" size={30} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <Animated.View style={[styles.replyRow, { paddingBottom: 12 }, lift]}>
          <View style={styles.replyField}>
            <TextInput
              value={reply}
              onChangeText={setReply}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              placeholder="Send message"
              placeholderTextColor="rgba(255,255,255,0.85)"
              style={styles.replyInput}
              onSubmitEditing={() => setReply('')}
            />
          </View>
          <Pressable
            hitSlop={10}
            onPress={() =>
              setLiked((s) => {
                const n = new Set(s);
                if (n.has(item.id)) n.delete(item.id);
                else n.add(item.id);
                return n;
              })
            }
            accessibilityLabel="Like story"
          >
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={28} color={isLiked ? '#FF3040' : '#FFFFFF'} />
          </Pressable>
          <Ionicons name="paper-plane-outline" size={26} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#000' },
  card: { overflow: 'hidden', backgroundColor: '#111' },
  flex: { flex: 1 },
  topShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 160 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 8, gap: 10 },
  bars: { flexDirection: 'row', gap: 3 },
  track: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  full: { height: '100%', backgroundColor: '#FFFFFF' },
  fillBar: { height: '100%', backgroundColor: '#FFFFFF' },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  whoTap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  shadow: { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  stickers: { position: 'absolute', left: 0, right: 0, top: '42%', alignItems: 'center', gap: 14, paddingHorizontal: 30 },
  textSticker: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  mention: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: '-4deg' }] },
  music: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 260,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyRow: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 14, paddingTop: 8 },
  replyField: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', paddingHorizontal: 18 },
  replyInput: { color: '#FFFFFF', fontSize: 15, paddingVertical: 0 },
});
