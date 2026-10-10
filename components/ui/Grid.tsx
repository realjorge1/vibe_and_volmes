import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { SPACING } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  columns: number;
  gap?: number;
  style?: ViewStyle;
}

/**
 * Even columns across the full width. Children are chunked into rows and a
 * short last row is padded with empty cells, so every cell keeps the same
 * width and nothing drifts to one side.
 */
export function Grid({ children, columns, gap = SPACING.sm, style }: Props) {
  const cells = React.Children.toArray(children);
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns));

  return (
    <View style={[{ gap }, style]}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, { gap }]}>
          {Array.from({ length: columns }, (_, c) => (
            <View key={c} style={styles.cell}>
              {row[c] ?? null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1 },
});
