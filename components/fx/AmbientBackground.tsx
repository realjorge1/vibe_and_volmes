import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Path,
  RadialGradient,
  Rect,
  useClock,
  usePathValue,
  vec,
} from '@shopify/react-native-skia';
import {
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, ANIMATIONS_ENABLED, withAlpha } from '../../constants/theme';

interface Props {
  /** The color of the main stage light; changes cross-fade. */
  tint?: string;
  /** Fewer motes and dimmer beams, for busy screens. */
  calm?: boolean;
}

const MOTES = 14;
/** How strongly the screen's color lights the stage. Kept low: a hint, not a glow. */
const TINT_ALPHA = 0.22;
const TRANSPARENT = 'rgba(0,0,0,0)';

/** A clock stuck at zero: the stage holds still and nothing redraws per frame. */
function useStillClock() {
  return useSharedValue(0);
}
const useStageClock = ANIMATIONS_ENABLED ? useClock : useStillClock;

/** Deterministic pseudo-random so the motes don't reshuffle on re-render. */
function seeded(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The living stage behind every screen: three slow-orbiting pools of faint
 * colored light, a few drifting dust motes, and a vignette. Everything is
 * drawn in one Skia canvas on the UI thread.
 */
export function AmbientBackground({ tint = COLORS.primary, calm }: Props) {
  const { width: w, height: h } = useWindowDimensions();
  const clock = useStageClock();

  const prevTint = useRef(tint);
  const from = useSharedValue(withAlpha(tint, TINT_ALPHA));
  const to = useSharedValue(withAlpha(tint, TINT_ALPHA));
  const mix = useSharedValue(1);
  useEffect(() => {
    if (prevTint.current === tint) return;
    from.value = withAlpha(prevTint.current, TINT_ALPHA);
    to.value = withAlpha(tint, TINT_ALPHA);
    prevTint.current = tint;
    mix.value = 0;
    mix.value = withTiming(1, { duration: 900 });
  }, [tint, from, to, mix]);

  const tintColors = useDerivedValue(() => [
    interpolateColor(mix.value, [0, 1], [from.value, to.value]),
    TRANSPARENT,
  ]);

  const c1 = useDerivedValue(() => {
    const t = clock.value / 1000;
    return vec(w * (0.18 + Math.sin(t / 7) * 0.22), h * (0.14 + Math.cos(t / 9) * 0.07));
  });
  const c2 = useDerivedValue(() => {
    const t = clock.value / 1000;
    return vec(w * (0.92 + Math.cos(t / 8) * 0.14), h * (0.46 + Math.sin(t / 11) * 0.1));
  });
  const c3 = useDerivedValue(() => {
    const t = clock.value / 1000;
    return vec(w * (0.3 + Math.sin(t / 10) * 0.2), h * (0.98 + Math.cos(t / 7) * 0.05));
  });

  const motes = useMemo(
    () =>
      Array.from({ length: calm ? 8 : MOTES }, (_, i) => ({
        x: seeded(i, 1) * w,
        speed: 8 + seeded(i, 2) * 18,
        r: 0.8 + seeded(i, 3) * 1.8,
        phase: seeded(i, 4),
        sway: 6 + seeded(i, 5) * 14,
      })),
    [w, calm]
  );

  const dust = usePathValue((path) => {
    'worklet';
    const t = clock.value / 1000;
    const span = h + 40;
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      const y = h + 20 - ((t * m.speed + m.phase * span) % span);
      const x = m.x + Math.sin(t / 2 + m.phase * 6.28) * m.sway;
      path.addCircle(x, y, m.r);
    }
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={w} height={h} color={COLORS.bg} />

        <Circle c={c1} r={w * 1.0}>
          <RadialGradient c={c1} r={w * 1.0} colors={tintColors} />
        </Circle>
        <Circle c={c2} r={w * 0.85}>
          <RadialGradient
            c={c2}
            r={w * 0.85}
            colors={[withAlpha(COLORS.secondary, 0.09), TRANSPARENT]}
          />
        </Circle>
        <Circle c={c3} r={w * 0.95}>
          <RadialGradient
            c={c3}
            r={w * 0.95}
            colors={[withAlpha(COLORS.accent, 0.07), TRANSPARENT]}
          />
        </Circle>

        <Path path={dust} color="rgba(255,255,255,0.16)">
          <BlurMask blur={1.2} style="normal" />
        </Path>

        {/* Vignette pulls the edges down so content stays the brightest thing. */}
        <Rect x={0} y={0} width={w} height={h}>
          <RadialGradient
            c={vec(w / 2, h * 0.45)}
            r={Math.max(w, h) * 0.78}
            colors={[TRANSPARENT, 'rgba(3,2,8,0.72)']}
          />
        </Rect>
      </Canvas>
    </View>
  );
}
