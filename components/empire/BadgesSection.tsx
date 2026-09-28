import { View, StyleSheet } from 'react-native';
import { useProgressionStore } from '../../store/progressionStore';
import { ACHIEVEMENTS } from '../../data/progression/achievements';
import { Text } from '../ui/Typography';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

// Badge tiers → desaturated tokens (was loud bronze/silver/gold/red).
const TIER_COLOR = {
  bronze: COLORS.textMuted,
  silver: COLORS.textSecondary,
  gold: COLORS.gold,
  legendary: COLORS.primary,
} as const;

/** Empire · Overview — achievements earned along the level ladder. */
export function BadgesSection() {
  const unlocked = useProgressionStore((s) => s.unlockedAchievements);
  return (
    <View>
      <Text variant="heading" style={styles.section}>
        Badges · {unlocked.length}/{ACHIEVEMENTS.length}
      </Text>
      <View style={styles.badgeWrap}>
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked.includes(a.id);
          const hidden = a.secret && !got;
          return (
            <View
              key={a.id}
              style={[styles.badge, { borderColor: got ? TIER_COLOR[a.tier] : COLORS.border }]}
            >
              <Text
                variant="caption"
                weight="semibold"
                color={got ? TIER_COLOR[a.tier] : COLORS.textMuted}
              >
                {hidden ? '??? Secret' : a.name}
              </Text>
              <Text variant="label" muted numberOfLines={2}>
                {hidden ? 'Keep playing to reveal.' : a.description}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  badge: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    gap: 2,
  },
});
