import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReleaseResult } from '../../types/music';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useAudioStore } from '../../store/audioStore';
import { createTrack, simulateRelease } from '../../systems/music/musicEngine';
import { liveChartReads } from '../../systems/charts/chartContext';
import { awardReleaseXp } from '../../systems/progression/xpEngine';
import { useProgressionStore } from '../../store/progressionStore';
import { usePremiumStore } from '../../store/premiumStore';
import { getCosmetic } from '../../data/premium/catalog';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Typography';
import { CoverArt } from '../../components/audio/CoverArt';
import { formatStreams } from '../../utils/statHelpers';
import { ordinal } from '../../utils/formatters';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

const QUICK_ENERGY_COST = 25;

export default function Studio() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const discography = useMusicStore((s) => s.discography);
  const lastRelease = useMusicStore((s) => s.lastRelease);
  const producedSongs = useAudioStore((s) => s.producedSongs);
  const startDraft = useAudioStore((s) => s.startDraft);
  const activeTheme = usePremiumStore((s) => s.activeTheme);
  const [busy, setBusy] = useState(false);

  if (!player) return null;

  // Premium studio theme is a pure recolor of the studio accent — cosmetic only.
  const themeColor = getCosmetic(activeTheme ?? '')?.themeColor ?? COLORS.primary;
  const canQuick = player.stats.energy >= QUICK_ENERGY_COST;

  const createSong = () => {
    startDraft();
    router.push('/(create)/beat');
  };

  const quickDrop = () => {
    if (!canQuick || busy) return;
    setBusy(true);
    const track = createTrack(player, week);
    // Quick drop has no beat/marketing/collab, but still charts on the live
    // world factors (trend, label backing, reputation) — not streams alone.
    const reads = liveChartReads(player.stats);
    const result: ReleaseResult = simulateRelease(player, track, {
      chartFactors: {
        socialBuzz: 0,
        playlistSupport: 0,
        trendAlignment: reads.trendAlignment,
        labelBacking: reads.labelBacking,
        reputation: reads.reputation,
      },
    });

    const music = useMusicStore.getState();
    const ps = usePlayerStore.getState();
    music.addTrack(result.track);
    music.setLastRelease(result);
    if (result.chartPosition !== null) {
      music.addChartEntry({
        week,
        trackId: result.track.id,
        trackTitle: result.track.title,
        position: result.chartPosition,
        streams: result.streamCount,
      });
    }
    ps.updateStats([
      { stat: 'fans', delta: result.fansGained },
      { stat: 'energy', delta: -QUICK_ENERGY_COST },
      { stat: 'industryRespect', delta: result.reception === 'flop' ? -2 : 3 },
    ]);
    awardReleaseXp(result.reception);
    ps.save();
    music.save();
    useProgressionStore.getState().save();
    setBusy(false);
  };

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        The Studio
      </Text>

      <Card accent={themeColor}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="mic" size={26} color={themeColor} />
          </View>
          <View style={styles.flex}>
            <Text variant="subheading">Make a real song</Text>
            <Text variant="caption" muted style={styles.sub}>
              Pick a beat, write lyrics, record your vocals, mix it, and drop it
              into the world.
            </Text>
          </View>
        </View>
        <Button label="Start a song" onPress={createSong} style={styles.btn} />
      </Card>

      <Card>
        <Text variant="subheading">Quick drop a single</Text>
        <Text variant="caption" muted style={styles.sub}>
          Skip the booth — simulate a release straight from your stats. Costs{' '}
          {QUICK_ENERGY_COST} energy.
        </Text>
        <Button
          label={canQuick ? 'Quick drop' : 'Too drained (need energy)'}
          onPress={quickDrop}
          variant="outline"
          disabled={!canQuick}
          loading={busy}
          style={styles.btn}
        />
      </Card>

      {lastRelease && (
        <Card accent={COLORS.gold}>
          <Text variant="label" muted>
            LATEST RELEASE
          </Text>
          <Text variant="heading" style={styles.releaseTitle}>
            &quot;{lastRelease.track.title}&quot;
          </Text>
          <Text variant="subheading" color={COLORS.primary} style={styles.reception}>
            {lastRelease.reception.toUpperCase()}
          </Text>
          <Text variant="body" muted style={styles.msg}>
            {lastRelease.message}
          </Text>
          <View style={styles.stats}>
            <Stat label="Streams" value={formatStreams(lastRelease.streamCount)} />
            <Stat
              label="Peak"
              value={
                lastRelease.chartPosition
                  ? ordinal(lastRelease.chartPosition)
                  : 'Uncharted'
              }
            />
            <Stat label="New Fans" value={formatStreams(lastRelease.fansGained)} />
            <Stat label="Critics" value={`${lastRelease.criticsScore}`} />
          </View>
        </Card>
      )}

      {producedSongs.length > 0 && (
        <>
          <Text variant="label" muted style={styles.discTitle}>
            YOUR SONGS · {producedSongs.length}
          </Text>
          {producedSongs.map((s) => (
            <View key={s.id} style={styles.songRow}>
              <CoverArt coverArtId={s.coverArtId} title={s.title} size={52} />
              <View style={styles.songMeta}>
                <Text variant="subheading">{s.title}</Text>
                <Text variant="caption" muted>
                  Wk {s.releasedAtWeek} · {s.emotionalTone}
                  {s.exported ? ' · exported' : ''}
                </Text>
              </View>
              <View style={styles.songScore}>
                <Text variant="heading" color={COLORS.gold}>
                  {s.score.overall}
                </Text>
                <Text variant="label" muted>
                  {s.score.verdict}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      <Text variant="label" muted style={styles.discTitle}>
        DISCOGRAPHY · {discography.length}
      </Text>
      {discography.length === 0 && producedSongs.length === 0 && (
        <Text variant="body" muted>
          You haven&apos;t released anything yet. The world is waiting.
        </Text>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="label" muted>
        {label.toUpperCase()}
      </Text>
      <Text variant="subheading">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginVertical: SPACING.md },
  heroRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  sub: { marginTop: SPACING.xs, lineHeight: 18 },
  btn: { marginTop: SPACING.base },
  releaseTitle: { marginTop: SPACING.xs },
  reception: { marginTop: SPACING.sm },
  msg: { marginTop: SPACING.sm, lineHeight: 20 },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xl,
    marginTop: SPACING.base,
  },
  discTitle: { marginTop: SPACING.lg, marginBottom: SPACING.md },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  songMeta: { flex: 1 },
  songScore: { alignItems: 'flex-end' },
});
