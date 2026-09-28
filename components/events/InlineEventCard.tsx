import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { EventChoice, GameEvent } from '../../types/events';
import { COLORS, SPACING } from '../../constants/theme';
import { Text } from '../ui/Typography';
import { EventCard } from './EventCard';
import { ChoiceButton } from './ChoiceButton';

interface Props {
  event: GameEvent;
  availableChoices: EventChoice[];
  lockedChoices: EventChoice[];
  onChoose: (choiceId: string) => void;
  /** 1-based position in this week's slate. */
  index: number;
  total: number;
}

/**
 * The live decision, rendered inline at the foot of the career column. This
 * is the whole loop: the player never leaves the Deck to answer it, and the
 * outcome appears directly above the next one.
 */
export function InlineEventCard({
  event,
  availableChoices,
  lockedChoices,
  onChoose,
  index,
  total,
}: Props) {
  return (
    <View>
      <Text variant="label" color={COLORS.primary} style={styles.counter}>
        {`DECISION ${index} OF ${total}`}
      </Text>

      <EventCard event={event} />

      <Text variant="subheading" style={styles.prompt}>
        What do you do?
      </Text>

      {availableChoices.map((c) => (
        <ChoiceButton key={c.id} text={c.text} onPress={() => onChoose(c.id)} />
      ))}

      {lockedChoices.map((c) => (
        <ChoiceButton key={c.id} text={c.text} onPress={() => {}} locked />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  counter: { marginBottom: SPACING.md },
  prompt: { marginBottom: SPACING.base },
});
