import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { EventHistoryEntry } from '../../types/events';
import { categoryColor } from '../../utils/eventCategory';
import { SPACING } from '../../constants/theme';
import { Text } from '../ui/Typography';

/**
 * One line of career history on the timeline rail — a glowing category node
 * and the beat that happened. Light on purpose: past weeks read as a log you
 * scroll past, not competition for the live decision.
 */
export function LogLine({ entry }: { entry: EventHistoryEntry }) {
  const color = categoryColor(entry.category);
  return (
    <View style={styles.row}>
      <View style={styles.rail} />
      <View style={[styles.node, { backgroundColor: color }]} />
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
    paddingVertical: SPACING.xs + 3,
    paddingLeft: 2,
  },
  rail: {
    position: 'absolute',
    left: 5,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  // Nudged down to sit on the first line's optical center.
  node: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  text: { flex: 1 },
});
