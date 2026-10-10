import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Orb3D } from '../components/fx/Orb3D';
import { usePlayerStore } from '../store/playerStore';
import { usePlanStore } from '../store/planStore';
import { usePremiumStore } from '../store/premiumStore';
import { useProgressionStore } from '../store/progressionStore';
import { useCommunityStore } from '../store/communityStore';
import { ACTIVITIES, getActivity } from '../data/passive/activities';
import { projectScheduledEvents } from '../systems/passive/scheduledEvents';
import { PASSIVE_CONFIG } from '../constants/passiveConfig';
import type { ActivityId } from '../types/passive';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function fmtIn(ms: number): string {
  if (ms <= 0) return 'live now';
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `in ${Math.max(1, h)}h`;
  const d = Math.floor(h / 24);
  return `in ${d}d ${h % 24}h`;
}

export default function PlanModal() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const plan = usePlanStore((s) => s.plan);
  const setSlot = usePlanStore((s) => s.setSlot);
  const autoFill = usePlanStore((s) => s.autoFill);
  const level = useProgressionStore((s) => s.level);
  const hasAutoFill = usePremiumStore((s) => s.convenience.includes('auto-fill'));
  const communityEvents = useCommunityStore((s) => s.events);

  const [focused, setFocused] = useState(0);

  if (!player) return null;

  const upcoming = projectScheduledEvents(player.createdAt).slice(0, 3);

  const assign = (id: ActivityId) => {
    setSlot(focused, id);
    setFocused((f) => (f + 1) % PASSIVE_CONFIG.SLOTS_PER_DAY);
  };

  const onAutoFill = () => {
    if (hasAutoFill) autoFill();
    else router.push('/store-modal');
  };

  return (
    <Screen scroll tint={COLORS.accent}>
      <ScreenHeader
        eyebrow="ROUTINE"
        title="Daily Plan"
        subtitle="Set a routine. While you're away, your days play out automatically — come back to see what happened. Planning never costs energy."
        accent={COLORS.accent}
        right={<Orb3D size={52} color={COLORS.accent} icon="calendar" />}
      />

      {/* Upcoming world + community moments */}
      <Card>
        <Text variant="label" color={COLORS.primary}>
          UPCOMING
        </Text>
        {upcoming.map((e) => (
          <View key={e.id} style={styles.upRow}>
            <View style={styles.flex}>
              <Text variant="subheading">{e.title}</Text>
              <Text variant="caption" muted>
                {e.blurb}
              </Text>
            </View>
            <Text
              variant="caption"
              color={e.live ? COLORS.positive : COLORS.textMuted}
            >
              {e.live ? 'LIVE' : fmtIn(e.startsInMs)}
            </Text>
          </View>
        ))}
        {communityEvents.map((e) => (
          <View key={e.id} style={styles.upRow}>
            <View style={styles.flex}>
              <Text variant="subheading">
                {e.name}{' '}
                <Text variant="caption" color={COLORS.tunetok}>
                  · community
                </Text>
              </Text>
              <Text variant="caption" muted>
                {e.blurb}
              </Text>
            </View>
            <Text variant="caption" color={COLORS.positive}>
              LIVE
            </Text>
          </View>
        ))}
      </Card>

      {/* The day's slots */}
      <View style={styles.slotsHeader}>
        <Text variant="label" muted>
          YOUR DAY · {PASSIVE_CONFIG.SLOTS_PER_DAY} SLOTS
        </Text>
        <Pressable onPress={onAutoFill}>
          <Text variant="caption" color={COLORS.primary}>
            {hasAutoFill ? 'Auto-Plan' : 'Auto-Plan ✦'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.slots}>
        {plan.slots.map((slotId, i) => {
          const act = getActivity(slotId);
          const isFocused = i === focused;
          return (
            <Pressable
              key={i}
              onPress={() => setFocused(i)}
              style={[
                styles.slot,
                { borderColor: isFocused ? COLORS.primary : COLORS.border },
              ]}
            >
              <Ionicons
                name={(act?.icon ?? 'add-outline') as IconName}
                size={20}
                color={act ? act.color : COLORS.textMuted}
              />
              <Text variant="caption" muted style={styles.slotLabel} numberOfLines={1}>
                {act?.label ?? 'Empty'}
              </Text>
              {act && (
                <Pressable onPress={() => setSlot(i, null)} hitSlop={8}>
                  <Text variant="caption" color={COLORS.textMuted}>
                    clear
                  </Text>
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" muted style={styles.hint}>
        Tap a slot to focus it, then pick an activity below.
      </Text>

      {/* Activity picker */}
      <View style={styles.grid}>
        {ACTIVITIES.map((a) => {
          const locked = level < a.unlockLevel;
          return (
            <Pressable
              key={a.id}
              disabled={locked}
              onPress={() => assign(a.id)}
              style={[styles.actCard, locked && styles.actLocked]}
            >
              <View style={styles.actTop}>
                <Ionicons name={a.icon as IconName} size={18} color={a.color} />
                <Text variant="subheading" style={styles.flex}>
                  {a.label}
                </Text>
                {locked && (
                  <Text variant="caption" color={COLORS.textMuted}>
                    Lv {a.unlockLevel}
                  </Text>
                )}
              </View>
              <Text variant="caption" muted>
                {a.effectHint}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button label="Done" icon="checkmark" variant="brand" onPress={() => router.back()} style={styles.done} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  upRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  flex: { flex: 1 },
  slotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  slots: { flexDirection: 'row', gap: SPACING.sm },
  slot: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  slotLabel: { maxWidth: '100%' },
  hint: { marginTop: SPACING.sm, marginBottom: SPACING.lg },
  grid: { gap: SPACING.sm },
  actCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    gap: SPACING.xs,
  },
  actLocked: { opacity: 0.45 },
  actTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  done: { marginTop: SPACING.lg },
});
