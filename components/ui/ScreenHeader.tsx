import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, ifAnimated } from '../../constants/theme';
import { Text } from './Typography';

interface Props {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  accent?: string;
  /** Rendered on the right, e.g. a 3D orb. */
  right?: React.ReactNode;
}

/** The big section title: glowing eyebrow, display title, optional art. */
export function ScreenHeader({ title, eyebrow, subtitle, accent = COLORS.primary, right }: Props) {
  return (
    <Animated.View entering={ifAnimated(FadeInDown.duration(420).springify().damping(16))} style={styles.row}>
      <View style={styles.text}>
        {eyebrow ? (
          <View style={styles.eyebrowRow}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text variant="label" color={accent}>
              {eyebrow}
            </Text>
          </View>
        ) : null}
        <Text variant="title" style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" muted numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  text: { flex: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  title: { fontSize: 25, lineHeight: 32, letterSpacing: -0.8, fontWeight: '800' },
  subtitle: { marginTop: 4 },
  right: { alignItems: 'center', justifyContent: 'center' },
});
