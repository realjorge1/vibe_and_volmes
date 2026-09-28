import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { usePlayerStore } from '../../store/playerStore';
import { useStatusStore } from '../../store/statusStore';
import { useCareerStore } from '../../store/careerStore';
import { useGameStore } from '../../store/gameStore';
import { HOMES, getHome } from '../../data/life/homes';
import {
  homeAvailability,
  homeEffectLabel,
  ownedItems,
  weeklyUpkeep,
} from '../../systems/life/assetEngine';
import { BEHIND_TAG } from '../../systems/life/assetTick';
import { lifestyleBurn } from '../../systems/simulation/lifestyle';
import { playerMoveHome } from '../../systems/simulation/playerActions';
import { formatMoney } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Metric } from '../ui/Metric';
import { Text } from '../ui/Typography';
import { LifestyleSection } from './LifestyleSection';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

/**
 * Life · Assets — "My Place": where the artist lives, what it all costs each
 * week, and what they own; then the home ladder and the luxury catalog.
 */
export function AssetsSection() {
  const player = usePlayerStore((s) => s.player);
  const owned = useStatusStore((s) => s.owned);
  const homeId = useStatusStore((s) => s.homeId) ?? 'shared-apartment';
  const economy = useCareerStore((s) => s.economy);
  const behind = useGameStore((s) => s.playerTags.includes(BEHIND_TAG));
  const [error, setError] = useState<string | null>(null);

  if (!player) return null;
  const home = getHome(homeId);
  const burn = lifestyleBurn(economy.weeklyBurn, home.lifestyleTier);
  const upkeep = weeklyUpkeep(owned);
  const items = ownedItems(owned);
  const ownedIds = new Set(owned.map((o) => o.itemId));

  const move = (id: typeof homeId) => {
    const res = playerMoveHome(id);
    setError(res.ok ? null : res.reason);
  };

  return (
    <View>
      <Card accent={behind ? COLORS.negative : COLORS.primary}>
        <Text variant="label" muted>
          MY PLACE
        </Text>
        <Text variant="heading" style={styles.homeName}>
          {home.label}
        </Text>
        <Text variant="caption" muted>
          {home.blurb} {homeEffectLabel(home)}.
        </Text>
        <View style={styles.metrics}>
          <Metric label="Living" value={`${formatMoney(burn)}/wk`} />
          <Metric label="Upkeep" value={`${formatMoney(upkeep)}/wk`} align="center" />
          <Metric
            label="Total"
            value={`${formatMoney(burn + upkeep)}/wk`}
            align="right"
            color={COLORS.primary}
          />
        </View>
        {behind && (
          <Text variant="caption" color={COLORS.negative} style={styles.warning}>
            You are behind on upkeep. The repo man knows where you live.
          </Text>
        )}
        <Text variant="label" muted style={styles.ownedLabel}>
          WHAT YOU OWN
        </Text>
        {items.length === 0 ? (
          <Text variant="caption" muted>
            Nothing yet. Everything you buy shows up here.
          </Text>
        ) : (
          <View style={styles.chips}>
            {items.map((i) => (
              <View key={i.id} style={styles.chip}>
                <Text variant="caption" color={COLORS.textSecondary}>
                  {i.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Text variant="heading" style={styles.section}>
        Where you live
      </Text>
      {error && (
        <Text variant="caption" color={COLORS.warning} style={styles.error}>
          {error}
        </Text>
      )}
      {HOMES.map((h) => {
        const av = homeAvailability(h, homeId, ownedIds, player.money, economy.weeklyBurn);
        const here = h.id === homeId;
        return (
          <Pressable
            key={h.id}
            onPress={() => (av.ok ? move(h.id) : setError(here ? null : av.reason))}
            style={({ pressed }) => [styles.home, pressed && av.ok && styles.pressed]}
          >
            <View style={styles.flex}>
              <Text variant="subheading" color={here ? COLORS.primary : COLORS.text}>
                {h.label}
              </Text>
              <Text variant="caption" muted>
                {formatMoney(lifestyleBurn(economy.weeklyBurn, h.lifestyleTier))}/wk ·{' '}
                {homeEffectLabel(h)}
              </Text>
            </View>
            <Text
              variant="caption"
              color={av.ok ? COLORS.primary : COLORS.textMuted}
              style={styles.homeAction}
            >
              {here ? 'Home' : av.ok ? (av.cost > 0 ? `Move · ${formatMoney(av.cost)}` : 'Move') : av.reason}
            </Text>
          </Pressable>
        );
      })}

      <Text variant="heading" style={styles.section}>
        Lifestyle
      </Text>
      <LifestyleSection />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  homeName: { marginTop: SPACING.xs, marginBottom: SPACING.xs },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.base },
  warning: { marginTop: SPACING.md },
  ownedLabel: { marginTop: SPACING.base, marginBottom: SPACING.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  section: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  error: { marginBottom: SPACING.sm },
  home: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pressed: { opacity: 0.6 },
  homeAction: { maxWidth: 140, textAlign: 'right' },
});
