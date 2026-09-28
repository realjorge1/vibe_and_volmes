import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePeopleStore } from '../../store/peopleStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { INTERACTIONS } from '../../data/life/interactions';
import {
  capitalize,
  childAge,
  interactionAvailability,
  isEstranged,
} from '../../systems/life/peopleEngine';
import { currentAge } from '../../systems/life/lifeContext';
import { playerInteract } from '../../systems/simulation/playerActions';
import { STAT_LABELS } from '../../constants/gameConfig';
import { formatMoney } from '../../utils/formatters';
import { formatFanCount } from '../../utils/statHelpers';
import type { Person, PersonRole } from '../../types/people';
import type { EventConsequence } from '../../types/events';
import { Card } from '../ui/Card';
import { Text } from '../ui/Typography';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

type Glyph = keyof typeof Ionicons.glyphMap;

const GROUPS: { label: string; roles: PersonRole[] }[] = [
  { label: 'Family', roles: ['parent', 'sibling'] },
  { label: 'Love', roles: ['partner', 'ex'] },
  { label: 'Kids', roles: ['child'] },
  { label: 'Friends', roles: ['friend'] },
  { label: 'Team', roles: ['manager', 'producer'] },
];

const BOND_LABEL = { dating: 'Dating', engaged: 'Engaged', married: 'Married' } as const;

interface LastResult {
  name: string;
  line: string;
  effects: string[];
  posted: boolean;
}

function effectChips(c: EventConsequence, affinity: number): string[] {
  const chips: string[] = [];
  if (affinity) chips.push(`Bond ${affinity > 0 ? '+' : '−'}${Math.abs(affinity)}`);
  if (c.fansDelta) chips.push(`${c.fansDelta > 0 ? '+' : '−'}${formatFanCount(Math.abs(c.fansDelta))} fans`);
  if (c.moneyDelta) chips.push(`${c.moneyDelta > 0 ? '+' : '−'}${formatMoney(Math.abs(c.moneyDelta))}`);
  for (const s of c.statChanges ?? []) {
    if (s.delta) chips.push(`${STAT_LABELS[s.stat] ?? s.stat} ${s.delta > 0 ? '+' : '−'}${Math.abs(s.delta)}`);
  }
  return chips;
}

function affinityColor(a: number): string {
  if (a <= -20) return COLORS.negative;
  if (a >= 40) return COLORS.positive;
  return COLORS.neutral;
}

function subtitle(p: Person, week: number): string {
  const parts = [capitalize(p.title.replace(/^your /, ''))];
  if (p.bond) parts.push(BOND_LABEL[p.bond]);
  if (p.role === 'child') parts.push(`Age ${childAge(p, week)}`);
  if (p.npcId) parts.push('In the industry');
  if (isEstranged(p)) parts.push('Estranged');
  return parts.join(' · ');
}

/**
 * Life · People — the artist's circle. Tap someone to see what you can do
 * with them; one interaction per person per week, and every result lands
 * in the Deck like everything else.
 */
export function PeopleSection() {
  const people = usePeopleStore((s) => s.people);
  const pendingBirth = usePeopleStore((s) => s.pendingBirth);
  const player = usePlayerStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const gifted = usePeopleStore((s) => s.giftedIn(week));

  const [open, setOpen] = useState<string | null>(null);
  const [last, setLast] = useState<LastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const age = currentAge();
  if (!player || age === null) return null;
  const ctx = {
    week,
    age,
    energy: player.stats.energy,
    money: player.money,
    giftedThisWeek: gifted,
    expecting: pendingBirth !== null,
  };

  const interact = (p: Person, interactionId: string) => {
    const res = playerInteract(p.id, interactionId);
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    setError(null);
    setOpen(null);
    setLast({
      name: p.name,
      line: res.result.line,
      effects: effectChips(res.result.consequences, res.result.affinityDelta),
      posted: res.posted,
    });
  };

  return (
    <View>
      {last && (
        <Card accent={COLORS.primary}>
          <Text variant="label" muted>
            {last.name.toUpperCase()}
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

      {pendingBirth && (
        <Card accent={COLORS.gold}>
          <Text variant="subheading">A baby is on the way</Text>
          <Text variant="caption" muted>
            {pendingBirth.dueWeek - week <= 1
              ? 'Any day now.'
              : `Due in ${pendingBirth.dueWeek - week} weeks.`}
          </Text>
        </Card>
      )}

      {error && (
        <Text variant="caption" color={COLORS.warning} style={styles.error}>
          {error}
        </Text>
      )}

      {GROUPS.map((group) => {
        const members = people.filter((p) => group.roles.includes(p.role));
        if (members.length === 0) return null;
        return (
          <View key={group.label} style={styles.group}>
            <Text variant="label" muted style={styles.groupLabel}>
              {group.label.toUpperCase()}
            </Text>
            {members.map((p) => {
              const expanded = open === p.id;
              const options = INTERACTIONS.filter((i) => i.roles.includes(p.role));
              return (
                <View key={p.id} style={styles.person}>
                  <Pressable
                    onPress={() => setOpen(expanded ? null : p.id)}
                    style={styles.personHead}
                  >
                    <View style={styles.flex}>
                      <Text
                        variant="subheading"
                        color={isEstranged(p) ? COLORS.textMuted : COLORS.text}
                      >
                        {p.name}
                      </Text>
                      <Text variant="caption" muted>
                        {subtitle(p, week)}
                      </Text>
                    </View>
                    <View style={styles.bar}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.round(((p.affinity + 100) / 200) * 100)}%`,
                            backgroundColor: affinityColor(p.affinity),
                          },
                        ]}
                      />
                    </View>
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={COLORS.textMuted}
                    />
                  </Pressable>
                  {expanded && (
                    <View style={styles.actions}>
                      {options.map((i) => {
                        const av = interactionAvailability(i, p, ctx);
                        return (
                          <Pressable
                            key={i.id}
                            onPress={() => (av.ok ? interact(p, i.id) : setError(av.reason))}
                            style={({ pressed }) => [
                              styles.action,
                              !av.ok && styles.actionOff,
                              pressed && av.ok && styles.actionPressed,
                            ]}
                          >
                            <Ionicons
                              name={i.icon as Glyph}
                              size={14}
                              color={av.ok ? COLORS.text : COLORS.textMuted}
                            />
                            <Text variant="caption" color={av.ok ? COLORS.text : COLORS.textMuted}>
                              {i.label}
                              {i.moneyCost ? ` · ${formatMoney(i.moneyCost)}` : ''}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  group: { marginTop: SPACING.lg },
  groupLabel: { marginBottom: SPACING.xs },
  person: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  personHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  bar: {
    width: 64,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface3,
    overflow: 'hidden',
  },
  barFill: { height: 4 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  actionOff: { borderColor: COLORS.border },
  actionPressed: { opacity: 0.6 },
});
