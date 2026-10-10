import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS } from '../../constants/theme';
import { Text } from '../ui/Typography';
import { PressableScale } from '../ui/PressableScale';

type Mode = 'idle' | 'recording' | 'paused' | 'processing';

interface Props {
  mode: Mode;
  onPress: () => void;
  disabled?: boolean;
}

const ICON: Record<Mode, keyof typeof Ionicons.glyphMap> = {
  idle: 'mic',
  recording: 'stop',
  paused: 'mic',
  processing: 'hourglass',
};

const LABEL: Record<Mode, string> = {
  idle: 'Tap to record',
  recording: 'Tap to stop',
  paused: 'Paused',
  processing: 'Saving…',
};

const SIZE = 132;

function Ring({ delay, live, color }: { delay: number; live: boolean; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!live) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false)
    );
  }, [live, delay, t]);
  const st = useAnimatedStyle(() => ({
    opacity: live ? (1 - t.value) * 0.7 : 0,
    transform: [{ scale: 1 + t.value * 0.55 }],
  }));
  return <Animated.View style={[styles.ring, { borderColor: color }, st]} />;
}

/** One big, obvious target — a mic orb that pulses while you're live. */
export function RecordButton({ mode, onPress, disabled }: Props) {
  const live = mode === 'recording';
  const color = live ? COLORS.negative : COLORS.primary;
  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Ring delay={0} live={live} color={color} />
        <Ring delay={530} live={live} color={color} />
        <Ring delay={1060} live={live} color={color} />
        <PressableScale
          onPress={onPress}
          disabled={disabled || mode === 'processing'}
          scaleTo={0.92}
          style={[
            styles.btn,
            styles.btnShadow,
            disabled && styles.disabled,
          ]}
        >
          <LinearGradient
            colors={live ? GRADIENTS.danger : GRADIENTS.primary}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.round]}
          />
          <LinearGradient
            colors={GRADIENTS.sheen}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.sheen}
          />
          <Ionicons name={ICON[mode]} size={48} color="#FFFFFF" style={styles.icon} />
        </PressableScale>
      </View>
      <View style={styles.labelRow}>
        {live && <View style={styles.liveDot} />}
        <Text variant="label" color={live ? COLORS.negative : COLORS.textSecondary} center>
          {live ? 'LIVE · ' : ''}
          {LABEL[mode].toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  stage: { width: SIZE * 1.6, height: SIZE * 1.6, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
  },
  btn: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  round: { borderRadius: SIZE / 2 },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  icon: {
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  btnShadow: { boxShadow: "0px 10px 24px rgba(0,0,0,0.5)" },
  disabled: { opacity: 0.4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.negative,
  },
});
