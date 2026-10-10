import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { ClipCaption, ClipPlan, ClipShot } from '../../systems/visuals/clips';
import { hashOf } from '../../systems/visuals/photoIndex';
import { T } from '../phone/T';
import { Photo } from './Photo';
import { ANIMATIONS_ENABLED } from '../../constants/theme';

interface Props {
  plan: ClipPlan;
  /** On screen: the edit plays. Off screen it rests on its first frame. */
  active: boolean;
  paused?: boolean;
  /** Seed for caption styling (the post id). */
  seed: string;
  style?: StyleProp<ViewStyle>;
  /** Thin progress bar along the bottom edge. */
  progress?: boolean;
  progressColor?: string;
  /** Leave room at the bottom for the app's caption block. */
  captionInset?: number;
}

/**
 * A short video, played as an edit over photos: each shot pushes in or pulls
 * out, cuts land with a flash or a zoom punch, and the creator's text is
 * burned in at its moment. Driven by one clock on the UI thread.
 */
export function ClipPlayer({ plan, active, paused, seed, style, progress, progressColor = '#FFFFFF', captionInset = 0 }: Props) {
  const t = useSharedValue(0);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const D = plan.duration;
    if (ANIMATIONS_ENABLED && active && !paused) {
      const from = t.value % D;
      t.value = from;
      t.value = withSequence(
        withTiming(D, { duration: D - from, easing: Easing.linear }),
        withRepeat(
          withSequence(withTiming(0, { duration: 0 }), withTiming(D, { duration: D, easing: Easing.linear })),
          -1
        )
      );
    } else {
      cancelAnimation(t);
      if (!active) t.value = 0;
    }
    return () => cancelAnimation(t);
  }, [active, paused, plan.duration, t]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
  };

  const flashes = plan.shots.filter((s) => s.enter === 'flash').map((s) => s.start);

  return (
    <View style={[styles.frame, style]} onLayout={onLayout}>
      {box.w > 0 ? (
        plan.layout === 'duet' ? (
          <View style={styles.row}>
            <View style={styles.half}>
              <Shots shots={plan.shots} t={t} w={box.w / 2} h={box.h} />
            </View>
            <View style={styles.half}>
              <Shots shots={plan.side} t={t} w={box.w / 2} h={box.h} />
            </View>
          </View>
        ) : (
          <Shots shots={plan.shots} t={t} w={box.w} h={box.h} />
        )
      ) : null}
      {flashes.length > 0 ? <Flash at={flashes} t={t} /> : null}
      {plan.overlay === 'thumbnail' ? <Thumbnail /> : null}
      <Captions captions={plan.captions} t={t} seed={seed} inset={captionInset} />
      {progress ? <Progress t={t} duration={plan.duration} color={progressColor} /> : null}
    </View>
  );
}

function Shots({ shots, t, w, h }: { shots: ClipShot[]; t: SharedValue<number>; w: number; h: number }) {
  return (
    <>
      {shots.map((s, i) => (
        <Shot key={`${s.photo.key}:${i}`} shot={s} t={t} w={w} h={h} last={i === shots.length - 1} />
      ))}
    </>
  );
}

function Shot({ shot, t, w, h, last }: { shot: ClipShot; t: SharedValue<number>; w: number; h: number; last: boolean }) {
  const st = useAnimatedStyle(() => {
    const local = t.value - shot.start;
    // The first shot holds the frame before playback starts.
    const visible = (local >= 0 && local < shot.dur) || (last && local >= shot.dur) || (shot.start === 0 && t.value <= 0);
    const p = Math.min(1, Math.max(0, local / shot.dur));
    let scale = shot.zoom[0] + (shot.zoom[1] - shot.zoom[0]) * p;
    if (shot.enter === 'punch' && local >= 0 && local < 180) scale *= 1 + 0.1 * (1 - local / 180);
    const tx = (shot.pan[0][0] + (shot.pan[1][0] - shot.pan[0][0]) * p) * w;
    const ty = (shot.pan[0][1] + (shot.pan[1][1] - shot.pan[0][1]) * p) * h;
    return {
      opacity: visible ? 1 : 0,
      transform: [{ translateX: tx }, { translateY: ty }, { scale }],
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, st]}>
      <Photo photo={shot.photo} style={{ width: w, height: h }} priority="high" />
    </Animated.View>
  );
}

function Flash({ at, t }: { at: number[]; t: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    let o = 0;
    for (const start of at) {
      const d = t.value - start;
      if (d >= 0 && d < 220) o = Math.max(o, 1 - d / 220);
    }
    return { opacity: o * 0.9 };
  });
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, st]} />;
}

function Thumbnail() {
  return (
    <View pointerEvents="none" style={styles.thumbArrow}>
      <Ionicons name="arrow-down" size={92} color="#FF1E1E" style={styles.arrowShadow} />
    </View>
  );
}

function Captions({ captions, t, seed, inset }: { captions: ClipCaption[]; t: SharedValue<number>; seed: string; inset: number }) {
  if (captions.length === 0) return null;
  const list = captions[0].style === 'list';
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, list ? styles.listWrap : null, { paddingBottom: inset }]}>
      {captions.map((c, i) => (
        <Caption key={i} caption={c} t={t} boxed={hashOf(`${seed}:cap`) % 2 === 0} index={i} list={list} />
      ))}
    </View>
  );
}

function Caption({ caption, t, boxed, index, list }: { caption: ClipCaption; t: SharedValue<number>; boxed: boolean; index: number; list: boolean }) {
  const st = useAnimatedStyle(() => {
    const on = (t.value >= caption.start && t.value < caption.end) || (caption.start === 0 && t.value <= 0);
    return { opacity: on ? 1 : 0 };
  });
  if (list) {
    return (
      <Animated.View style={[styles.listLine, st]}>
        <T size={19} weight="800" style={styles.stroke}>
          {caption.text}
        </T>
      </Animated.View>
    );
  }
  if (caption.style === 'title') {
    return (
      <Animated.View style={[styles.titleWrap, st]}>
        <T size={26} weight="900" center lh={30} style={[styles.stroke, index > 0 && styles.titleSecond]}>
          {caption.text}
        </T>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[styles.tokWrap, st]}>
      <View style={boxed ? styles.box : null}>
        <T size={17} weight="700" center lh={23} color={boxed ? '#000000' : '#FFFFFF'} style={boxed ? null : styles.stroke}>
          {caption.text}
        </T>
      </View>
    </Animated.View>
  );
}

function Progress({ t, duration, color }: { t: SharedValue<number>; duration: number; color: string }) {
  const st = useAnimatedStyle(() => ({ width: `${Math.min(100, (t.value / duration) * 100)}%` }));
  return (
    <View pointerEvents="none" style={styles.track}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, st]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#000' },
  row: { flex: 1, flexDirection: 'row' },
  half: { flex: 1, overflow: 'hidden' },
  flash: { backgroundColor: '#FFFFFF' },
  thumbArrow: { position: 'absolute', right: '12%', top: '34%', transform: [{ rotate: '-28deg' }] },
  arrowShadow: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 8 },
  stroke: { textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  tokWrap: { position: 'absolute', left: 36, right: 36, top: '40%', alignItems: 'center' },
  box: { backgroundColor: '#FFFFFF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  titleWrap: { position: 'absolute', left: 20, right: 20, top: '16%', alignItems: 'center' },
  titleSecond: { marginTop: 0 },
  listWrap: { justifyContent: 'center', paddingLeft: 28, gap: 10 },
  listLine: {},
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  fill: { height: 2 },
});
