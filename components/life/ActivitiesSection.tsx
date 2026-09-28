import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useProgressionStore } from '../../store/progressionStore';
import { useActivityStore } from '../../store/activityStore';
import { ACTIVITY_CATEGORIES, LIFE_ACTIVITIES } from '../../data/life/lifeActions';
import { activityAvailability } from '../../systems/life/activityEngine';
import { buildActivityContext } from '../../systems/life/lifeContext';
import { playerDoActivity } from '../../systems/simulation/playerActions';
import { ACTIVITIES_PER_WEEK, STAT_LABELS } from '../../constants/gameConfig';
import { categoryColor } from '../../utils/eventCategory';
import { formatMoney } from '../../utils/formatters';
import { formatFanCount } from '../../utils/statHelpers';
import type { ActivityCategory, LifeActivity } from '../../types/life';
import type { EventConsequence } from '../../types/events';
import { Card } from '../ui/Card';
import { Metric } from '../ui/Metric';
import { Text } from '../ui/Typography';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

type Glyph = keyof typeof Ionicons.glyphMap;

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

function costLabel(a: LifeActivity): string {
  const parts = [`${a.energyCost} energy`];
  if (a.moneyCost) parts.push(formatMoney(a.moneyCost));
  return parts.join(' · ');
}

/**
 * Life · Activities — BitLife's most-used button. One list of things to do
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
  const week = useGameStore((s) => s.week);
  const done = useActivityStore((s) => s.weekTally(week).done);

  const [last, setLast] = useState<LastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ctx = buildActivityContext();
  if (!ctx) return null;
  const left = Math.max(0, ACTIVITIES_PER_WEEK - done);

  const run = (a: LifeActivity) => {
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
      <Card>
        <View style={styles.metrics}>
          <Metric
            label="This week"
            value={`${left} of ${ACTIVITIES_PER_WEEK}`}
            sub={left === 1 ? 'activity left' : 'activities left'}
            color={left > 0 ? COLORS.text : COLORS.textMuted}
          />
          <Metric label="Energy" value={`${Math.round(ctx.stats.energy)}`} align="center" />
          <Metric label="Cash" value={formatMoney(ctx.money)} align="right" color={COLORS.primary} />
        </View>
      </Card>

      {last && (
        <Card accent={categoryColor(logCategory(last.category))}>
          <Text variant="label" muted>
            {last.label.toUpperCase()}
          </Text>
          <Text variant="body" style={styles.resultLine}>
            {last.line}
          </Text>
          {last.effects.length > 0 && (
            <View style={styles.chips}>
              {last.effects.map((e) => (
                <View key={e} style={styles.chip}>
                  <Text variant="caption" color={COLORS.textSecondary}>
                    {e}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {last.posted && (
            <Text variant="caption" color={COLORS.primary} style={styles.posted}>
              The internet noticed. It is on your feed.
            </Text>
          )}
        </Card>
      )}

      {error && (
        <Text variant="caption" color={COLORS.warning} style={styles.error}>
          {error}
        </Text>
      )}

      {ACTIVITY_CATEGORIES.map((cat) => {
        const items = LIFE_ACTIVITIES.filter((a) => a.category === cat.id);
        return (
          <View key={cat.id} style={styles.category}>
            <View style={styles.categoryHead}>
              <Ionicons name={cat.icon as Glyph} size={14} color={categoryColor(cat.logAs)} />
              <Text variant="label" muted>
                {cat.label.toUpperCase()}
              </Text>
            </View>
            {items.map((a) => {
              const av = activityAvailability(a, ctx);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => (av.ok ? run(a) : setError(av.reason))}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && av.ok && styles.rowPressed,
                  ]}
                >
                  <Ionicons
                    name={(av.ok || !av.locked ? a.icon : 'lock-closed-outline') as Glyph}
                    size={18}
                    color={av.ok ? COLORS.text : COLORS.textMuted}
                  />
                  <View style={styles.rowText}>
                    <Text variant="subheading" color={av.ok ? COLORS.text : COLORS.textMuted}>
                      {a.label}
                    </Text>
                    <Text variant="caption" muted numberOfLines={1}>
                      {a.blurb}
                    </Text>
                  </View>
                  <Text
                    variant="caption"
                    color={av.ok ? COLORS.textSecondary : COLORS.textMuted}
                    style={styles.cost}
                  >
                    {av.ok ? costLabel(a) : av.reason}
                  </Text>
                </Pressable>
              );
            })}
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
  metrics: { flexDirection: 'row', justifyContent: 'space-between' },
  resultLine: { marginTop: SPACING.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.md },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  posted: { marginTop: SPACING.sm },
  error: { marginBottom: SPACING.md },
  category: { marginTop: SPACING.lg },
  categoryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowPressed: { opacity: 0.6 },
  rowText: { flex: 1 },
  cost: { maxWidth: 120, textAlign: 'right' },
});
