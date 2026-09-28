import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

interface Props {
  peaks: number[];
  /** 0..1 playback progress; bars before it render in the active color. */
  progress?: number;
  height?: number;
  color?: string;
  activeColor?: string;
  /** Cap bars so a long live stream stays cheap to render. */
  maxBars?: number;
}

/**
 * Dependency-free waveform: a row of rounded bars driven by the stored peak
 * array. No PCM decode, no SVG, no canvas — just Views, so it's cheap enough
 * to animate live on low-end Android.
 */
export function WaveformView({
  peaks,
  progress,
  height = 56,
  color = COLORS.surface3,
  activeColor = COLORS.primary,
  maxBars = 64,
}: Props) {
  const bars = useMemo(() => {
    if (peaks.length === 0) return [];
    if (peaks.length <= maxBars) return peaks;
    // Downsample by max-pooling so transients stay visible.
    const out: number[] = [];
    const span = peaks.length / maxBars;
    for (let i = 0; i < maxBars; i++) {
      let m = 0;
      for (let j = Math.floor(i * span); j < Math.floor((i + 1) * span); j++) {
        m = Math.max(m, peaks[j]);
      }
      out.push(m);
    }
    return out;
  }, [peaks, maxBars]);

  const activeIdx = progress != null ? Math.floor(progress * bars.length) : -1;

  return (
    <View style={[styles.row, { height }]}>
      {bars.length === 0 ? (
        <View style={[styles.idle, { backgroundColor: color }]} />
      ) : (
        bars.map((p, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              marginHorizontal: 1,
              height: Math.max(2, p * height),
              borderRadius: RADIUS.sm,
              backgroundColor: i <= activeIdx ? activeColor : color,
            }}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  idle: { flex: 1, height: 3, borderRadius: 2, opacity: 0.5 },
});
