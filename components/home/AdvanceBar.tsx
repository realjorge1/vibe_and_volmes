import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
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
 * The one primary action in the game, pinned above the tab bar so it never
 * moves. While decisions are pending it can't advance time — it scrolls the
 * player to what's blocking instead, which teaches the loop without a modal.
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
      <Button
        label={
          blocked
            ? `${pendingCount} decision${pendingCount > 1 ? 's' : ''} to handle`
            : `Advance to ${formatWeek(nextWeek)}`
        }
        variant={blocked ? 'secondary' : 'primary'}
        onPress={blocked ? onJumpToDecision : onAdvance}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
