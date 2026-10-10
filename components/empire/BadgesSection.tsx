import { View, StyleSheet } from 'react-native';
import { useProgressionStore } from '../../store/progressionStore';
import { ACHIEVEMENTS } from '../../data/progression/achievements';
import { Text } from '../ui/Typography';
import { SectionTitle } from '../ui/SectionTitle';
import { Grid } from '../ui/Grid';
import { Tile3D } from '../fx/Tile3D';
import { COLORS, SPACING } from '../../constants/theme';

const TIER_COLOR = {
  bronze: '#E0915A',
  silver: '#C9D3E6',
  gold: COLORS.gold,
  legendary: COLORS.secondary,
} as const;

const TIER_ICON = {
  bronze: 'medal',
  silver: 'medal',
  gold: 'trophy',
  legendary: 'diamond',
} as const;

/** Empire · Overview — achievements earned along the level ladder, as a shelf of 3D medals. */
export function BadgesSection() {
  const unlocked = useProgressionStore((s) => s.unlockedAchievements);
  return (
    <View>
      <SectionTitle accent={COLORS.gold} meta={`${unlocked.length}/${ACHIEVEMENTS.length}`}>
        Badges
      </SectionTitle>
      <Grid columns={3} gap={SPACING.md}>
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked.includes(a.id);
          const hidden = a.secret && !got;
          const color = TIER_COLOR[a.tier];
          return (
            <View key={a.id} style={[styles.badge, !got && styles.locked]}>
              <Tile3D
                icon={hidden ? 'help' : got ? TIER_ICON[a.tier] : 'lock-closed'}
                color={color}
                size={46}
                dim={!got}
              />
              <Text
                variant="caption"
                weight="bold"
                center
                color={got ? color : COLORS.textMuted}
                numberOfLines={1}
                style={styles.name}
              >
                {hidden ? '??? Secret' : a.name}
              </Text>
              <Text variant="caption" muted center numberOfLines={2} style={styles.desc}>
                {hidden ? 'Keep playing to reveal.' : a.description}
              </Text>
            </View>
          );
        })}
      </Grid>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', gap: 3, paddingVertical: SPACING.xs },
  locked: { opacity: 0.7 },
  name: { marginTop: SPACING.sm, fontSize: 12 },
  desc: { fontSize: 10.5, lineHeight: 13 },
});
