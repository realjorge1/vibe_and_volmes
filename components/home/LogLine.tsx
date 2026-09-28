import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { EventHistoryEntry } from '../../types/events';
import { categoryColor } from '../../utils/eventCategory';
import { SPACING } from '../../constants/theme';
import { Text } from '../ui/Typography';

/**
 * One line of career history — a category dot and the beat that happened.
 * Deliberately light: past weeks should read as a log you scroll past, not
 * compete with the decision at the bottom of the column.
 */
export function LogLine({ entry }: { entry: EventHistoryEntry }) {
  return (
    <View style={styles.row}>
      <View
        style={[styles.dot, { backgroundColor: categoryColor(entry.category) }]}
      />
      <Text variant="caption" muted style={styles.text}>
        {entry.flavorText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  // Nudged down to sit on the first line's optical center.
  dot: { width: 5, height: 5, borderRadius: 999, marginTop: 7 },
  text: { flex: 1 },
});
