import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { TrendingTopic } from '../../types/social';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { shortNumber } from '../../utils/formatters';
import { Text } from '../ui/Typography';

export function TrendingBar({ topics }: { topics: TrendingTopic[] }) {
  if (topics.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text variant="label" muted style={styles.title}>
        TRENDING NOW
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {topics.map((t) => (
          <View key={t.hashtag} style={styles.chip}>
            <Text variant="caption" weight="semibold" color={COLORS.secondary}>
              {t.hashtag}
            </Text>
            <Text variant="label" muted>
              {shortNumber(t.volume)} posts
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.base },
  title: { marginBottom: SPACING.sm },
  row: { gap: SPACING.sm, paddingRight: SPACING.base },
  chip: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
