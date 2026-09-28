import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui/Typography';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

const STEPS = ['beat', 'lyrics', 'record', 'mix', 'release', 'finalize'] as const;

/** Compact pipeline header: progress dots + title + a cancel/back affordance. */
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
        <Pressable onPress={onBack} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textSecondary} />
        </Pressable>
        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < idx
                      ? COLORS.primary
                      : i === idx
                        ? COLORS.text
                        : COLORS.surface3,
                  width: i === idx ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.back} />
      </View>
      <Text variant="title" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" muted style={styles.sub}>
          {subtitle}
        </Text>
      ) : null}
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
  back: { width: 32, height: 32, justifyContent: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: RADIUS.full },
  title: { marginTop: SPACING.base },
  sub: { marginTop: SPACING.xs, lineHeight: 18 },
});
