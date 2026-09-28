import { useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useLabelStore } from '../../store/labelStore';
import { usePressStore } from '../../store/pressStore';
import { usePlanStore } from '../../store/planStore';
import { getActivity } from '../../data/passive/activities';
import { useCareerFeed } from '../../hooks/useCareerFeed';
import { useWeekEngine } from '../../hooks/useWeekEngine';
import { Card } from '../../components/ui/Card';
import { Divider } from '../../components/ui/Divider';
import { Text } from '../../components/ui/Typography';
import { FameDisplay } from '../../components/home/FameDisplay';
import { QuickStats } from '../../components/home/QuickStats';
import { LevelBadge } from '../../components/progression/LevelBadge';
import { EnergyMeter } from '../../components/home/EnergyMeter';
import { WeekRule } from '../../components/home/WeekRule';
import { LogLine } from '../../components/home/LogLine';
import { AdvanceBar } from '../../components/home/AdvanceBar';
import { InlineEventCard } from '../../components/events/InlineEventCard';
import { ResolvedEventCard } from '../../components/events/ResolvedEventCard';
import { formatWeek } from '../../utils/formatters';
import { formatFanCount, formatMoney } from '../../utils/statHelpers';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface Alert {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  title: string;
  sub: string;
  onPress: () => void;
}

function HeaderStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View>
      <Text variant="label" color={COLORS.textMuted}>
        {label}
      </Text>
      <Text variant="subheading" color={color} style={styles.headerStatValue}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The Deck — one scrolling career column with one primary action pinned
 * underneath it.
 *
 * Everything that happens to the player is appended here: past weeks as log
 * lines, this week's resolved decisions with the outcome they produced, and
 * the live decision at the foot of the column. Deciding never pushes a
 * screen, so the player keeps their place and the result lands directly
 * where they tapped.
 */
export default function Deck() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const offers = useLabelStore((s) => s.offers);
  const contract = useLabelStore((s) => s.contract);
  const pendingInterview = usePressStore((s) => s.pendingInterview);
  const controversies = usePressStore((s) => s.controversies);
  const plan = usePlanStore((s) => s.plan);

  const { items, truncated, pendingCount, eventsThisWeek, eventNumber } =
    useCareerFeed();
  const { availableChoices, lockedChoices, choose, finishWeek } =
    useWeekEngine();

  const scrollRef = useRef<ScrollView>(null);
  /**
   * Where the column should come to rest: the live decision, or the
   * end-of-week marker once there is nothing left to decide. Only one of the
   * two is ever mounted, so they share the ref.
   */
  const anchorY = useRef(0);
  const wantScroll = useRef(true);
  const didFirstScroll = useRef(false);

  const scrollToAnchor = useCallback((animated: boolean) => {
    const sv = scrollRef.current;
    if (!sv) return;
    if (anchorY.current > 0) {
      sv.scrollTo({ y: Math.max(0, anchorY.current - SPACING.base), animated });
    } else {
      sv.scrollToEnd({ animated });
    }
  }, []);

  /**
   * The anchor reports its own position, and consumes a queued scroll the
   * moment it does. Exactly one anchor is mounted at a time and it is keyed,
   * so resolving a decision or advancing a week always remounts it and fires
   * this — which makes the layout pass itself the scroll trigger, with no
   * race against content-size callbacks and no timeout to guess at.
   */
  const handleAnchorLayout = useCallback(
    (e: LayoutChangeEvent) => {
      anchorY.current = e.nativeEvent.layout.y;
      if (!wantScroll.current) return;
      wantScroll.current = false;
      // The first landing is a jump — the player opens onto their live week
      // rather than watching it scroll past.
      const animated = didFirstScroll.current;
      didFirstScroll.current = true;
      requestAnimationFrame(() => scrollToAnchor(animated));
    },
    [scrollToAnchor]
  );

  const onChoose = useCallback(
    (choiceId: string) => {
      choose(choiceId);
      wantScroll.current = true;
    },
    [choose]
  );

  const onAdvance = useCallback(() => {
    finishWeek();
    wantScroll.current = true;
  }, [finishWeek]);

  if (!player) return null;

  const planSummary =
    plan.slots
      .map((id) => getActivity(id)?.label)
      .filter(Boolean)
      .join(' · ') || 'No routine set';

  const activeControversies = controversies.filter((c) => !c.resolved);

  // Decisions that live outside the week's event slate. The week's own
  // events are no longer listed here — they are in the column itself.
  const alerts: Alert[] = [];
  if (pendingInterview) {
    alerts.push({
      id: 'interview',
      icon: 'mic',
      tone: COLORS.warning,
      title: `${pendingInterview.outletName} interview booked`,
      sub: 'Every answer is a risk.',
      onPress: () => router.push('/interview-modal'),
    });
  }
  if (!contract && offers.length > 0) {
    alerts.push({
      id: 'offers',
      icon: 'document-text',
      tone: COLORS.primary,
      title: `${offers.length} label offer${offers.length > 1 ? 's' : ''} on the table`,
      sub: 'Review the terms in Empire · Business.',
      onPress: () => router.push('/(game)/empire'),
    });
  }
  if (activeControversies.length > 0) {
    alerts.push({
      id: 'controversy',
      icon: 'warning',
      tone: COLORS.negative,
      title: `${activeControversies.length} active controvers${activeControversies.length > 1 ? 'ies' : 'y'}`,
      sub: 'The internet is waiting on a response.',
      onPress: () => router.push('/(game)/empire'),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Vitals stay put while the career scrolls beneath them. */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.flexShrink}>
            <Text variant="label" color={COLORS.primary}>
              {formatWeek(week).toUpperCase()}
            </Text>
            <Text variant="heading" numberOfLines={1} style={styles.artist}>
              {player.artistName}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/stats-modal')}
            style={styles.iconBtn}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
        </View>
        <View style={styles.headerStats}>
          <HeaderStat label="FANS" value={formatFanCount(player.stats.fans)} />
          <HeaderStat
            label="CASH"
            value={formatMoney(player.money)}
            color={COLORS.primary}
          />
          <HeaderStat
            label="ENERGY"
            value={`${Math.round(player.stats.energy)}%`}
          />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {truncated && (
          <Pressable
            onPress={() => router.push('/chronicle-modal')}
            style={styles.earlier}
          >
            <Text variant="caption" color={COLORS.textMuted}>
              Earlier career in the Chronicle →
            </Text>
          </Pressable>
        )}

        {items.map((item) => {
          switch (item.kind) {
            case 'week':
              return (
                <WeekRule
                  key={item.key}
                  week={item.week}
                  isCurrent={item.isCurrent}
                />
              );
            case 'note':
              return <LogLine key={item.key} entry={item.entry} />;
            case 'resolved':
              return (
                <ResolvedEventCard
                  key={item.key}
                  event={item.event}
                  choiceText={item.choiceText}
                  flavorText={item.flavorText}
                />
              );
            case 'active':
              return (
                <View key={item.key} onLayout={handleAnchorLayout}>
                  <InlineEventCard
                    event={item.event}
                    availableChoices={availableChoices}
                    lockedChoices={lockedChoices}
                    onChoose={onChoose}
                    index={eventNumber}
                    total={eventsThisWeek}
                  />
                </View>
              );
            default:
              return null;
          }
        })}

        {pendingCount === 0 && (
          <View onLayout={handleAnchorLayout} style={styles.handled}>
            <Text variant="label" color={COLORS.positive}>
              WEEK HANDLED
            </Text>
            <Text variant="caption" muted style={styles.handledSub}>
              Nothing left to decide. Time moves when you&apos;re ready.
            </Text>
          </View>
        )}

        {alerts.length > 0 && (
          <Card accent={COLORS.primary} style={styles.block}>
            <Text variant="label" muted>
              NEEDS YOU
            </Text>
            {alerts.map((a, i) => (
              <Pressable key={a.id} onPress={a.onPress}>
                <View style={[styles.alertRow, i > 0 && styles.alertRowGap]}>
                  <View style={[styles.alertDot, { backgroundColor: a.tone }]}>
                    <Ionicons name={a.icon} size={14} color={COLORS.bg} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="subheading">{a.title}</Text>
                    <Text variant="caption" muted>
                      {a.sub}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={COLORS.textMuted}
                  />
                </View>
              </Pressable>
            ))}
          </Card>
        )}

        <Divider spacing={SPACING.lg} />

        {/* Opt-in depth — the dashboard sits under the log, never over it. */}
        <View style={styles.block}>
          <FameDisplay
            fans={player.stats.fans}
            reputation={player.stats.reputation}
          />
        </View>
        <View style={styles.block}>
          <LevelBadge onPress={() => router.push('/(game)/empire')} />
        </View>
        <View style={styles.block}>
          <EnergyMeter />
        </View>

        <Card
          accent={COLORS.primary}
          onPress={() => router.push('/plan-modal')}
          style={styles.block}
        >
          <View style={styles.planRow}>
            <View style={styles.planIcon}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.bg} />
            </View>
            <View style={styles.flex}>
              <Text variant="subheading">Daily Plan</Text>
              <Text variant="caption" muted numberOfLines={1}>
                {planSummary}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={COLORS.textMuted}
            />
          </View>
        </Card>

        <View style={styles.linkRow}>
          <Pressable
            style={styles.linkCard}
            onPress={() => router.push('/store-modal')}
          >
            <Ionicons name="diamond-outline" size={18} color={COLORS.gold} />
            <Text variant="subheading">Store</Text>
            <Text variant="caption" muted>
              Themes · packs · pass
            </Text>
          </Pressable>
          <Pressable
            style={styles.linkCard}
            onPress={() => router.push('/community-modal')}
          >
            <Ionicons name="earth-outline" size={18} color={COLORS.primary} />
            <Text variant="subheading">Community</Text>
            <Text variant="caption" muted>
              Charts · season rank
            </Text>
          </Pressable>
        </View>

        <View style={styles.blockTop}>
          <QuickStats stats={player.stats} money={player.money} />
        </View>
      </ScrollView>

      <AdvanceBar
        pendingCount={pendingCount}
        nextWeek={week + 1}
        onAdvance={onAdvance}
        onJumpToDecision={() => scrollToAnchor(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.base,
  },
  artist: { marginTop: 2 },
  headerStats: {
    flexDirection: 'row',
    marginTop: SPACING.base,
    gap: SPACING.xl,
  },
  headerStatValue: { marginTop: 1 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  earlier: { paddingVertical: SPACING.sm },
  handled: { paddingVertical: SPACING.base, marginBottom: SPACING.base },
  handledSub: { marginTop: SPACING.xs },
  block: { marginBottom: SPACING.base },
  blockTop: { marginTop: SPACING.md },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  alertRowGap: { marginTop: SPACING.base },
  alertDot: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  planIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  linkCard: {
    flex: 1,
    gap: SPACING.xs,
    padding: SPACING.base,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
});
