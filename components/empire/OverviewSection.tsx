import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../../store/musicStore';
import { useGameStore } from '../../store/gameStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { usePlayerStore } from '../../store/playerStore';
import { useProgressionStore } from '../../store/progressionStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Text } from '../ui/Typography';
import { Metric } from '../ui/Metric';
import { StatBar } from '../ui/StatBar';
import { SectionTitle } from '../ui/SectionTitle';
import { ListGroup } from '../ui/ListGroup';
import { Grid } from '../ui/Grid';
import { TrackCard } from '../music/TrackCard';
import { DramaSection } from './DramaSection';
import { Orb3D } from '../fx/Orb3D';
import { Tile3D } from '../fx/Tile3D';
import { getCultureBias } from '../../systems/culture/cultureEngine';
import {
  stageForProgress,
  nextStage,
  stageProgress,
} from '../../systems/career/careerStage';
import { computeLegacy, deriveIdentity } from '../../systems/legacy';
import { formatStreams } from '../../utils/statHelpers';
import { COLORS, SPACING, shade, withAlpha } from '../../constants/theme';

function affinityColor(affinity: number): string {
  if (affinity >= 40) return COLORS.positive;
  if (affinity <= -40) return COLORS.negative;
  return COLORS.neutral;
}

function Unlock({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.unlock}>
      <Tile3D icon={icon} color={COLORS.primary} size={30} />
      <View style={styles.flex}>
        <Text variant="label" muted style={styles.unlockLabel}>
          {label.toUpperCase()}
        </Text>
        <Text variant="caption" style={styles.unlockValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
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
  const eraColor =
    culture.playerGenreFit >= 1.1 ? COLORS.positive : culture.playerGenreFit <= 0.9 ? COLORS.negative : COLORS.accent;

  return (
    <View>
      <Card accent={COLORS.primary}>
        <View style={styles.stageRow}>
          <View style={styles.flex}>
            <Text variant="label" muted>
              CAREER STAGE
            </Text>
            <Text variant="title" style={styles.stageName}>
              {stage.label}
            </Text>
            <Text variant="caption" muted style={styles.blurb}>
              {stage.blurb}
            </Text>
          </View>
          <Orb3D size={54} color={COLORS.primary} icon="rocket" />
        </View>

        <View style={styles.stageBar}>
          <StatBar
            label={
              next
                ? `Next: ${next.label} — level ${next.minLevel} · ${formatStreams(next.minFans)} fans`
                : 'You are at the top of the ladder.'
            }
            value={progress * 100}
            showValue={false}
            color={COLORS.primary}
          />
        </View>

        <Grid columns={2} gap={SPACING.md} style={styles.unlocks}>
          <Unlock icon="location" label="Venues" value={stage.unlocks.venues} />
          <Unlock
            icon="people"
            label="Collabs"
            value={
              stage.unlocks.maxCollabFans === Number.POSITIVE_INFINITY
                ? 'Any artist'
                : `Up to ${formatStreams(stage.unlocks.maxCollabFans)} fans`
            }
          />
          <Unlock icon="pricetag" label="Sponsors" value={stage.unlocks.sponsorships} />
          <Unlock icon="radio" label="Media" value={stage.unlocks.media} />
        </Grid>
      </Card>

      <View style={styles.era}>
        <View style={styles.eraHead}>
          <Ionicons name="pulse" size={16} color={eraColor} />
          <Text variant="label" color={eraColor}>
            THE ERA · {culture.eraLabel.toUpperCase()}
          </Text>
        </View>
        <Text variant="body" style={styles.eraBody}>
          Your sound is {culture.playerGenreTrend} (heat{' '}
          {culture.playerGenreHeat}/100).{' '}
          {culture.playerGenreFit >= 1.1
            ? 'The culture is on your side.'
            : culture.playerGenreFit <= 0.9
              ? 'You are working against the current.'
              : 'The culture is neutral on you.'}
        </Text>
        <StatBar label="Genre heat" value={culture.playerGenreHeat} color={eraColor} />
      </View>

      <Card accent={COLORS.gold}>
        <View style={styles.dualRow}>
          <Metric
            label={`Legacy · ${legacy.tier}`}
            value={`${legacy.total}`}
            sub="/ 1000"
            color={COLORS.gold}
          />
          <Metric
            label="Total streams"
            value={formatStreams(totalStreams)}
            sub={totalStreams.toLocaleString('en-US')}
            align="right"
          />
        </View>
        <Text variant="caption" muted style={styles.identity}>
          {identity.title} · {fans.toLocaleString('en-US')} fans
        </Text>
        <Button
          label="Open Chronicle"
          icon="book"
          variant="outline"
          onPress={() => router.push('/chronicle-modal')}
        />
      </Card>

      <SectionTitle accent={COLORS.secondary} meta={`${discography.length}`}>
        Discography
      </SectionTitle>
      {discography.length === 0 ? (
        <Text variant="body" muted>
          No releases yet.
        </Text>
      ) : (
        <ListGroup>
          {discography.map((t) => (
            <TrackCard key={t.id} track={t} />
          ))}
        </ListGroup>
      )}

      <DramaSection />

      <SectionTitle accent={COLORS.accent} meta={`${knownArtists.length}`}>
        Relationships
      </SectionTitle>
      {knownArtists.length === 0 ? (
        <Text variant="body" muted>
          You haven&apos;t crossed paths with anyone in the industry yet.
        </Text>
      ) : (
        <ListGroup>
          {knownArtists.map((a) => {
            const rel = relationships[a.id];
            const aff = rel?.affinity ?? 0;
            const c = affinityColor(aff);
            return (
              <View key={a.id} style={styles.relRow}>
                <View style={[styles.relAvatar, { backgroundColor: withAlpha(c, 0.18), borderColor: withAlpha(c, 0.5) }]}>
                  <Text variant="subheading" color={shade(c, 0.3)} weight="bold">
                    {a.name.trim()[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text variant="subheading">{a.name}</Text>
                  <Text variant="caption" muted>
                    {a.genre} · {rel?.type ?? 'neutral'}
                  </Text>
                </View>
                <Text variant="metric" color={c} style={styles.affinity}>
                  {aff > 0 ? `+${aff}` : aff}
                </Text>
              </View>
            );
          })}
        </ListGroup>
      )}

      <SectionTitle accent={COLORS.textSecondary}>History</SectionTitle>
      {historyLog.length === 0 ? (
        <Text variant="body" muted>
          Your story hasn&apos;t started yet.
        </Text>
      ) : (
        <View>
          {historyLog.slice(0, 20).map((e, i) => (
            <View key={i} style={styles.logRow}>
              <View style={styles.logDot} />
              <Text variant="caption" muted style={styles.logLine}>
                {e.flavorText}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  stageName: { marginTop: SPACING.xs },
  blurb: { marginTop: SPACING.xs },
  stageBar: { marginTop: SPACING.base, marginBottom: -SPACING.xs },
  unlocks: { marginTop: SPACING.md },
  unlock: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
  unlockLabel: { fontSize: 9 },
  unlockValue: { lineHeight: 16, fontSize: 12 },
  era: { paddingVertical: SPACING.md, marginBottom: SPACING.sm },
  eraHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eraBody: { marginTop: SPACING.sm, marginBottom: SPACING.md },
  dualRow: { flexDirection: 'row', justifyContent: 'space-between' },
  identity: { marginTop: SPACING.md, marginBottom: SPACING.md },
  relRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  relAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affinity: { fontSize: 17 },
  logRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  logDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7, backgroundColor: COLORS.primary },
  logLine: { flex: 1, lineHeight: 18 },
});
