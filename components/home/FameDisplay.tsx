import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../constants/theme';
import { getFameLevel, getReputationTier, formatFanCount } from '../../utils/statHelpers';
import { Text } from '../ui/Typography';

interface Props {
  fans: number;
  reputation: number;
}

export function FameDisplay({ fans, reputation }: Props) {
  const fame = getFameLevel(fans);
  const rep = getReputationTier(reputation);

  return (
    <View style={styles.wrap}>
      <Text variant="label" muted>
        FAME LEVEL
      </Text>
      <Text variant="display" color={fame.color} style={styles.fans}>
        {formatFanCount(fans)}
      </Text>
      <View style={styles.tags}>
        <Text variant="subheading" color={fame.color}>
          {fame.label}
        </Text>
        <Text variant="subheading" muted>
          ·
        </Text>
        <Text variant="subheading" color={rep.color}>
          {rep.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: SPACING.lg },
  fans: { marginTop: SPACING.xs },
  tags: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    alignItems: 'center',
  },
});
