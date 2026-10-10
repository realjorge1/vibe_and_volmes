import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { GameEvent } from '../../types/events';
import { categoryColor, categoryIcon } from '../../utils/eventCategory';
import { COLORS, RADIUS, SPACING, withAlpha } from '../../constants/theme';
import { Text } from '../ui/Typography';

type Glyph = keyof typeof Ionicons.glyphMap;

interface Props {
  event: GameEvent;
  /** The option the player took, if it could still be resolved. */
  choiceText: string;
  /** The outcome — the payoff line, and the loudest text in the block. */
  flavorText: string;
}

/**
 * A decision the player already made this week, kept in the column right
 * where they made it: what happened, what they chose, what it did. A slim
 * tinted panel, so the live decision stays the only hero card on screen.
 */
export function ResolvedEventCard({ event, choiceText, flavorText }: Props) {
  const color = categoryColor(event.category);
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[withAlpha(color, 0.1), 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: withAlpha(color, 0.22) }]}>
          <Ionicons name={categoryIcon(event.category) as Glyph} size={11} color={color} />
        </View>
        <Text variant="label" color={COLORS.textSecondary} numberOfLines={1} style={styles.title}>
          {event.title.toUpperCase()}
        </Text>
        <Ionicons name="checkmark-circle" size={14} color={COLORS.positive} />
      </View>

      {event.callback ? (
        <Text variant="caption" color={COLORS.gold} style={styles.callback}>
          {`From week ${event.callback.week}: ${event.callback.note}`}
        </Text>
      ) : null}

      {choiceText ? (
        <View style={styles.choice}>
          <Ionicons name="return-down-forward" size={13} color={COLORS.textMuted} />
          <Text variant="caption" color={COLORS.textSecondary} style={styles.flex}>
            {choiceText}
          </Text>
        </View>
      ) : null}

      {flavorText ? (
        <Text variant="body" style={styles.flavor}>
          {flavorText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.md + 2,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md + 2,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
  choice: { flexDirection: 'row', gap: 6, marginTop: SPACING.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  flavor: { marginTop: SPACING.sm },
  callback: { marginTop: SPACING.xs },
});
