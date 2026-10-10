import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ChartRow } from '../types/calendar';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useMusicStore } from '../store/musicStore';
import { useCalendarStore } from '../store/calendarStore';
import { useLabelStore } from '../store/labelStore';
import { hottestRival } from '../systems/drama/publish';
import { saveProgress } from '../systems/persistence';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { RuleLabel } from '../components/ui/RuleLabel';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { Orb3D } from '../components/fx/Orb3D';
import { formatStreams } from '../utils/statHelpers';
import { COLORS, GRADIENTS, RADIUS, SPACING, withAlpha } from '../constants/theme';

function movement(row: { pos: number; lastPos: number | null }): { text: string; color: string } {
  if (row.lastPos === null) return { text: 'NEW', color: COLORS.accent };
  const d = row.lastPos - row.pos;
  if (d > 0) return { text: `▲${d}`, color: COLORS.positive };
  if (d < 0) return { text: `▼${-d}`, color: COLORS.negative };
  return { text: '=', color: COLORS.textMuted };
}

/**
 * The chart: the artist's songs among the world's. On chart day the
 * artist's positions start face down — tap to see where they landed.
 */
export default function ChartModal() {
  const player = usePlayerStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const chart = useCalendarStore((s) => s.chart);
  const chartDay = useCalendarStore((s) => s.chartDay);
  const history = useMusicStore((s) => s.chartHistory);
  const contract = useLabelStore((s) => s.contract);
  const pendingReveal = !!chartDay && !chartDay.seen && chartDay.week === week;
  const [revealed, setRevealed] = useState(!pendingReveal);
  if (!player) return null;

  const mine = history
    .filter((e) => e.week === week)
    .sort((a, b) => a.position - b.position)
    .filter((e, i, all) => all.findIndex((x) => x.trackId === e.trackId) === i);
  const lastPos = (trackId: string) => history.find((e) => e.week === week - 1 && e.trackId === trackId)?.position ?? null;
  const rival = hottestRival();
  const rivalRow = chart?.rows.find((r) => r.isRival) ?? null;
  const best = mine[0];

  const reveal = () => {
    setRevealed(true);
    useCalendarStore.getState().markChartDaySeen();
    saveProgress();
  };

  const verdict = (() => {
    if (!best) return null;
    const last = lastPos(best.trackId);
    if (best.position === 1) return 'NUMBER ONE.';
    if (best.position <= 10 && (last === null || last > 10)) return 'Top ten.';
    if (last !== null && last - best.position >= 5) return 'Climbing.';
    if (last !== null && best.position - last >= 8) return 'Sliding.';
    return 'Holding.';
  })();

  return (
    <Screen scroll tint={COLORS.accent}>
      <ScreenHeader
        eyebrow={`THE CHART · WEEK ${week}`}
        title={pendingReveal && !revealed ? 'Chart day' : 'The Hot 50'}
        subtitle="Your songs against everyone else’s."
        accent={COLORS.accent}
        right={<Orb3D size={52} color={COLORS.accent} icon="stats-chart" />}
      />

      {mine.length > 0 ? (
        <>
          <RuleLabel color={COLORS.primary}>YOUR SONGS THIS WEEK</RuleLabel>
          {mine.map((e) => {
            const last = lastPos(e.trackId);
            const m = movement({ pos: e.position, lastPos: last });
            return (
              <Card key={e.trackId} accent={COLORS.primary}>
                <View style={styles.row}>
                  <View style={styles.posBox}>
                    {revealed ? (
                      <Text variant="display" style={styles.pos}>
                        {`#${e.position}`}
                      </Text>
                    ) : (
                      <Ionicons name="help" size={30} color={COLORS.textMuted} />
                    )}
                  </View>
                  <View style={styles.flex}>
                    <Text variant="subheading" numberOfLines={1}>
                      {e.trackTitle}
                    </Text>
                    {revealed ? (
                      <Text variant="caption" color={m.color} style={styles.small}>
                        {`${m.text === 'NEW' ? 'New entry' : m.text === '=' ? 'Same spot' : m.text} · ${formatStreams(e.streams)} streams`}
                      </Text>
                    ) : (
                      <Text variant="caption" muted style={styles.small}>
                        {last !== null ? `Last week: #${last}` : 'First week on the chart'}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            );
          })}
          {!revealed ? (
            <Button label="Reveal" icon="eye" variant="brand" size="lg" onPress={reveal} fullWidth />
          ) : verdict ? (
            <View style={styles.verdict}>
              <LinearGradient
                colors={best && best.position === 1 ? GRADIENTS.gold : [withAlpha(COLORS.primary, 0.25), 'rgba(255,255,255,0.02)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text variant="title" center color={best && best.position === 1 ? '#2A1A00' : COLORS.text}>
                {verdict}
              </Text>
              {rival && rivalRow ? (
                <Text variant="caption" center color={best && best.position === 1 ? '#3A2600' : COLORS.textSecondary} style={styles.small}>
                  {best && best.position < rivalRow.pos
                    ? `${rival.name} sits at #${rivalRow.pos}. You're ahead.`
                    : `${rival.name} sits at #${rivalRow.pos}. They're ahead. For now.`}
                </Text>
              ) : null}
              {best && best.position <= 10 && contract ? (
                <Text variant="caption" center color={best.position === 1 ? '#3A2600' : COLORS.textSecondary} style={styles.small}>
                  Your label: “call me.”
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <Text variant="caption" muted center style={styles.small}>
          Nothing of yours is charting this week.
        </Text>
      )}

      {revealed ? (
        <>
          <RuleLabel>THE HOT 50</RuleLabel>
          {!chart ? (
            <Text variant="caption" muted center>
              The chart turns over when the week does.
            </Text>
          ) : (
            <View style={styles.board}>
              {chart.rows.map((r) => (
                <BoardRow key={`${r.pos}-${r.title}`} row={r} />
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function BoardRow({ row }: { row: ChartRow }) {
  const m = movement(row);
  const tint = row.isPlayer ? COLORS.primary : row.isRival ? COLORS.negative : null;
  return (
    <View style={[styles.boardRow, tint ? { backgroundColor: withAlpha(tint, 0.14), borderColor: withAlpha(tint, 0.4) } : null]}>
      <Text variant="subheading" style={styles.boardPos}>
        {row.pos}
      </Text>
      <Text variant="label" color={m.color} style={styles.boardMove}>
        {m.text}
      </Text>
      <View style={styles.flex}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {row.title}
        </Text>
        <Text variant="caption" color={tint ?? COLORS.textMuted} numberOfLines={1}>
          {row.isRival ? `${row.artist} · your rival` : row.artist}
        </Text>
      </View>
      <Text variant="caption" muted>
        {`${row.weeksOn} wk`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  small: { marginTop: 4, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base },
  posBox: { width: 72, alignItems: 'center', justifyContent: 'center' },
  pos: { fontSize: 30, lineHeight: 36 },
  verdict: {
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  board: { gap: 4 },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 7,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm + 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  boardPos: { width: 28, textAlign: 'center' },
  boardMove: { width: 34, fontSize: 9.5 },
});
