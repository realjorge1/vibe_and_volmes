import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useCalendarStore } from '../store/calendarStore';
import { answerFestival } from '../systems/calendar/calendarTick';
import { slotLabel } from '../systems/calendar/festivalEngine';
import { CALENDAR, weeksUntil } from '../systems/calendar/calendar';
import { saveProgress } from '../systems/persistence';
import { Screen } from '../components/ui/Screen';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { formatMoney } from '../utils/formatters';
import { COLORS, RADIUS, SPACING, withAlpha } from '../constants/theme';

/** Font size by billing: the poster is the status meter everybody understands. */
const TIER_SIZE = [30, 21, 15, 12] as const;
const TIER_COLORS = ['#FFFFFF', '#FFE48F', '#FFCE8F', '#E9D6C0'] as const;

/**
 * The festival poster. Biggest names on top, biggest font. If the artist made
 * it, their name is on it — in the font size they earned — and the offer
 * waits for an answer.
 */
export default function LineupModal() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const player = usePlayerStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const festival = useCalendarStore((s) => s.festival);
  if (!player) return null;

  if (!festival) {
    return (
      <Screen scroll tint={'#FF8A3D'}>
        <Text variant="title" center style={styles.top}>
          Festival season
        </Text>
        <Text variant="body" muted center>
          {`The lineup drops in week ${CALENDAR.lineup} of the year. ${weeksUntil(week, CALENDAR.lineup)} weeks to go.`}
        </Text>
      </Screen>
    );
  }

  const answer = (yes: boolean) => {
    if (answerFestival(yes)) saveProgress();
    router.back();
  };

  return (
    <Screen scroll tint={'#FF8A3D'}>
      <View style={styles.poster}>
        <LinearGradient
          colors={['#2B1240', '#7A2B4E', '#E2683C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text variant="label" center color={withAlpha('#FFFFFF', 0.75)}>
          {`YEAR ${festival.year} · ONE WEEKEND ONLY`}
        </Text>
        <Text variant="display" center color="#FFFFFF" style={styles.festName}>
          {festival.name.toUpperCase()}
        </Text>
        {festival.tiers.map((tier, i) => (
          <View key={i} style={styles.tier}>
            {tier.map((name, j) => {
              const me = name === player.artistName && festival.slot !== null;
              return (
                <Text
                  key={`${name}-${j}`}
                  variant="title"
                  center
                  color={me ? COLORS.gold : TIER_COLORS[i]}
                  style={[
                    styles.name,
                    { fontSize: TIER_SIZE[i], lineHeight: TIER_SIZE[i] * 1.25, maxWidth: width - 64 },
                    me && styles.me,
                  ]}
                >
                  {name.toUpperCase()}
                </Text>
              );
            })}
          </View>
        ))}
      </View>

      {festival.slot ? (
        <>
          <Text variant="heading" center style={styles.top}>
            {`You're on the poster: ${slotLabel(festival.slot)}`}
          </Text>
          <Text variant="body" muted center style={styles.small}>
            {`${formatMoney(festival.fee)} to play festival weekend (week ${festival.week}). You'll build your set and play it live.`}
          </Text>
          {festival.accepted === null ? (
            <View style={styles.buttons}>
              <Button label="Accept the slot" icon="checkmark" variant="brand" size="lg" fullWidth onPress={() => answer(true)} />
              <Button label="Pass" variant="ghost" fullWidth onPress={() => answer(false)} />
            </View>
          ) : (
            <Text variant="caption" color={festival.accepted ? COLORS.positive : COLORS.textMuted} center style={styles.small}>
              {festival.played
                ? `Played · ${festival.score ?? 0}/100`
                : festival.accepted
                  ? 'Accepted. See you on festival weekend.'
                  : 'You passed on it this year.'}
            </Text>
          )}
        </>
      ) : (
        <Text variant="body" muted center style={styles.top}>
          Your name isn’t on it this year. Keep growing: the poster notices.
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { marginTop: SPACING.lg },
  small: { marginTop: SPACING.sm, lineHeight: 20 },
  poster: {
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.base,
    overflow: 'hidden',
    marginTop: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  festName: { fontSize: 34, lineHeight: 40, marginTop: SPACING.xs, marginBottom: SPACING.lg },
  tier: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 12, rowGap: 2, marginBottom: SPACING.md },
  name: { letterSpacing: 0.5 },
  me: { textDecorationLine: 'underline' },
  buttons: { marginTop: SPACING.lg, gap: SPACING.sm },
});
