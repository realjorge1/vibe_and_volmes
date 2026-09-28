import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { Text } from './Typography';

export interface Segment<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (key: T) => void;
  style?: ViewStyle;
}

/**
 * Flat segmented control: a row of labels over a hairline track, the active one
 * marked by blue text + a 2px blue underline. No pills, no fills — calm and
 * precise. Used to fold dense screens (e.g. Empire) into focused sub-views.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  style,
}: Props<T>) {
  return (
    <View style={[styles.row, style]}>
      {segments.map((s) => {
        const active = s.key === value;
        return (
          <Pressable
            key={s.key}
            onPress={() => onChange(s.key)}
            style={styles.item}
          >
            <Text
              variant="subheading"
              weight={active ? 'semibold' : 'regular'}
              color={active ? COLORS.text : COLORS.textMuted}
            >
              {s.label}
            </Text>
            <View
              style={[
                styles.underline,
                { backgroundColor: active ? COLORS.primary : 'transparent' },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  underline: {
    height: 2,
    alignSelf: 'stretch',
    marginHorizontal: SPACING.lg,
    marginBottom: -1,
  },
});
