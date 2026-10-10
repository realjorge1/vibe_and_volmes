import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { getFameLevel, getReputationTier } from '../../utils/statHelpers';
import { Text } from '../ui/Typography';
import { Tile3D } from '../fx/Tile3D';

interface Props {
  fans: number;
  reputation: number;
}

function Tier({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.tier}>
      <Tile3D icon={icon} color={color} size={38} />
      <View style={styles.tierText}>
        <Text variant="label" muted style={styles.label}>
          {label}
        </Text>
        <Text variant="subheading" color={color} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

/** Where the fame and the reputation stand, side by side. Bare — no card. */
export function FameDisplay({ fans, reputation }: Props) {
  const fame = getFameLevel(fans);
  const rep = getReputationTier(reputation);

  return (
    <View style={styles.row}>
      <Tier icon="star" label="FAME" value={fame.label} color={fame.color} />
      <View style={styles.divider} />
      <Tier icon="shield-checkmark" label="REPUTATION" value={rep.label} color={rep.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  tier: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm + 2,
  },
  tierText: { flexShrink: 1 },
  label: { fontSize: 9 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: COLORS.border },
});
