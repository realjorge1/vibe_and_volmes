import React, { useRef, useState } from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import type { MixSettings } from '../../types/audio';
import { Text } from '../ui/Typography';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { FX_KNOBS, withMixDefaults } from '../../constants/audioConfig';
import { fxEngineActive } from '../../audio/playback/fxEngine';

/**
 * The live mixing surface: two volume sliders + a real DJ-FX rig (filter
 * sweep, space, echo, drive). When the native FX engine is active the knobs
 * sweep the sound in real time; otherwise they still shape how the song
 * scores and take effect once the app is built with the audio engine.
 * Sliders are built on the RN PanResponder so the controls add zero native UI.
 */

interface SliderProps {
  label: string;
  value: number; // 0..1
  onChange: (v: number) => void;
  accent?: string;
  hint?: string;
  /** Centered detent at 0.5 (used by the filter knob: LP ◄ ─ ► HP). */
  bipolar?: boolean;
}

function Slider({
  label,
  value,
  onChange,
  accent = COLORS.primary,
  hint,
  bipolar,
}: SliderProps) {
  const widthRef = useRef(1);
  const [w, setW] = useState(1);

  const set = (x: number) => {
    const v = Math.max(0, Math.min(1, x / widthRef.current));
    onChange(Math.round(v * 100) / 100);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => set(e.nativeEvent.locationX),
      onPanResponderMove: (e) => set(e.nativeEvent.locationX),
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setW(e.nativeEvent.layout.width);
  };

  // Bipolar fill runs from the centre to the knob; unipolar from the left.
  const fill = bipolar
    ? {
        left: value < 0.5 ? w * value : w * 0.5,
        width: Math.abs(value - 0.5) * w,
      }
    : { left: 0, width: w * value };

  const readout = bipolar
    ? Math.abs(value - 0.5) < 0.04
      ? 'neutral'
      : value < 0.5
        ? `LP ${Math.round((1 - value / 0.5) * 100)}%`
        : `HP ${Math.round(((value - 0.5) / 0.5) * 100)}%`
    : `${Math.round(value * 100)}%`;

  return (
    <View style={styles.sliderWrap}>
      <View style={styles.sliderHead}>
        <Text variant="caption" muted>
          {label}
          {hint ? `  ·  ${hint}` : ''}
        </Text>
        <Text variant="caption">{readout}</Text>
      </View>
      <View style={styles.track} onLayout={onLayout} {...pan.panHandlers} hitSlop={12}>
        {bipolar && <View style={[styles.centerTick, { left: w * 0.5 - 1 }]} />}
        <View style={[styles.fill, { left: fill.left, width: fill.width, backgroundColor: accent }]} />
        <View
          style={[styles.knob, { left: Math.max(0, w * value - 11), borderColor: accent }]}
        />
      </View>
    </View>
  );
}

const FX_ACCENTS: Record<string, string> = {
  filter: COLORS.primary,
  space: COLORS.secondary,
  echo: COLORS.accent,
  drive: COLORS.secondary,
};

export function MixControls({
  mix,
  onChange,
}: {
  mix: MixSettings;
  onChange: (m: MixSettings) => void;
}) {
  const m = withMixDefaults(mix);
  const live = fxEngineActive();

  return (
    <View>
      <Slider
        label="Vocal volume"
        value={m.vocalVolume}
        onChange={(v) => onChange({ ...m, vocalVolume: v })}
      />
      <Slider
        label="Beat volume"
        value={m.beatVolume}
        accent={COLORS.secondary}
        onChange={(v) => onChange({ ...m, beatVolume: v })}
      />

      <View style={styles.fxHead}>
        <Text variant="caption" weight="bold">
          DJ FX
        </Text>
        <Text variant="caption" muted>
          {live ? 'tweak live while it plays' : 'shapes your sound + score'}
        </Text>
      </View>

      {FX_KNOBS.map((knob) => (
        <Slider
          key={knob.key}
          label={knob.label}
          hint={knob.hint}
          bipolar={knob.bipolar}
          accent={FX_ACCENTS[knob.key] ?? COLORS.primary}
          value={m[knob.key]}
          onChange={(v) => onChange({ ...m, [knob.key]: v } as MixSettings)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sliderWrap: { marginBottom: SPACING.lg },
  sliderHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  track: {
    height: 22,
    justifyContent: 'center',
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.full,
  },
  fill: {
    position: 'absolute',
    height: 22,
    borderRadius: RADIUS.full,
  },
  centerTick: {
    position: 'absolute',
    width: 2,
    height: 22,
    backgroundColor: COLORS.border,
  },
  knob: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.text,
    borderWidth: 3,
  },
  fxHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.base,
  },
});
