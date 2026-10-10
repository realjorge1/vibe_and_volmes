import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../store/gameStore';
import { useCalendarStore } from '../store/calendarStore';
import { useMusicStore } from '../store/musicStore';
import { CALENDAR, careerYear, yearWeek } from '../systems/calendar/calendar';
import { slotLabel } from '../systems/calendar/festivalEngine';
import { WEEKS_PER_YEAR } from '../constants/gameConfig';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Grid } from '../components/ui/Grid';
import { ListGroup } from '../components/ui/ListGroup';
import { RuleLabel } from '../components/ui/RuleLabel';
import { Text } from '../components/ui/Typography';
import { PressableScale } from '../components/ui/PressableScale';
import { Orb3D } from '../components/fx/Orb3D';
import { formatStreams } from '../utils/statHelpers';
import { COLORS, RADIUS, SPACING, withAlpha } from '../constants/theme';

type Glyph = keyof typeof Ionicons.glyphMap;

const MARKS: Record<number, { icon: string; label: string; color: string }> = {
  1: { icon: 'gift', label: 'Wrapped', color: COLORS.secondary },
  [CALENDAR.lineup]: { icon: 'megaphone', label: 'Lineup', color: '#FF8A3D' },
  [CALENDAR.festival]: { icon: 'sunny', label: 'Festival', color: '#FF8A3D' },
  [CALENDAR.nominations]: { icon: 'ribbon', label: 'Noms', color: COLORS.gold },
  [CALENDAR.awards]: { icon: 'trophy', label: 'Awards', color: COLORS.gold },
  [CALENDAR.holidayStart]: { icon: 'snow', label: 'Holidays', color: COLORS.accent },
};

/** The music year at a glance: where you are in it, and what it holds. */
export default function YearModal() {
  const router = useRouter();
  const week = useGameStore((s) => s.week);
  const festival = useCalendarStore((s) => s.festival);
  const awards = useCalendarStore((s) => s.awards);
  const awardHistory = useCalendarStore((s) => s.awardHistory);
  const festivalHistory = useCalendarStore((s) => s.festivalHistory);
  const wrappedHistory = useCalendarStore((s) => s.wrappedHistory);
  const holidaySongs = useMusicStore((s) => s.discography.filter((t) => t.seasonal === 'holiday').length);
  const yw = yearWeek(week);
  const year = careerYear(week);
  const trophies = awardHistory.filter((a) => a.won);
  const myNoms = awards?.nominations.filter((n) => n.nominees.some((x) => x.isPlayer)) ?? [];

  return (
    <Screen scroll tint={'#FF8A3D'}>
      <ScreenHeader
        eyebrow={`THE MUSIC YEAR · YEAR ${year}`}
        title={`Week ${yw} of ${WEEKS_PER_YEAR}`}
        subtitle="Every year has the same big nights. Plan for them."
        accent={'#FF8A3D'}
        right={<Orb3D size={52} color={'#FF8A3D'} icon="today" />}
      />

      <Grid columns={6} gap={6}>
        {Array.from({ length: WEEKS_PER_YEAR }, (_, k) => k + 1).map((w) => {
          const mark = MARKS[w] ?? (w > CALENDAR.holidayStart ? { icon: 'snow', label: '', color: COLORS.accent } : null);
          const now = w === yw;
          const past = w < yw;
          return (
            <View
              key={w}
              style={[
                styles.cell,
                mark && { backgroundColor: withAlpha(mark.color, past ? 0.06 : 0.14) },
                now && styles.cellNow,
              ]}
            >
              <Text variant="label" color={now ? COLORS.text : past ? COLORS.textDisabled : COLORS.textMuted}>
                {w}
              </Text>
              {mark ? <Ionicons name={mark.icon as Glyph} size={14} color={past ? COLORS.textDisabled : mark.color} /> : <View style={styles.iconSpace} />}
              <Text variant="label" color={past ? COLORS.textDisabled : COLORS.textSecondary} numberOfLines={1} style={styles.cellLabel}>
                {mark?.label ?? ''}
              </Text>
            </View>
          );
        })}
      </Grid>

      <RuleLabel color={'#FF8A3D'}>THIS YEAR</RuleLabel>
      <ListGroup>
        <PressableScale onPress={() => router.push('/lineup-modal')} style={styles.row}>
          <Ionicons name="sunny" size={18} color={'#FF8A3D'} />
          <Text variant="body" style={styles.flex}>
            {festival && festival.year === year ? festival.name : 'Festival'}
          </Text>
          <Text variant="caption" muted>
            {!festival || festival.year !== year
              ? `Lineup in week ${CALENDAR.lineup}`
              : !festival.slot
                ? 'Not on the poster'
                : festival.played
                  ? `Played · ${festival.score}/100`
                  : festival.accepted === null
                    ? `${slotLabel(festival.slot)} · answer`
                    : festival.accepted
                      ? `${slotLabel(festival.slot)} · week ${festival.week}`
                      : 'Passed'}
          </Text>
        </PressableScale>
        <PressableScale onPress={() => router.push('/awards-modal')} style={styles.row}>
          <Ionicons name="trophy" size={18} color={COLORS.gold} />
          <Text variant="body" style={styles.flex}>
            The Meridians
          </Text>
          <Text variant="caption" muted>
            {!awards || awards.year !== year
              ? `Nominations in week ${CALENDAR.nominations}`
              : awards.resolved
                ? `${(awards.results ?? []).filter((r) => r.playerWon).length} won`
                : myNoms.length > 0
                  ? `${myNoms.length} nomination${myNoms.length === 1 ? '' : 's'}`
                  : 'Not nominated'}
          </Text>
        </PressableScale>
        <View style={styles.row}>
          <Ionicons name="snow" size={18} color={COLORS.accent} />
          <Text variant="body" style={styles.flex}>
            Holiday songs
          </Text>
          <Text variant="caption" muted>
            {holidaySongs > 0 ? `${holidaySongs} in rotation every December` : 'None yet'}
          </Text>
        </View>
      </ListGroup>

      {trophies.length > 0 ? (
        <>
          <RuleLabel color={COLORS.gold}>{`TROPHIES · ${trophies.length}`}</RuleLabel>
          {trophies.map((t, i) => (
            <View key={`${t.year}-${t.category}-${i}`} style={styles.row}>
              <Ionicons name="trophy" size={16} color={COLORS.gold} />
              <Text variant="body" style={styles.flex}>
                {t.label}
              </Text>
              <Text variant="caption" muted>
                {`Year ${t.year}${t.work ? ` · "${t.work}"` : ''}`}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      {festivalHistory.length > 0 ? (
        <>
          <RuleLabel color={'#FF8A3D'}>FESTIVALS</RuleLabel>
          {festivalHistory.map((f) => (
            <View key={`${f.year}-${f.name}`} style={styles.row}>
              <Ionicons name="sunny" size={16} color={'#FF8A3D'} />
              <Text variant="body" style={styles.flex}>
                {`${f.name} · ${slotLabel(f.slot)}`}
              </Text>
              <Text variant="caption" muted>
                {`Year ${f.year} · ${f.score}/100`}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      {wrappedHistory.length > 0 ? (
        <>
          <RuleLabel color={COLORS.secondary}>WRAPPED</RuleLabel>
          {wrappedHistory.map((w) => (
            <Card key={w.year} accent={COLORS.secondary} onPress={() => router.push({ pathname: '/wrapped-modal', params: { year: String(w.year) } })}>
              <View style={styles.rowTight}>
                <Text variant="subheading" style={styles.flex}>
                  {`Year ${w.year}`}
                </Text>
                <Text variant="caption" muted>
                  {`${formatStreams(w.streams)} streams${w.topSong ? ` · "${w.topSong.title}"` : ''}`}
                </Text>
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cell: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  cellNow: { borderColor: COLORS.text, borderWidth: 1.5 },
  cellLabel: { fontSize: 8 },
  iconSpace: { height: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm + 2 },
  rowTight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
});
