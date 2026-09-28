import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMusicStore } from '../../store/musicStore';
import { useGameStore } from '../../store/gameStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { usePlayerStore } from '../../store/playerStore';
import { useProgressionStore } from '../../store/progressionStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Text } from '../ui/Typography';
import { Metric } from '../ui/Metric';
import { TrackCard } from '../music/TrackCard';
import { getCultureBias } from '../../systems/culture/cultureEngine';
import {
  stageForProgress,
  nextStage,
  stageProgress,
} from '../../systems/career/careerStage';
import { computeLegacy, deriveIdentity } from '../../systems/legacy';
import { formatStreams } from '../../utils/statHelpers';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

function affinityColor(affinity: number): string {
  if (affinity >= 40) return COLORS.positive;
  if (affinity <= -40) return COLORS.negative;
  return COLORS.neutral;
}

/** Empire · Overview — career stage, era, legacy, discography, people, history. */
export function OverviewSection() {
  const router = useRouter();
  const discography = useMusicStore((s) => s.discography);
  const totalStreams = useMusicStore((s) => s.totalStreams);
  const historyLog = useGameStore((s) => s.historyLog);
  const knownArtists = useRelationshipStore((s) => s.knownArtists);
  const relationships = useRelationshipStore((s) => s.relationships);
  const fans = usePlayerStore((s) => s.player?.stats.fans ?? 0);
  const level = useProgressionStore((s) => s.level);
  const culture = getCultureBias();
  const legacy = computeLegacy();
  const identity = deriveIdentity();

  const stage = stageForProgress(level, fans);
  const next = nextStage(stage);
  const progress = stageProgress(level, fans);

  return (
    <View>
      <Card accent={COLORS.primary}>
        <Text variant="label" muted>
          CAREER STAGE
        </Text>
        <Text variant="title" style={styles.stageName}>
          {stage.label}
        </Text>
        <Text variant="caption" muted style={styles.section}>
          {stage.blurb}
        </Text>

        <View style={styles.stageBarTrack}>
          <View
            style={[
              styles.stageBarFill,
              { width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
        {next ? (
          <Text variant="caption" muted style={styles.stageNext}>
            Next: {next.label} — reach level {next.minLevel} ·{' '}
            {formatStreams(next.minFans)} fans
          </Text>
        ) : (
          <Text variant="caption" muted style={styles.stageNext}>
            You are at the top of the ladder.
          </Text>
        )}

        <Text variant="label" muted style={styles.section}>
          UNLOCKED
        </Text>
        <Text variant="caption" muted style={styles.unlockLine}>
          Venues · {stage.unlocks.venues}
        </Text>
        <Text variant="caption" muted style={styles.unlockLine}>
          Collabs ·{' '}
          {stage.unlocks.maxCollabFans === Number.POSITIVE_INFINITY
            ? 'any artist'
            : `up to ${formatStreams(stage.unlocks.maxCollabFans)} fans`}
        </Text>
        <Text variant="caption" muted style={styles.unlockLine}>
          Sponsorships · {stage.unlocks.sponsorships}
        </Text>
        <Text variant="caption" muted style={styles.unlockLine}>
          Media · {stage.unlocks.media}
        </Text>
      </Card>

      <Card>
        <Text variant="label" muted>
          THE ERA · {culture.eraLabel.toUpperCase()}
        </Text>
        <Text variant="body" style={styles.section}>
          Your sound is {culture.playerGenreTrend} (heat{' '}
          {culture.playerGenreHeat}/100).{' '}
          {culture.playerGenreFit >= 1.1
            ? 'The culture is on your side.'
            : culture.playerGenreFit <= 0.9
              ? 'You are working against the current.'
              : 'The culture is neutral on you.'}
        </Text>
      </Card>

      <Card>
        <View style={styles.dualRow}>
          <Metric
            label={`Legacy · ${legacy.tier}`}
            value={`${legacy.total}`}
            sub="/ 1000"
          />
          <Metric
            label="Total streams"
            value={totalStreams.toLocaleString('en-US')}
            align="right"
          />
        </View>
        <Text variant="caption" muted style={styles.section}>
          {identity.title} · {fans.toLocaleString('en-US')} fans
        </Text>
        <Button
          label="Open Chronicle"
          variant="outline"
          onPress={() => router.push('/chronicle-modal')}
        />
      </Card>

      <Text variant="heading" style={styles.section}>
        Discography
      </Text>
      {discography.length === 0 ? (
        <Text variant="body" muted>
          No releases yet.
        </Text>
      ) : (
        discography.map((t) => <TrackCard key={t.id} track={t} />)
      )}

      <Text variant="heading" style={styles.section}>
        Relationships
      </Text>
      {knownArtists.length === 0 ? (
        <Text variant="body" muted>
          You haven&apos;t crossed paths with anyone in the industry yet.
        </Text>
      ) : (
        knownArtists.map((a) => {
          const rel = relationships[a.id];
          return (
            <Card key={a.id}>
              <View style={styles.relRow}>
                <View style={styles.flex}>
                  <Text variant="subheading">{a.name}</Text>
                  <Text variant="caption" muted>
                    {a.genre} · {rel?.type ?? 'neutral'}
                  </Text>
                </View>
                <Text
                  variant="metric"
                  color={affinityColor(rel?.affinity ?? 0)}
                >
                  {rel?.affinity ?? 0}
                </Text>
              </View>
            </Card>
          );
        })
      )}

      <Text variant="heading" style={styles.section}>
        History
      </Text>
      {historyLog.length === 0 ? (
        <Text variant="body" muted>
          Your story hasn&apos;t started yet.
        </Text>
      ) : (
        <Card>
          {historyLog.slice(0, 20).map((e, i) => (
            <Text key={i} variant="caption" muted style={styles.logLine}>
              {e.flavorText}
            </Text>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: SPACING.lg, marginBottom: SPACING.md },
  stageName: { marginTop: SPACING.xs },
  relRow: { flexDirection: 'row', alignItems: 'center' },
  dualRow: { flexDirection: 'row', justifyContent: 'space-between' },
  flex: { flex: 1 },
  logLine: { marginBottom: SPACING.sm, lineHeight: 18 },
  stageBarTrack: {
    height: 4,
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  stageBarFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  stageNext: { marginTop: SPACING.sm },
  unlockLine: { marginTop: SPACING.xs, lineHeight: 18 },
});
