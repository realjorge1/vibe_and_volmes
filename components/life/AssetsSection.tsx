import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { Badge } from '../ui/Badge';
import { SectionTitle } from '../ui/SectionTitle';
import { PressableScale } from '../ui/PressableScale';
import { ListGroup } from '../ui/ListGroup';
import { Orb3D } from '../fx/Orb3D';
import { Tile3D } from '../fx/Tile3D';
import { LifestyleSection } from './LifestyleSection';
import { COLORS, RADIUS, SPACING, withAlpha } from '../../constants/theme';

const HOME_LADDER_COLORS = [COLORS.neutral, COLORS.accent, COLORS.primary, '#FF7EBD', COLORS.gold];

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
  const accent = behind ? COLORS.negative : COLORS.accent;

  const move = (id: typeof homeId) => {
    const res = playerMoveHome(id);
    setError(res.ok ? null : res.reason);
  };

  return (
    <View>
      <Card accent={accent}>
        <View style={styles.placeRow}>
          <View style={styles.flex}>
            <Text variant="label" muted>
              MY PLACE
            </Text>
            <Text variant="title" style={styles.homeName}>
              {home.label}
            </Text>
            <Text variant="caption" muted>
              {home.blurb} {homeEffectLabel(home)}.
            </Text>
          </View>
          <Orb3D size={54} color={accent} icon="home" />
        </View>
        <View style={styles.metrics}>
          <Metric label="Living" value={`${formatMoney(burn)}/wk`} />
          <Metric label="Upkeep" value={`${formatMoney(upkeep)}/wk`} align="center" />
          <Metric
            label="Total"
            value={`${formatMoney(burn + upkeep)}/wk`}
            align="right"
            color={COLORS.gold}
          />
        </View>
        {behind && (
          <View style={styles.behind}>
            <Ionicons name="warning" size={14} color={COLORS.negative} />
            <Text variant="caption" color={COLORS.negative} style={styles.flex}>
              You are behind on upkeep. The repo man knows where you live.
            </Text>
          </View>
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
              <Badge key={i.id} label={i.name} color={COLORS.gold} />
            ))}
          </View>
        )}
      </Card>

      <SectionTitle accent={COLORS.accent}>Where you live</SectionTitle>
      {error && (
        <View style={styles.error}>
          <Ionicons name="alert-circle" size={15} color={COLORS.warning} />
          <Text variant="caption" color={COLORS.warning} style={styles.flex}>
            {error}
          </Text>
        </View>
      )}
      <ListGroup>
        {HOMES.map((h, idx) => {
          const av = homeAvailability(h, homeId, ownedIds, player.money, economy.weeklyBurn);
          const here = h.id === homeId;
          const tint = HOME_LADDER_COLORS[Math.min(idx, HOME_LADDER_COLORS.length - 1)];
          return (
            <PressableScale
              key={h.id}
              onPress={() => (av.ok ? move(h.id) : setError(here ? null : av.reason))}
              style={[styles.home, here && { backgroundColor: withAlpha(tint, 0.1) }]}
            >
              <Tile3D icon={here ? 'home' : 'business'} color={tint} size={38} dim={!here && !av.ok} />
              <View style={styles.flex}>
                <Text variant="subheading" color={here ? tint : COLORS.text}>
                  {h.label}
                </Text>
                <Text variant="caption" muted>
                  {formatMoney(lifestyleBurn(economy.weeklyBurn, h.lifestyleTier))}/wk ·{' '}
                  {homeEffectLabel(h)}
                </Text>
              </View>
              {here ? (
                <Badge label="Home" color={tint} filled />
              ) : (
                <Text
                  variant="caption"
                  weight={av.ok ? 'bold' : 'regular'}
                  color={av.ok ? COLORS.accent : COLORS.textMuted}
                  style={styles.homeAction}
                >
                  {av.ok ? (av.cost > 0 ? `Move · ${formatMoney(av.cost)}` : 'Move') : av.reason}
                </Text>
              )}
            </PressableScale>
          );
        })}

      </ListGroup>

      <SectionTitle accent={COLORS.gold}>Lifestyle</SectionTitle>
      <LifestyleSection />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  homeName: { marginTop: SPACING.xs, marginBottom: SPACING.xs },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.base },
  behind: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md },
  ownedLabel: { marginTop: SPACING.base, marginBottom: SPACING.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs + 2 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: withAlpha(COLORS.warning, 0.1),
    borderWidth: 1,
    borderColor: withAlpha(COLORS.warning, 0.3),
  },
  home: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  homeAction: { maxWidth: 120, textAlign: 'right' },
});
