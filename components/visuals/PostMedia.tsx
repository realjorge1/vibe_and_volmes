import React, { useState } from 'react';
import { FlatList, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { MediaPlan } from '../../systems/visuals/scenes';
import type { StockPhoto } from '../../data/photos/photoPack';
import { usePlayerStore } from '../../store/playerStore';
import { useAudioStore } from '../../store/audioStore';
import { useMusicStore } from '../../store/musicStore';
import { CoverArt } from '../audio/CoverArt';
import { T } from '../phone/T';
import { Photo } from './Photo';
import { Avatar } from '../phone/Avatar';
import { OwnCover } from './CoverPoster';

interface Props {
  plan: MediaPlan;
  /** Must size the frame (width + height or aspectRatio). */
  style?: StyleProp<ViewStyle>;
  /** Grid tiles and thumbnails: first frame only, no small print. */
  thumb?: boolean;
  /** Carousels report the frame in view (the app draws its own dots). */
  onIndexChange?: (i: number) => void;
  /** The page a headline card is branded with (its @handle). */
  brand?: string;
}

/** A post's pictures: a photo, a swipeable carousel, or a composed format. */
export function PostMedia({ plan, style, thumb, onIndexChange, brand }: Props) {
  switch (plan.kind) {
    case 'photo':
      return plan.photos.length > 1 && !thumb ? (
        <Carousel photos={plan.photos} style={style} onIndexChange={onIndexChange} />
      ) : (
        <Photo photo={plan.photos[0]} style={[styles.frame, style as StyleProp<object>]} />
      );
    case 'cover':
      return <OwnCover trackId={plan.trackId} title={plan.title} style={style} compact={thumb} />;
    case 'nowPlaying':
      return <NowPlaying title={plan.title} photo={plan.photo} style={style} thumb={thumb} />;
    case 'circled':
      return <Circled photo={plan.photo} style={style} />;
    case 'split':
      return <Split left={plan.left} right={plan.right} labels={plan.labels} caption={plan.caption} style={style} thumb={thumb} />;
    case 'receipts':
      return <Receipts photo={plan.photo} style={style} thumb={thumb} />;
    case 'poster':
      return <Poster photo={plan.photo} style={style} thumb={thumb} />;
    case 'headline':
      return <Headline photo={plan.photo} text={plan.text} brand={brand} style={style} thumb={thumb} />;
    case 'meme':
      return <Meme photo={plan.photo} top={plan.top} bottom={plan.bottom} style={style} thumb={thumb} />;
    case 'tweet':
      return <PostShot name={plan.name} handle={plan.handle} verified={plan.verified} text={plan.text} accountId={plan.accountId} style={style} thumb={thumb} />;
  }
}

function Carousel({
  photos,
  style,
  onIndexChange,
}: {
  photos: StockPhoto[];
  style?: StyleProp<ViewStyle>;
  onIndexChange?: (i: number) => void;
}) {
  const [w, setW] = useState(0);
  const [index, setIndex] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width));
  return (
    <View style={[styles.frame, style]} onLayout={onLayout}>
      {w > 0 ? (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / w);
            setIndex(i);
            onIndexChange?.(i);
          }}
          getItemLayout={(_, i) => ({ length: w, offset: w * i, index: i })}
          renderItem={({ item }) => <Photo photo={item} style={{ width: w, height: '100%' }} />}
        />
      ) : null}
      <View style={styles.counter} pointerEvents="none">
        <T size={12} weight="600">
          {index + 1}/{photos.length}
        </T>
      </View>
    </View>
  );
}

/** Instagram-style carousel dots: the current one blue, the rest grey. */
export function Dots({ count, index, color = '#0095F6', idle = 'rgba(255,255,255,0.35)' }: { count: number; index: number; color?: string; idle?: string }) {
  if (count < 2) return null;
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i === index ? color : idle }]} />
      ))}
    </View>
  );
}

function NowPlaying({ title, photo, style, thumb }: { title: string; photo: StockPhoto; style?: StyleProp<ViewStyle>; thumb?: boolean }) {
  const artist = usePlayerStore((s) => s.player?.artistName ?? '');
  const track = useMusicStore((s) => s.discography.find((t) => t.title === title) ?? null);
  const coverArtId = useAudioStore((s) => s.producedSongs.find((x) => x.trackId === track?.id)?.coverArtId ?? null);
  return (
    <View style={[styles.frame, styles.center, style]}>
      <Photo photo={photo} blur={thumb ? 6 : 24} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      <View style={styles.center}>
        <CoverArt coverArtId={coverArtId} title={title || 'New Music'} size={thumb ? 44 : 150} />
        {!thumb ? (
          <>
            <T size={20} weight="800" center style={styles.npTitle} numberOfLines={1}>
              {title || 'New Music'}
            </T>
            <T size={15} color="rgba(255,255,255,0.75)" center numberOfLines={1}>
              {artist}
            </T>
            <View style={styles.npPill}>
              <Ionicons name="play" size={13} color="#000" />
              <T size={13} weight="700" color="#000">
                Play on Vibestream
              </T>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

function Circled({ photo, style }: { photo: StockPhoto; style?: StyleProp<ViewStyle> }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const d = Math.min(box.w, box.h) * 0.42;
  return (
    <View style={[styles.frame, style]} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Photo photo={photo} blur={1.5} style={[StyleSheet.absoluteFill, styles.zoomed]} />
      {box.w > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.circle,
            {
              width: d,
              height: d * 0.9,
              left: box.w * photo.focus[0] - d / 2,
              top: box.h * photo.focus[1] - d * 0.45,
              borderRadius: d,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

function Split({
  left,
  right,
  labels,
  caption,
  style,
  thumb,
}: {
  left: StockPhoto;
  right: StockPhoto;
  labels: readonly [string, string];
  caption: string;
  style?: StyleProp<ViewStyle>;
  thumb?: boolean;
}) {
  return (
    <View style={[styles.frame, style]}>
      {!thumb ? (
        <View style={styles.memeBar}>
          <T size={17} weight="800" color="#000" center>
            {caption}
          </T>
        </View>
      ) : null}
      <View style={styles.row}>
        {[left, right].map((p, i) => (
          <View key={p.key} style={styles.half}>
            <Photo photo={p} style={StyleSheet.absoluteFill} />
            {!thumb ? (
              <T size={22} weight="900" center style={[styles.splitLabel, styles.shadow]}>
                {labels[i]}
              </T>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Thin white lines across the frame: a cracked-glass filter. */
const CRACKS = [
  { top: '22%', left: '-10%', width: '80%', rotate: '18deg' },
  { top: '48%', left: '30%', width: '90%', rotate: '-24deg' },
  { top: '62%', left: '-5%', width: '70%', rotate: '-8deg' },
  { top: '35%', left: '45%', width: '60%', rotate: '52deg' },
  { top: '70%', left: '40%', width: '55%', rotate: '31deg' },
] as const;

function Receipts({ photo, style, thumb }: { photo: StockPhoto; style?: StyleProp<ViewStyle>; thumb?: boolean }) {
  const name = usePlayerStore((s) => s.player?.artistName ?? '');
  return (
    <View style={[styles.frame, styles.center, style]}>
      <Photo photo={photo} blur={4} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.dimHard]} />
      {CRACKS.map((c, i) => (
        <View key={i} style={[styles.crack, { top: c.top, left: c.left, width: c.width, transform: [{ rotate: c.rotate }] }]} />
      ))}
      <T size={thumb ? 14 : 44} weight="900" center lh={thumb ? 16 : 46} style={styles.receiptName} numberOfLines={2}>
        {name.toUpperCase()}
      </T>
      {!thumb ? (
        <>
          <View style={styles.receiptTag}>
            <T size={13} weight="900" color="#000">
              🧾 RECEIPTS
            </T>
          </View>
          <T size={14} weight="700" color="rgba(255,255,255,0.8)" style={styles.thread}>
            a thread 🧵 1/27
          </T>
        </>
      ) : null}
    </View>
  );
}

function Poster({ photo, style, thumb }: { photo: StockPhoto; style?: StyleProp<ViewStyle>; thumb?: boolean }) {
  const name = usePlayerStore((s) => s.player?.artistName ?? '');
  return (
    <View style={[styles.frame, style]}>
      <Photo photo={photo} style={StyleSheet.absoluteFill} />
      <View style={styles.posterWrap}>
        <LinearGradient colors={['#D7263D', '#5B0E1E']} style={[styles.poster, thumb && styles.posterThumb]}>
          <T size={thumb ? 10 : 26} weight="900" center numberOfLines={2}>
            {name.toUpperCase()}
          </T>
          {!thumb ? (
            <>
              <T size={11} weight="800" color="rgba(255,255,255,0.85)" center style={styles.posterSub}>
                THE WORLD TOUR
              </T>
              <T size={10} weight="600" color="rgba(255,255,255,0.7)" center>
                TICKETS ON SALE NOW
              </T>
            </>
          ) : null}
        </LinearGradient>
      </View>
    </View>
  );
}

function Headline({
  photo,
  text,
  brand,
  style,
  thumb,
}: {
  photo: StockPhoto;
  text: string;
  brand?: string;
  style?: StyleProp<ViewStyle>;
  thumb?: boolean;
}) {
  return (
    <View style={[styles.frame, style]}>
      <Photo photo={photo} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']} start={{ x: 0.5, y: 0.35 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      {brand && !thumb ? (
        <T size={12} weight="800" style={[styles.brand, styles.shadow]}>
          @{brand}
        </T>
      ) : null}
      <View style={[styles.headlineText, thumb && styles.headlineThumb]}>
        <T size={thumb ? 11 : 22} weight="900" lh={thumb ? 13 : 27} numberOfLines={thumb ? 4 : 6} style={styles.shadow}>
          {text}
        </T>
      </View>
    </View>
  );
}

/** The classic meme: a reaction face, bold white caption with a black outline. */
function Meme({ photo, top, bottom, style, thumb }: { photo: StockPhoto; top?: string; bottom?: string; style?: StyleProp<ViewStyle>; thumb?: boolean }) {
  const size = thumb ? 11 : 24;
  const cap = (text: string) => (
    <T size={size} weight="900" center lh={size * 1.12} numberOfLines={thumb ? 3 : 4} style={styles.memeText}>
      {text.toUpperCase()}
    </T>
  );
  return (
    <View style={[styles.frame, style]}>
      <Photo photo={photo} style={StyleSheet.absoluteFill} />
      {top ? <View style={[styles.memeTop, thumb && styles.memeTight]}>{cap(top)}</View> : null}
      {bottom ? <View style={[styles.memeBottom, thumb && styles.memeTight]}>{cap(bottom)}</View> : null}
    </View>
  );
}

/** A screenshot of someone's Chirp post, reposted as a picture. */
function PostShot({
  name,
  handle,
  verified,
  text,
  accountId,
  style,
  thumb,
}: {
  name: string;
  handle: string;
  verified: boolean;
  text: string;
  accountId: string;
  style?: StyleProp<ViewStyle>;
  thumb?: boolean;
}) {
  return (
    <View style={[styles.frame, styles.shotFrame, style]}>
      <View style={[styles.shot, thumb && styles.shotThumb]}>
        <View style={styles.shotHead}>
          <Avatar id={accountId} name={name} size={thumb ? 16 : 40} />
          <View style={styles.shotNames}>
            <View style={styles.shotNameRow}>
              <T size={thumb ? 8 : 15} weight="800" color="#0F1419" numberOfLines={1}>
                {name}
              </T>
              {verified ? <Ionicons name="checkmark-circle" size={thumb ? 8 : 15} color="#1D9BF0" /> : null}
            </View>
            <T size={thumb ? 7 : 13} color="#536471" numberOfLines={1}>
              @{handle}
            </T>
          </View>
        </View>
        <T size={thumb ? 9 : 19} color="#0F1419" lh={thumb ? 11 : 25} numberOfLines={thumb ? 5 : 8}>
          {text}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#111' },
  memeText: { color: '#FFFFFF', textShadowColor: '#000000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4, letterSpacing: 0.5 },
  memeTop: { position: 'absolute', top: 12, left: 12, right: 12 },
  memeBottom: { position: 'absolute', bottom: 14, left: 12, right: 12 },
  memeTight: { top: 4, left: 4, right: 4 },
  shotFrame: { backgroundColor: '#E8EBED', alignItems: 'center', justifyContent: 'center', padding: 18 },
  shot: { alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 10 },
  shotThumb: { padding: 6, gap: 4, borderRadius: 6 },
  shotHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shotNames: { flexShrink: 1 },
  shotNameRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flex: 1, flexDirection: 'row' },
  half: { flex: 1, overflow: 'hidden', justifyContent: 'flex-end' },
  dim: { backgroundColor: 'rgba(0,0,0,0.35)' },
  dimHard: { backgroundColor: 'rgba(0,0,0,0.55)' },
  zoomed: { transform: [{ scale: 1.15 }] },
  shadow: { textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(18,18,18,0.75)',
  },
  dots: { flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  npTitle: { marginTop: 18, paddingHorizontal: 24 },
  npPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  circle: { position: 'absolute', borderWidth: 5, borderColor: '#FF1E1E' },
  memeBar: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 12 },
  splitLabel: { marginBottom: 14 },
  crack: { position: 'absolute', height: 1.5, backgroundColor: 'rgba(255,255,255,0.55)' },
  receiptName: { paddingHorizontal: 20, letterSpacing: -1 },
  receiptTag: { position: 'absolute', top: 16, left: 16, backgroundColor: '#FFD60A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  thread: { position: 'absolute', bottom: 16 },
  posterWrap: { position: 'absolute', top: '8%', left: 0, right: 0, alignItems: 'center' },
  poster: { width: '58%', paddingVertical: 18, paddingHorizontal: 12, borderRadius: 4, gap: 4, transform: [{ rotate: '-2deg' }] },
  posterThumb: { paddingVertical: 6 },
  posterSub: { letterSpacing: 2 },
  brand: { position: 'absolute', top: 12, left: 12 },
  headlineText: { position: 'absolute', left: 16, right: 16, bottom: 18 },
  headlineThumb: { left: 6, right: 6, bottom: 6 },
});
