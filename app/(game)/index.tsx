import { useCallback, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useLabelStore } from '../../store/labelStore';
import { usePressStore } from '../../store/pressStore';
import { useCareerFeed } from '../../hooks/useCareerFeed';
import { useWeekEngine } from '../../hooks/useWeekEngine';
import { Card } from '../../components/ui/Card';
import { Grid } from '../../components/ui/Grid';
import { RuleLabel } from '../../components/ui/RuleLabel';
import { Text } from '../../components/ui/Typography';
import { PressableScale } from '../../components/ui/PressableScale';
import { DeckHeader } from '../../components/home/DeckHeader';
import { FameDisplay } from '../../components/home/FameDisplay';
import { QuickStats } from '../../components/home/QuickStats';
import { LevelBadge } from '../../components/progression/LevelBadge';
import { WeekRule } from '../../components/home/WeekRule';
import { LogLine } from '../../components/home/LogLine';
import { AdvanceBar } from '../../components/home/AdvanceBar';
import { InlineEventCard } from '../../components/events/InlineEventCard';
import { ResolvedEventCard } from '../../components/events/ResolvedEventCard';
import { Orb3D } from '../../components/fx/Orb3D';
import { Tile3D } from '../../components/fx/Tile3D';
import { WeekTransition } from '../../components/fx/WeekTransition';
import { ageAtWeek } from '../../systems/life/age';
import { ANIMATIONS_ENABLED, COLORS, SPACING, ifAnimated } from '../../constants/theme';
import { useIdentityStore } from '../../store/identityStore';
import { useCalendarStore } from '../../store/calendarStore';
import { useLegalStore } from '../../store/legalStore';
import { useTourStore } from '../../store/tourStore';
import { useShowStore } from '../../store/showStore';
import { WantsStrip } from '../../components/identity/WantsStrip';
import { showsTonight } from '../../systems/show/showActions';
import { awardNightTonight } from '../../systems/calendar/calendarTick';
import { slotLabel } from '../../systems/calendar/festivalEngine';
import { formatMoney } from '../../utils/formatters';

interface Alert {
  id: string;
  icon: string;
  tone: string;
  title: string;
  sub: string;
  onPress: () => void;
}

/** A quick-launch key: a 3D icon over its name, centered in its column. */
function Shortcut({
  icon,
  color,
  label,
  onPress,
}: {
  icon: string;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.92} style={styles.shortcut}>
      <Tile3D icon={icon} color={color} size={50} />
      <Text variant="caption" weight="semibold" color={COLORS.textSecondary} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
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
  const wants = useIdentityStore((s) => s.wants);
  const dreamOffer = useIdentityStore((s) => s.dreamOffer);
  const chartDay = useCalendarStore((s) => s.chartDay);
  const wrapped = useCalendarStore((s) => s.wrapped);
  const festival = useCalendarStore((s) => s.festival);
  const awards = useCalendarStore((s) => s.awards);
  const legalCase = useLegalStore((s) => s.activeCase);
  // Re-render when a show becomes (or stops being) tonight's.
  useTourStore((s) => s.activeTour);
  useShowStore((s) => s.gig);

  const { items, truncated, pendingCount, eventsThisWeek, eventNumber } =
    useCareerFeed();
  const { availableChoices, lockedChoices, choose, finishWeek } =
    useWeekEngine();

  const [turn, setTurn] = useState<{ week: number; subtitle?: string } | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  /**
   * Where the column should come to rest: the live decision, or the
   * end-of-week marker once there is nothing left to decide. Only one of the
   * two is ever mounted, so they share the ref.
   */
  const anchorY = useRef(0);
  const wantScroll = useRef(true);
  const didFirstScroll = useRef(false);

  const scrollToAnchor = useCallback((smooth: boolean) => {
    const sv = scrollRef.current;
    if (!sv) return;
    const animated = smooth && ANIMATIONS_ENABLED;
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
    const p = usePlayerStore.getState().player;
    const before = p ? ageAtWeek(p.startAge, week) : 0;
    const after = p ? ageAtWeek(p.startAge, week + 1) : 0;
    finishWeek();
    wantScroll.current = true;
    // The week-turn overlay is nothing but animation.
    if (ANIMATIONS_ENABLED) setTurn({
      week: week + 1,
      subtitle: after > before ? `Happy birthday · you're ${after}` : undefined,
    });
  }, [finishWeek, week]);

  if (!player) return null;

  const activeControversies = controversies.filter((c) => !c.resolved);

  // Decisions that live outside the week's event slate. The week's own
  // events are no longer listed here — they are in the column itself.
  const alerts: Alert[] = [];
  if (legalCase?.stage === 'jailed' && legalCase.releaseWeek !== null && legalCase.jailStartWeek !== null) {
    const total = legalCase.releaseWeek - legalCase.jailStartWeek;
    const served = Math.min(total, week - legalCase.jailStartWeek + 1);
    alerts.push({
      id: 'jail',
      icon: 'lock-closed',
      tone: COLORS.negative,
      title: `Locked up · month ${served} of ${total}`,
      sub: 'Life · Inside is all there is to do now.',
      onPress: () => router.push('/(game)/life'),
    });
  } else if (legalCase?.stage === 'fugitive') {
    alerts.push({
      id: 'fugitive',
      icon: 'walk',
      tone: COLORS.negative,
      title: 'On the run',
      sub: 'Every week, they might find you.',
      onPress: () => router.push('/(game)/life'),
    });
  }
  for (const show of showsTonight()) {
    alerts.push({
      id: `show-${show.key}`,
      icon: 'mic',
      tone: COLORS.accent,
      title: `Tonight: ${show.name}`,
      sub: `${show.city} · ${show.crowd.toLocaleString('en-US')} people · build your set`,
      onPress: () => router.push({ pathname: '/show-modal', params: { key: show.key } }),
    });
  }
  if (awards && !awards.resolved && awardNightTonight()) {
    const mine = awards.nominations.filter((n) => n.nominees.some((x) => x.isPlayer)).length;
    alerts.push({
      id: 'awards-night',
      icon: 'trophy',
      tone: COLORS.gold,
      title: `${awards.show} is tonight`,
      sub: `${mine} nomination${mine === 1 ? '' : 's'}. Get dressed.`,
      onPress: () => router.push('/awards-modal'),
    });
  } else if (awards && !awards.resolved && awards.nominations.some((n) => n.nominees.some((x) => x.isPlayer))) {
    alerts.push({
      id: 'awards-campaign',
      icon: 'ribbon',
      tone: COLORS.gold,
      title: `Nominated at ${awards.show}`,
      sub: 'Run a campaign before award night.',
      onPress: () => router.push('/awards-modal'),
    });
  }
  if (festival && festival.slot && festival.accepted === null) {
    alerts.push({
      id: 'lineup',
      icon: 'sunny',
      tone: '#FF8A3D',
      title: `${festival.name} wants you`,
      sub: `${slotLabel(festival.slot)} · ${formatMoney(festival.fee)} · answer before the weekend`,
      onPress: () => router.push('/lineup-modal'),
    });
  }
  if (chartDay && !chartDay.seen) {
    alerts.push({
      id: 'chart-day',
      icon: 'stats-chart',
      tone: COLORS.primary,
      title: 'Chart day',
      sub:
        chartDay.beat === 'number-one' || chartDay.beat === 'top-10'
          ? 'Something big happened. See where you landed.'
          : chartDay.beat === 'fall'
            ? 'Not every week goes up. See where you landed.'
            : 'Your songs moved. See where you landed.',
      onPress: () => router.push('/chart-modal'),
    });
  }
  if (wrapped && !wrapped.seen) {
    alerts.push({
      id: 'wrapped',
      icon: 'gift',
      tone: COLORS.secondary,
      title: `Your Year ${wrapped.year} Wrapped`,
      sub: 'Your year in music is ready.',
      onPress: () => router.push('/wrapped-modal'),
    });
  }
  if (dreamOffer) {
    alerts.push({
      id: 'dream',
      icon: 'star',
      tone: COLORS.gold,
      title: 'Choose your dream',
      sub: 'One big thing for this stretch of your life.',
      onPress: () => router.push('/you-modal'),
    });
  }
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
      <DeckHeader
        player={player}
        week={week}
        age={ageAtWeek(player.startAge, week)}
        onPressAvatar={() => router.push('/(game)/empire')}
        onPressSettings={() => router.push('/stats-modal')}
      />
      <WantsStrip wants={wants} week={week} onPress={() => router.push('/you-modal')} />

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {truncated && (
          <PressableScale
            onPress={() => router.push('/chronicle-modal')}
            style={styles.earlier}
          >
            <Ionicons name="book" size={13} color={COLORS.primary} />
            <Text variant="caption" color={COLORS.textSecondary}>
              Earlier career in the Chronicle
            </Text>
            <Ionicons name="arrow-forward" size={13} color={COLORS.textMuted} />
          </PressableScale>
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
          <Animated.View
            entering={ifAnimated(FadeIn.duration(500))}
            onLayout={handleAnchorLayout}
            style={styles.handled}
          >
            <Orb3D size={46} color={COLORS.positive} icon="checkmark" />
            <Text variant="label" color={COLORS.positive} style={styles.handledTitle}>
              WEEK HANDLED
            </Text>
            <Text variant="caption" muted center>
              Nothing left to decide. Time moves when you&apos;re ready.
            </Text>
          </Animated.View>
        )}

        {alerts.length > 0 && (
          <Card accent={COLORS.negative} style={styles.block}>
            <View style={styles.alertHead}>
              <View style={styles.pulseDot} />
              <Text variant="label" color={COLORS.text}>
                NEEDS YOU
              </Text>
            </View>
            {alerts.map((a, i) => (
              <PressableScale key={a.id} onPress={a.onPress} style={[styles.alertRow, i > 0 && styles.alertRowGap]}>
                <Tile3D icon={a.icon} color={a.tone} size={36} />
                <View style={styles.flex}>
                  <Text variant="subheading">{a.title}</Text>
                  <Text variant="caption" muted>
                    {a.sub}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </PressableScale>
            ))}
          </Card>
        )}

        {/* Opt-in depth — the dashboard sits under the log, never over it. */}
        <RuleLabel>YOUR CAREER</RuleLabel>
        <LevelBadge onPress={() => router.push('/(game)/empire')} />
        <View style={styles.bare}>
          <FameDisplay fans={player.stats.fans} reputation={player.stats.reputation} />
        </View>
        <View style={styles.bare}>
          <QuickStats stats={player.stats} />
        </View>
        <Grid columns={4} style={styles.bare}>
          <Shortcut icon="calendar" color={COLORS.accent} label="Plan" onPress={() => router.push('/plan-modal')} />
          <Shortcut icon="book" color={COLORS.primary} label="Chronicle" onPress={() => router.push('/chronicle-modal')} />
          <Shortcut icon="earth" color={COLORS.positive} label="Community" onPress={() => router.push('/community-modal')} />
          <Shortcut icon="diamond" color={COLORS.gold} label="Store" onPress={() => router.push('/store-modal')} />
        </Grid>
        <Grid columns={4} style={styles.bare}>
          <Shortcut icon="person" color={'#FF7EBD'} label="You" onPress={() => router.push('/you-modal')} />
          <Shortcut icon="stats-chart" color={COLORS.accent} label="Charts" onPress={() => router.push('/chart-modal')} />
          <Shortcut icon="today" color={'#FF8A3D'} label="Year" onPress={() => router.push('/year-modal')} />
          <Shortcut icon="ribbon" color={COLORS.gold} label="Legacy" onPress={() => router.push('/legacy-modal')} />
        </Grid>
      </ScrollView>

      <AdvanceBar
        pendingCount={pendingCount}
        nextWeek={week + 1}
        onAdvance={onAdvance}
        onJumpToDecision={() => scrollToAnchor(true)}
      />

      {turn && (
        <WeekTransition
          key={turn.week}
          week={turn.week}
          subtitle={turn.subtitle}
          onDone={() => setTurn(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.base + 4,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xl,
  },
  earlier: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  handled: {
    alignItems: 'center',
    gap: 4,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  handledTitle: { marginTop: SPACING.sm },
  block: { marginBottom: SPACING.base },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.negative,
  },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  alertRowGap: { marginTop: SPACING.md },
  bare: { marginTop: SPACING.lg },
  shortcut: { alignItems: 'center', gap: SPACING.sm },
});
