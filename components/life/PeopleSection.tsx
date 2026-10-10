import { useState } from 'react';
import { Avatar as PhoneAvatar } from '../phone/Avatar';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
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
import { EffectChips } from '../ui/EffectChips';
import { PressableScale } from '../ui/PressableScale';
import { ListGroup } from '../ui/ListGroup';
import { RuleLabel } from '../ui/RuleLabel';
import { Tile3D } from '../fx/Tile3D';
import { COLORS, RADIUS, SPACING, shade, ifAnimated, withAlpha } from '../../constants/theme';

type Glyph = keyof typeof Ionicons.glyphMap;

const GROUPS: { label: string; roles: PersonRole[]; color: string }[] = [
  { label: 'Family', roles: ['parent', 'sibling'], color: COLORS.accent },
  { label: 'Love', roles: ['partner', 'ex'], color: '#FF7EBD' },
  { label: 'Kids', roles: ['child'], color: COLORS.gold },
  { label: 'Friends', roles: ['friend'], color: COLORS.positive },
  { label: 'Team', roles: ['manager', 'producer'], color: COLORS.primary },
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
  return COLORS.warning;
}

function subtitle(p: Person, week: number): string {
  const parts = [capitalize(p.title.replace(/^your /, ''))];
  if (p.bond) parts.push(BOND_LABEL[p.bond]);
  if (p.role === 'child') parts.push(`Age ${childAge(p, week)}`);
  if (p.npcId) parts.push('In the industry');
  if (isEstranged(p)) parts.push('Estranged');
  return parts.join(' · ');
}

function Avatar({ name, color, dim, face }: { name: string; color: string; dim: boolean; face?: string }) {
  const base = dim ? '#3B3858' : color;
  // Someone met online keeps the face from their profile.
  if (face) {
    return (
      <View style={[styles.avatar, dim && styles.dimFace]}>
        <PhoneAvatar id={face} name={name} size={42} />
      </View>
    );
  }
  return (
    <View style={styles.avatar}>
      <LinearGradient
        colors={[shade(base, 0.3), shade(base, -0.45)]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.avatarRound]}
      />
      <Text variant="subheading" color="#FFFFFF" weight="bold">
        {name.trim()[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
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
        <Animated.View key={last.line} entering={ifAnimated(FadeInDown.springify().damping(15))}>
          <Card accent={COLORS.primary}>
            <Text variant="label" muted>
              {last.name.toUpperCase()}
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

      {pendingBirth && (
        <Card accent={COLORS.gold}>
          <View style={styles.birthRow}>
            <Tile3D icon="gift" color={COLORS.gold} size={40} />
            <View style={styles.flex}>
              <Text variant="subheading">A baby is on the way</Text>
              <Text variant="caption" muted>
                {pendingBirth.dueWeek - week <= 1
                  ? 'Any day now.'
                  : `Due in ${pendingBirth.dueWeek - week} weeks.`}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {error && (
        <View style={styles.error}>
          <Ionicons name="alert-circle" size={15} color={COLORS.warning} />
          <Text variant="caption" color={COLORS.warning} style={styles.flex}>
            {error}
          </Text>
        </View>
      )}

      {GROUPS.map((group) => {
        const members = people.filter((p) => group.roles.includes(p.role));
        if (members.length === 0) return null;
        return (
          <View key={group.label}>
            <RuleLabel color={group.color}>{group.label.toUpperCase()}</RuleLabel>
            <ListGroup>
              {members.map((p) => {
                const expanded = open === p.id;
                const options = INTERACTIONS.filter((i) => i.roles.includes(p.role));
                const estranged = isEstranged(p);
                const bond = Math.round(((p.affinity + 100) / 200) * 100);
                const bondColor = affinityColor(p.affinity);
                return (
                  <View key={p.id} style={expanded ? { backgroundColor: withAlpha(group.color, 0.07) } : null}>
                    <PressableScale
                      onPress={() => setOpen(expanded ? null : p.id)}
                      scaleTo={0.98}
                      style={styles.personHead}
                    >
                      <Avatar name={p.name} color={group.color} dim={estranged} face={p.face} />
                      <View style={styles.flex}>
                        <Text variant="subheading" color={estranged ? COLORS.textMuted : COLORS.text}>
                          {p.name}
                        </Text>
                        <Text variant="caption" muted numberOfLines={1}>
                          {subtitle(p, week)}
                        </Text>
                      </View>
                      <View style={styles.bondCol}>
                        <Ionicons name="heart" size={11} color={bondColor} />
                        <View style={styles.bar}>
                          <View style={[styles.barFill, { width: `${bond}%`, backgroundColor: bondColor }]} />
                        </View>
                      </View>
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={COLORS.textMuted}
                      />
                    </PressableScale>
                    {expanded && (
                      <Animated.View entering={ifAnimated(FadeIn.duration(220))} style={styles.actions}>
                        {options.map((i) => {
                          const av = interactionAvailability(i, p, ctx);
                          return (
                            <PressableScale
                              key={i.id}
                              onPress={() => (av.ok ? interact(p, i.id) : setError(av.reason))}
                              style={[
                                styles.action,
                                av.ok
                                  ? { borderColor: withAlpha(group.color, 0.45), backgroundColor: withAlpha(group.color, 0.1) }
                                  : styles.actionOff,
                              ]}
                            >
                              <Ionicons
                                name={i.icon as Glyph}
                                size={14}
                                color={av.ok ? group.color : COLORS.textMuted}
                              />
                              <Text variant="caption" weight="semibold" color={av.ok ? COLORS.text : COLORS.textMuted}>
                                {i.label}
                                {i.moneyCost ? ` · ${formatMoney(i.moneyCost)}` : ''}
                              </Text>
                            </PressableScale>
                          );
                        })}
                      </Animated.View>
                    )}
                  </View>
                );
              })}
            </ListGroup>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dimFace: { opacity: 0.45 },
  flex: { flex: 1 },
  resultLine: { marginTop: SPACING.sm },
  posted: { marginTop: SPACING.md },
  birthRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
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
  personHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRound: { borderRadius: 19 },
  bondCol: { alignItems: 'center', gap: 4 },
  bar: {
    width: 56,
    height: 5,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  barFill: { height: 5, borderRadius: RADIUS.full },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  actionOff: { borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.03)' },
});
