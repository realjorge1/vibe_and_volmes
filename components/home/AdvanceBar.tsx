import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING } from '../../constants/theme';
import { Button } from '../ui/Button';
import { formatWeek } from '../../utils/formatters';

interface Props {
  pendingCount: number;
  /** The week advancing would move into. */
  nextWeek: number;
  onAdvance: () => void;
  /** Pull the column back to the decision that is blocking the week. */
  onJumpToDecision: () => void;
}

/**
 * The one primary action in the game, pinned above the dock so it never
 * moves. While decisions are pending it can't advance time — it scrolls the
 * player to what's blocking instead.
 */
export function AdvanceBar({
  pendingCount,
  nextWeek,
  onAdvance,
  onJumpToDecision,
}: Props) {
  const blocked = pendingCount > 0;

  return (
    <View style={styles.bar}>
      <LinearGradient
        colors={['rgba(7,6,14,0)', 'rgba(7,6,14,0.75)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Button
        label={
          blocked
            ? `${pendingCount} decision${pendingCount > 1 ? 's' : ''} to handle`
            : `Advance to ${formatWeek(nextWeek)}`
        }
        icon={blocked ? 'alert-circle' : 'play-forward'}
        variant={blocked ? 'secondary' : 'brand'}
        size="lg"
        onPress={blocked ? onJumpToDecision : onAdvance}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: SPACING.base + 4,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
});
