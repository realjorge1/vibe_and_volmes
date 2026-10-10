import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useProgressionStore } from '../../store/progressionStore';
import { useActivityStore } from '../../store/activityStore';
import { ACTIVITY_CATEGORIES, LIFE_ACTIVITIES } from '../../data/life/lifeActions';
import { activitiesPerWeek, activityAvailability } from '../../systems/life/activityEngine';
import { useLegalStore } from '../../store/legalStore';
import { useRouter } from 'expo-router';
import { buildActivityContext } from '../../systems/life/lifeContext';
import { playerDoActivity } from '../../systems/simulation/playerActions';
import { STAT_LABELS } from '../../constants/gameConfig';
import { categoryColor } from '../../utils/eventCategory';
import { formatMoney } from '../../utils/formatters';
import { formatFanCount } from '../../utils/statHelpers';
import type { ActivityCategory, LifeActivity } from '../../types/life';
import type { EventConsequence } from '../../types/events';
import { Card } from '../ui/Card';
import { Metric } from '../ui/Metric';
import { Text } from '../ui/Typography';
import { EffectChips } from '../ui/EffectChips';
import { PressableScale } from '../ui/PressableScale';
import { Grid } from '../ui/Grid';
import { RuleLabel } from '../ui/RuleLabel';
import { Tile3D } from '../fx/Tile3D';
import { RingGauge } from '../fx/RingGauge';
import { COLORS, RADIUS, SPACING, ifAnimated, withAlpha } from '../../constants/theme';

interface LastResult {
  label: string;
  category: ActivityCategory;
  line: string;
  effects: string[];
  posted: boolean;
}

/** Short, signed effect chips for the result card, loudest first. */
function effectChips(c: EventConsequence, energy: number): string[] {
  const chips: string[] = [];
  if (c.fansDelta) chips.push(`${c.fansDelta > 0 ? '+' : '−'}${formatFanCount(Math.abs(c.fansDelta))} fans`);
  if (c.moneyDelta) chips.push(`${c.moneyDelta > 0 ? '+' : '−'}${formatMoney(Math.abs(c.moneyDelta))}`);
  for (const s of c.statChanges ?? []) {
    if (!s.delta) continue;
    chips.push(`${STAT_LABELS[s.stat] ?? s.stat} ${s.delta > 0 ? '+' : '−'}${Math.abs(s.delta)}`);
  }
  if (energy) chips.push(`Energy −${energy}`);
  return chips;
}

/** Compact cost for a grid key: energy (after the bolt glyph), then cash. */
function costLabel(a: LifeActivity): string {
  return a.moneyCost ? `${a.energyCost} · ${formatMoney(a.moneyCost)}` : `${a.energyCost}`;
}

/**
 * Life · Activities — BitLife's most-used button. A grid of things to do
 * this week, grouped by category; each tap resolves on the spot, shows its
 * result here, and writes the same line into the Deck.
 */
export function ActivitiesSection() {
  // Subscriptions only: they re-render the list when anything the gates
  // read changes. The context itself is rebuilt from the stores below.
  usePlayerStore((s) => s.player);
  useGameStore((s) => s.playerTags);
  useProgressionStore((s) => s.level);
  useActivityStore((s) => s.lastDone);
  useLegalStore((s) => s.activeCase);
  const router = useRouter();
  const week = useGameStore((s) => s.week);
  const done = useActivityStore((s) => s.weekTally(week).done);

  const [last, setLast] = useState<LastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ctx = buildActivityContext();
  if (!ctx) return null;
  const perWeek = activitiesPerWeek(ctx);
  const left = Math.max(0, perWeek - done);

  const run = (a: LifeActivity) => {
    // A launcher (the escape) is played on its own screen.
    if (a.opens) {
      setError(null);
      router.push(a.opens as never);
      return;
    }
    const res = playerDoActivity(a.id);
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    setError(null);
    setLast({
      label: a.label,
      category: a.category,
      line: res.result.line,
      effects: effectChips(res.result.consequences, a.energyCost),
      posted: res.posted,
    });
  };

  return (
    <View>
      <View style={styles.strip}>
        <View style={styles.stripCell}>
          <RingGauge progress={left / perWeek} size={50} stroke={4} color={COLORS.secondary}>
            <Text variant="metric" style={styles.leftNum} color={left > 0 ? COLORS.text : COLORS.textMuted}>
              {left}
            </Text>
          </RingGauge>
          <Text variant="label" muted style={styles.stripLabel}>
            {left === 1 ? 'ACTIVITY LEFT' : 'ACTIVITIES LEFT'}
          </Text>
        </View>
        <View style={styles.stripRule} />
        <Metric label="Energy" value={`${Math.round(ctx.stats.energy)}`} align="center" style={styles.stripCell} />
        <View style={styles.stripRule} />
        <Metric
          label="Cash"
          value={formatMoney(ctx.money)}
          align="center"
          color={COLORS.gold}
          style={styles.stripCell}
        />
      </View>

      {last && (
        <Animated.View key={last.line} entering={ifAnimated(FadeInDown.springify().damping(15))}>
          <Card accent={categoryColor(logCategory(last.category))}>
            <Text variant="label" muted>
              {last.label.toUpperCase()}
            </Text>
            <Text variant="body" style={styles.resultLine}>
              {last.line}
            </Text>
            <EffectChips effects={last.effects} />
            {last.posted && (
              <Text variant="caption" color={COLORS.accent} style={styles.posted}>
                ✦ The internet noticed. It is on your feed.
              </Text>
            )}
          </Card>
        </Animated.View>
      )}

      {error && (
        <View style={styles.error}>
          <Ionicons name="alert-circle" size={15} color={COLORS.warning} />
          <Text variant="caption" color={COLORS.warning} style={styles.flex}>
            {error}
          </Text>
        </View>
      )}

      {ACTIVITY_CATEGORIES.filter((cat) => (ctx.inJail ? cat.id === 'jail' : cat.id !== 'jail')).map((cat) => {
        const items = LIFE_ACTIVITIES.filter((a) => a.category === cat.id);
        const tint = categoryColor(cat.logAs);
        return (
          <View key={cat.id}>
            <RuleLabel color={tint}>{cat.label.toUpperCase()}</RuleLabel>
            <Grid columns={3} gap={SPACING.md}>
              {items.map((a) => {
                const av = activityAvailability(a, ctx);
                return (
                  <PressableScale
                    key={a.id}
                    onPress={() => (av.ok ? run(a) : setError(av.reason))}
                    scaleTo={0.92}
                    style={[styles.item, !av.ok && styles.itemOff]}
                  >
                    <Tile3D
                      icon={av.ok || !av.locked ? a.icon : 'lock-closed'}
                      color={tint}
                      size={52}
                      dim={!av.ok}
                    />
                    <Text
                      variant="caption"
                      weight="semibold"
                      center
                      numberOfLines={2}
                      color={av.ok ? COLORS.text : COLORS.textMuted}
                      style={styles.itemLabel}
                    >
                      {a.label}
                    </Text>
                    {av.ok ? (
                      <View style={styles.cost}>
                        <Ionicons name="flash" size={10} color={COLORS.textMuted} />
                        <Text variant="label" muted style={styles.costText}>
                          {costLabel(a)}
                        </Text>
                      </View>
                    ) : (
                      <Text variant="label" muted center numberOfLines={1} style={styles.costText}>
                        {av.locked ? 'LOCKED' : 'NOT NOW'}
                      </Text>
                    )}
                  </PressableScale>
                );
              })}
            </Grid>
          </View>
        );
      })}
    </View>
  );
}

function logCategory(id: ActivityCategory) {
  return ACTIVITY_CATEGORIES.find((c) => c.id === id)?.logAs ?? 'personal';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  stripCell: { flex: 1, alignItems: 'center' },
  stripRule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: COLORS.border },
  stripLabel: { fontSize: 8.5, marginTop: SPACING.sm },
  leftNum: { fontSize: 17, lineHeight: 21 },
  resultLine: { marginTop: SPACING.sm },
  posted: { marginTop: SPACING.md },
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
  item: { alignItems: 'center', paddingVertical: SPACING.xs },
  itemOff: { opacity: 0.55 },
  itemLabel: { marginTop: SPACING.sm, fontSize: 12, lineHeight: 15, minHeight: 30 },
  cost: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  costText: { fontSize: 9, letterSpacing: 0.4 },
});
