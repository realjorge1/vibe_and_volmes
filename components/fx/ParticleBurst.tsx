import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Path, usePathValue, type SkPath } from '@shopify/react-native-skia';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS } from '../../constants/theme';

interface Props {
  /** Change to fire again. */
  playKey: number | string;
  x: number;
  y: number;
  spread?: number;
  count?: number;
  duration?: number;
  colors?: readonly [string, string, string, string];
}

interface Part {
  a: number;
  v: number;
  s: number;
  g: number;
}

function drawGroup(
  path: SkPath,
  p: number,
  parts: Part[],
  group: number,
  x: number,
  y: number,
  spread: number
) {
  'worklet';
  for (let i = 0; i < parts.length; i++) {
    const q = parts[i];
    if (q.g !== group) continue;
    const d = q.v * spread * p;
    const px = x + Math.cos(q.a) * d;
    const py = y + Math.sin(q.a) * d + p * p * spread * 0.35;
    path.addCircle(px, py, Math.max(0.3, q.s * (1 - p * 0.7)));
  }
}

/** Confetti-spark burst from a point, with a little gravity. */
export function ParticleBurst({
  playKey,
  x,
  y,
  spread = 200,
  count = 44,
  duration = 1100,
  colors = [COLORS.secondary, COLORS.primary, COLORS.accent, COLORS.gold],
}: Props) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [playKey, duration, t]);

  const parts = useMemo<Part[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (k: number) => {
          const v = Math.sin(i * 91.7 + k * 47.3) * 10000;
          return v - Math.floor(v);
        };
        return {
          a: (i / count) * Math.PI * 2 + r(1) * 0.5,
          v: 0.35 + r(2) * 0.65,
          s: 1.6 + r(3) * 3,
          g: i % 4,
        };
      }),
    [count]
  );

  const p0 = usePathValue((path) => {
    'worklet';
    drawGroup(path, t.value, parts, 0, x, y, spread);
  });
  const p1 = usePathValue((path) => {
    'worklet';
    drawGroup(path, t.value, parts, 1, x, y, spread);
  });
  const p2 = usePathValue((path) => {
    'worklet';
    drawGroup(path, t.value, parts, 2, x, y, spread);
  });
  const p3 = usePathValue((path) => {
    'worklet';
    drawGroup(path, t.value, parts, 3, x, y, spread);
  });
  const opacity = useDerivedValue(() => 1 - t.value * t.value);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group opacity={opacity}>
          <Path path={p0} color={colors[0]} />
          <Path path={p1} color={colors[1]} />
          <Path path={p2} color={colors[2]} />
          <Path path={p3} color={colors[3]} />
        </Group>
      </Canvas>
    </View>
  );
}
