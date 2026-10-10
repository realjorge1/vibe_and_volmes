import { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useSocialStore } from '../../store/socialStore';
import { useAudioStore } from '../../store/audioStore';
import { useProgressionStore } from '../../store/progressionStore';
import {
  produceAndRelease,
  releaseStatDeltas,
} from '../../systems/songs/songEngine';
import { refreshSocial } from '../../systems/weekEngine';
import { awardReleaseXp } from '../../systems/progression/xpEngine';
import { releaseOutlook } from '../../systems/music/releaseCurve';
import { afterRelease, releaseBoost, stampTrack } from '../../systems/music/releaseHooks';
import { notifyRelease } from '../../systems/notifications/triggers';
import { exportSong } from '../../audio/export/exporter';
import type { ProducedSong, Lyrics } from '../../types/audio';
import type { ReleaseResult } from '../../types/music';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Typography';
import { StepHeader } from '../../components/audio/StepHeader';
import { ScoreCard } from '../../components/audio/ScoreCard';
import { ChartBreakdown } from '../../components/music/ChartBreakdown';
import { CoverArt, CoverArtPicker } from '../../components/audio/CoverArt';
import { formatStreams } from '../../utils/statHelpers';
import { ordinal } from '../../utils/formatters';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

const ENERGY_COST = 25;

interface Released {
  song: ProducedSong;
  release: ReleaseResult;
  lyrics: Lyrics | null;
}

export default function FinalizeStep() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const draft = useAudioStore((s) => s.draft);
  const setTitle = useAudioStore((s) => s.setTitle);
  const setCover = useAudioStore((s) => s.setCover);

  const [busy, setBusy] = useState(false);
  const [released, setReleased] = useState<Released | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  if (!player) return null;

  if (!draft && !released) {
    return (
      <Screen>
        <Text variant="body" muted>
          No draft in progress.
        </Text>
      </Screen>
    );
  }

  const collabCost = draft?.collaborators.reduce((s, c) => s + c.cost, 0) ?? 0;
  const spend = (draft?.marketingBudget ?? 0) + collabCost;
  const canAfford = player.money >= spend;
  const hasEnergy = player.stats.energy >= ENERGY_COST;
  const canRelease = hasEnergy && canAfford;

  const release = () => {
    if (!draft || busy || !canRelease) return;
    setBusy(true);

    const lyrics = draft.lyrics;
    // Who the artist is right now (traits, era, a comeback's hype) shapes it.
    const produced = produceAndRelease(player, week, draft, releaseBoost());
    const { song, reactions } = produced;
    // ...and who owns it is stamped on it (masters), plus the story stamps.
    const result = { ...produced.release, track: stampTrack(produced.release.track) };

    const music = useMusicStore.getState();
    const ps = usePlayerStore.getState();
    const audio = useAudioStore.getState();

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
    ps.updateStats(releaseStatDeltas(result, ENERGY_COST));
    if (spend > 0) ps.addMoney(-spend); // pay features + marketing
    audio.commitSong(song); // consumes the draft + persists

    // Shipping a record is a real progression beat.
    awardReleaseXp(result.reception);
    // The label's quota, the era, the comeback, the wants it fulfils.
    afterRelease(result);

    // The world reacts immediately to what was actually made.
    refreshSocial(reactions, []);
    // ...and the artist's phone starts lighting up.
    notifyRelease(result.track.id);

    ps.save();
    music.save();
    useSocialStore.getState().save();
    useGameStore.getState().saveGameState();
    useProgressionStore.getState().save();

    setReleased({ song, release: result, lyrics });
    setBusy(false);
  };

  const doExport = async () => {
    if (!released) return;
    setExportMsg('Exporting…');
    const res = await exportSong(released.song, released.lyrics, { share: true });
    if (res.ok && res.path) {
      useAudioStore.getState().markExported(released.song.id, res.path);
      setExportMsg(
        res.shared ? 'Exported & shared.' : 'Saved to your device storage.'
      );
    } else {
      setExportMsg(res.error ?? 'Export failed.');
    }
  };

  // ─── Released view ───
  if (released) {
    const { song, release: r } = released;
    return (
      <Screen scroll>
        <Text variant="title" style={styles.dropTitle}>
          It&apos;s out.
        </Text>
        <Card accent={COLORS.gold}>
          <View style={styles.releaseHead}>
            <CoverArt coverArtId={song.coverArtId} title={song.title} size={72} />
            <View style={styles.releaseMeta}>
              <Text variant="heading">&quot;{song.title}&quot;</Text>
              <Text variant="caption" muted>
                {song.beatTitle} · {song.emotionalTone}
              </Text>
              <Text
                variant="subheading"
                color={COLORS.primary}
                style={styles.reception}
              >
                {r.reception.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text variant="body" muted style={styles.msg}>
            {r.message}
          </Text>
          <View style={styles.stats}>
            <Stat label="Critics" value={`${r.criticsScore}`} />
            <Stat label="First week" value={formatStreams(r.streamCount)} />
            <Stat
              label="Debut"
              value={r.chartPosition ? ordinal(r.chartPosition) : 'Uncharted'}
            />
            <Stat label="New Fans" value={formatStreams(r.fansGained)} />
          </View>
          {releaseOutlook(r.track) ? (
            <Text variant="caption" muted style={styles.outlook}>
              {releaseOutlook(r.track)}
            </Text>
          ) : null}
        </Card>

        <ScoreCard score={song.score} />

        {r.chartFactors ? (
          <ChartBreakdown factors={r.chartFactors} score={r.chartScore} />
        ) : null}

        <Card>
          <Text variant="subheading">Keep it forever</Text>
          <Text variant="caption" muted style={styles.exportSub}>
            Export the take + song data to your device. The beat stays in-game;
            play your vocal anywhere.
          </Text>
          <Button
            label={song.exported ? 'Re-export' : 'Export song'}
            onPress={doExport}
            variant="secondary"
            style={styles.exportBtn}
          />
          {exportMsg ? (
            <Text variant="caption" muted style={styles.exportMsg}>
              {exportMsg}
            </Text>
          ) : null}
        </Card>

        <Button
          label="Back to the studio"
          onPress={() => router.replace('/(game)/studio')}
          fullWidth
          style={styles.done}
        />
      </Screen>
    );
  }

  // ─── Finalize form ───
  return (
    <Screen scroll>
      <StepHeader
        step="finalize"
        title="Name it & drop it"
        subtitle="Last step. Title, cover, release into the world."
        onBack={() => router.back()}
      />

      <Text variant="label" muted style={styles.section}>
        TITLE
      </Text>
      <TextInput
        value={draft?.title ?? ''}
        onChangeText={setTitle}
        placeholder="Song title"
        placeholderTextColor={COLORS.textMuted}
        style={styles.input}
        maxLength={40}
      />

      <View style={styles.preview}>
        <CoverArt
          coverArtId={draft?.coverArtId ?? null}
          title={draft?.title || 'Untitled'}
          size={88}
        />
        <View style={styles.previewMeta}>
          <Text variant="heading">{draft?.title || 'Untitled'}</Text>
          <Text variant="caption" muted>
            {player.artistName}
          </Text>
        </View>
      </View>

      <Text variant="label" muted style={styles.section}>
        COVER
      </Text>
      <CoverArtPicker
        selected={draft?.coverArtId ?? null}
        title={draft?.title || 'Untitled'}
        onSelect={setCover}
      />

      {draft &&
      (draft.collaborators.length > 0 ||
        draft.marketingBudget > 0 ||
        draft.rollout !== 'standard') ? (
        <Card>
          <Text variant="label" muted>
            RELEASE PLAN
          </Text>
          {draft.collaborators.length > 0 ? (
            <Text variant="caption" muted style={styles.planLine}>
              feat. {draft.collaborators.map((c) => c.name).join(', ')}
            </Text>
          ) : null}
          <Text variant="caption" muted style={styles.planLine}>
            Rollout: {draft.rollout} · Marketing:{' '}
            ${draft.marketingBudget.toLocaleString('en-US')}
          </Text>
          <Text
            variant="caption"
            color={canAfford ? COLORS.textMuted : COLORS.negative}
            style={styles.planLine}
          >
            Total spend: ${spend.toLocaleString('en-US')}
          </Text>
        </Card>
      ) : null}

      <View style={styles.footer}>
        <Button
          label={
            !hasEnergy
              ? `Too drained (need ${ENERGY_COST} energy)`
              : !canAfford
                ? 'Not enough money for this plan'
                : 'Release song'
          }
          onPress={release}
          loading={busy}
          disabled={!canRelease || !(draft?.title ?? '').trim()}
          fullWidth
        />
        {!(draft?.title ?? '').trim() ? (
          <Text variant="caption" muted center style={styles.needTitle}>
            Give it a title first
          </Text>
        ) : null}
      </View>
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
  dropTitle: { marginVertical: SPACING.md },
  releaseHead: { flexDirection: 'row', gap: SPACING.base },
  releaseMeta: { flex: 1 },
  reception: { marginTop: SPACING.sm },
  msg: { marginTop: SPACING.base, lineHeight: 20 },
  outlook: { marginTop: SPACING.md, lineHeight: 18 },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xl,
    marginTop: SPACING.base,
  },
  exportSub: { marginTop: SPACING.xs, lineHeight: 18 },
  exportBtn: { marginTop: SPACING.md },
  exportMsg: { marginTop: SPACING.sm },
  done: { marginTop: SPACING.sm },
  section: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  input: {
    color: COLORS.text,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    marginTop: SPACING.lg,
  },
  previewMeta: { flex: 1 },
  footer: { paddingVertical: SPACING.xl },
  needTitle: { marginTop: SPACING.sm },
  planLine: { marginTop: SPACING.xs, lineHeight: 18 },
});
