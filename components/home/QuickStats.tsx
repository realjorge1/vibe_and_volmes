import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { PlayerStats } from '../../types/player';
import { COLORS, SPACING } from '../../constants/theme';
import { formatMoney } from '../../utils/statHelpers';
import { Card } from '../ui/Card';
import { StatBar } from '../ui/StatBar';
import { Text } from '../ui/Typography';

interface Props {
  stats: PlayerStats;
  money: number;
}

export function QuickStats({ stats, money }: Props) {
  return (
    <Card>
      <View style={styles.moneyRow}>
        <Text variant="label" muted>
          BALANCE
        </Text>
        <Text variant="heading" color={COLORS.accent}>
          {formatMoney(money)}
        </Text>
      </View>
      <View style={styles.divider} />
      <StatBar label="Energy" value={stats.energy} />
      <StatBar label="Mental Health" value={stats.mentalHealth} />
      <StatBar label="Reputation" value={stats.reputation} />
      <StatBar label="Fan Loyalty" value={stats.fanLoyalty} />
    </Card>
  );
}

const styles = StyleSheet.create({
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.base,
  },
});
