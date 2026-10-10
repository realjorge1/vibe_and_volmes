import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * One glass container holding a run of rows split by hairlines — a grouped
 * list, instead of a stack of separate cards. Rows bring their own padding.
 */
export function ListGroup({ children, style }: Props) {
  const rows = React.Children.toArray(children);
  if (rows.length === 0) return null;
  return (
    <View style={[styles.group, style]}>
      {rows.map((row, i) => (
        <React.Fragment key={React.isValidElement(row) && row.key != null ? row.key : i}>
          {i > 0 && <View style={styles.hairline} />}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: RADIUS.lg - 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: 'rgba(255,255,255,0.13)',
    marginBottom: SPACING.sm + 2,
    overflow: 'hidden',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
