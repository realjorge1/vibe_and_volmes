import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { GameEvent } from '../../types/events';
import { categoryColor } from '../../utils/eventCategory';
import { COLORS, SPACING } from '../../constants/theme';
import { Text } from '../ui/Typography';

interface Props {
  event: GameEvent;
  /** The option the player took, if it could still be resolved. */
  choiceText: string;
  /** The outcome — the payoff line, and the loudest text in the block. */
  flavorText: string;
}

/**
 * A decision the player already made this week, kept in the column right
 * where they made it: what happened, what they chose, what it did. Rendered
 * as an indented log entry rather than a full card so the live decision
 * stays the only real card on screen.
 */
export function ResolvedEventCard({ event, choiceText, flavorText }: Props) {
  const color = categoryColor(event.category);
  return (
    <View style={[styles.wrap, { borderLeftColor: color }]}>
      <Text variant="label" color={COLORS.textMuted} numberOfLines={1}>
        {event.title.toUpperCase()}
      </Text>

      {choiceText ? (
        <Text
          variant="caption"
          color={COLORS.textSecondary}
          style={styles.choice}
        >
          {`↳ ${choiceText}`}
        </Text>
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
    borderLeftWidth: 2,
    paddingLeft: SPACING.base,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.base,
  },
  choice: { marginTop: SPACING.xs },
  flavor: { marginTop: SPACING.sm },
});
