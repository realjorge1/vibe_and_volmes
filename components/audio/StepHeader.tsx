import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '../ui/Typography';
import { PressableScale } from '../ui/PressableScale';
import { COLORS, GRADIENTS, RADIUS, SPACING, ifAnimated } from '../../constants/theme';

const STEPS = ['beat', 'lyrics', 'record', 'mix', 'release', 'finalize'] as const;
const STEP_LABEL = ['Beat', 'Lyrics', 'Record', 'Mix', 'Release', 'Finalize'] as const;

/** Pipeline header: back button, lit step tracker, title. */
export function StepHeader({
  step,
  title,
  subtitle,
  onBack,
}: {
  step: (typeof STEPS)[number];
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  const idx = STEPS.indexOf(step);
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <PressableScale onPress={onBack} hitSlop={10} scaleTo={0.9} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </PressableScale>
        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.dot,
                { width: i === idx ? 26 : 10 },
              ]}
            >
              {i <= idx && (
                <LinearGradient
                  colors={i === idx ? GRADIENTS.brand : GRADIENTS.primary}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[StyleSheet.absoluteFill, styles.dotRound]}
                />
              )}
            </View>
          ))}
        </View>
        <Text variant="label" muted style={styles.count}>
          {`${idx + 1}/${STEPS.length}`}
        </Text>
      </View>
      <Animated.View entering={ifAnimated(FadeInDown.duration(380).springify().damping(16))}>
        <Text variant="label" color={COLORS.secondary} style={styles.eyebrow}>
          {`STEP ${idx + 1} · ${STEP_LABEL[idx]?.toUpperCase() ?? ''}`}
        </Text>
        <Text variant="title" style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" muted style={styles.sub}>
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: SPACING.sm, marginBottom: SPACING.base },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  dotRound: { borderRadius: RADIUS.full },
  count: { width: 38, textAlign: 'right' },
  eyebrow: { marginTop: SPACING.base },
  title: { marginTop: 6, fontSize: 26, lineHeight: 33 },
  sub: { marginTop: SPACING.xs, lineHeight: 18 },
});
