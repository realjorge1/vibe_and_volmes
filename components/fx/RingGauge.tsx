import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import {
  Canvas,
  Circle,
  Path,
  Skia,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { COLORS, ANIMATIONS_ENABLED, shade } from '../../constants/theme';

interface Props {
  /** 0..1 */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  /** Second gradient stop; defaults to a lighter take on `color`. */
  colorEnd?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * A progress ring: a faint track, a gradient arc that sweeps to its value,
 * and whatever `children` sit in the middle.
 */
export function RingGauge({
  progress,
  size = 64,
  stroke = 6,
  color = COLORS.primary,
  colorEnd,
  children,
  style,
}: Props) {
  const p = Math.max(0, Math.min(1, progress));
  const end = useSharedValue(ANIMATIONS_ENABLED ? 0 : p);
  useEffect(() => {
    end.value = ANIMATIONS_ENABLED ? withTiming(p, { duration: 900, easing: Easing.out(Easing.cubic) }) : p;
  }, [p, end]);

  const pad = stroke * 2;
  const W = size + pad * 2;
  const r = size / 2 - stroke / 2;
  const c = W / 2;

  // A full circle starting at 12 o'clock; `end` trims it to the value.
  const arc = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc({ x: c - r, y: c - r, width: r * 2, height: r * 2 }, -90, 359.9);
    return path;
  }, [c, r]);

  const hi = colorEnd ?? shade(color, 0.45);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Canvas style={{ position: 'absolute', left: -pad, top: -pad, width: W, height: W }}>
        <Circle cx={c} cy={c} r={r} style="stroke" strokeWidth={stroke} color="rgba(255,255,255,0.08)" />
        <Path path={arc} style="stroke" strokeWidth={stroke} strokeCap="round" start={0} end={end}>
          <SweepGradient
            c={vec(c, c)}
            colors={[shade(color, -0.15), color, hi, hi]}
            positions={[0, 0.45, 0.9, 1]}
            transform={[{ rotate: -Math.PI / 2 }]}
            origin={vec(c, c)}
          />
        </Path>
      </Canvas>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
