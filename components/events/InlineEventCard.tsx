import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { EventChoice, GameEvent } from '../../types/events';
import { COLORS, SPACING, ifAnimated } from '../../constants/theme';
import { Text } from '../ui/Typography';
import { EventCard } from './EventCard';
import { ChoiceButton } from './ChoiceButton';
import { getTrait } from '../../data/identity/traits';

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
    <Animated.View entering={ifAnimated(FadeInDown.duration(450).springify().damping(15))}>
      <View style={styles.counterRow}>
        <Text variant="label" color={COLORS.primary}>
          {`DECISION ${index} OF ${total}`}
        </Text>
        <View style={styles.steps}>
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[
                styles.step,
                i < index - 1 && styles.stepDone,
                i === index - 1 && styles.stepNow,
              ]}
            />
          ))}
        </View>
      </View>

      <EventCard event={event} />

      <Text variant="label" color={COLORS.textSecondary} style={styles.prompt}>
        WHAT DO YOU DO?
      </Text>

      {availableChoices.map((c, i) => {
        const trait = c.requiresTrait ? getTrait(c.requiresTrait) : undefined;
        return (
          <Animated.View key={c.id} entering={ifAnimated(FadeInDown.delay(120 + i * 70).duration(380))}>
            <ChoiceButton
              text={c.text}
              index={i}
              onPress={() => onChoose(c.id)}
              trait={trait ? { label: trait.label, color: trait.color } : undefined}
            />
          </Animated.View>
        );
      })}

      {lockedChoices.map((c) => (
        <ChoiceButton key={c.id} text={c.text} onPress={() => {}} locked />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  steps: { flexDirection: 'row', gap: 4 },
  step: { width: 16, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  stepDone: { backgroundColor: COLORS.positive },
  stepNow: {
    width: 26,
    backgroundColor: COLORS.primary,
  },
  prompt: { marginBottom: SPACING.md, marginLeft: 2 },
});
