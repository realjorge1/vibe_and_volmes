import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useMetaStore } from '../store/metaStore';
import { useIdentityStore } from '../store/identityStore';
import { CHALLENGES, getChallenge } from '../data/meta/challenges';
import { getDream } from '../data/identity/dreams';
import { featuredChallenge, startRun } from '../systems/meta/challengeEngine';
import { IDENTITY_TITLES } from '../systems/legacy/chronicleEngine';
import { saveProgress } from '../systems/persistence';
import type { IdentityLabel } from '../types/legacy';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { RuleLabel } from '../components/ui/RuleLabel';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { Orb3D } from '../components/fx/Orb3D';
import { Tile3D } from '../components/fx/Tile3D';
import { formatFanCount } from '../utils/statHelpers';
import { COLORS, RADIUS, SPACING, withAlpha } from '../constants/theme';

/**
 * Everything that outlives a life: this week's challenge, the ribbons, the
 * dreams that came true, and the past lives still out there in the world.
 */
export default function LegacyModal() {
  const player = usePlayerStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const run = useIdentityStore((s) => s.challenge);
  const lifetimeLegacy = useMetaStore((s) => s.lifetimeLegacy);
  const earned = useMetaStore((s) => s.identitiesEarned);
  const pastLives = useMetaStore((s) => s.pastLives);
  const completed = useMetaStore((s) => s.challengesCompleted);
  const dreamsEarned = useMetaStore((s) => s.dreamsEarned);
  if (!player) return null;

  const featured = featuredChallenge();
  const current = run ? getChallenge(run.id) : undefined;
  const doneIds = new Set(completed.map((c) => c.id));

  const accept = (id: string) => {
    const def = getChallenge(id);
    if (!def) return;
    useIdentityStore.getState().setChallenge(startRun(def, week));
    saveProgress();
  };

  return (
    <Screen scroll tint={COLORS.gold}>
      <ScreenHeader
        eyebrow="LEGACY"
        title={`${lifetimeLegacy.toLocaleString('en-US')} legacy`}
        subtitle="What outlives a life: challenges, ribbons, dreams, and the artists you used to be."
        accent={COLORS.gold}
        right={<Orb3D size={52} color={COLORS.gold} icon="infinite" />}
      />

      {/* ─── Challenge ─── */}
      <RuleLabel color={featured.color}>THIS WEEK’S CHALLENGE</RuleLabel>
      <Card accent={featured.color}>
        <View style={styles.row}>
          <Tile3D icon={featured.icon} color={featured.color} size={46} />
          <View style={styles.flex}>
            <Text variant="heading">{featured.title}</Text>
            <Text variant="caption" muted style={styles.small}>
              {featured.blurb}
            </Text>
            <Text variant="label" color={COLORS.gold} style={styles.small}>
              {`+${featured.legacy} LIFETIME LEGACY${doneIds.has(featured.id) ? ' · DONE BEFORE' : ''}`}
            </Text>
          </View>
        </View>
        {run?.id === featured.id ? null : (
          <Button label={run ? 'Switch to this challenge' : 'Accept the challenge'} icon="flag" variant="gold" fullWidth onPress={() => accept(featured.id)} style={styles.gap} />
        )}
      </Card>

      {current && run ? (
        <Card accent={current.color}>
          <Text variant="label" color={current.color}>
            {run.completedWeek !== null ? 'COMPLETED' : 'IN PROGRESS'}
          </Text>
          <Text variant="subheading" style={styles.small}>
            {current.title}
          </Text>
          {current.steps.map((s, i) => (
            <View key={s.label} style={styles.stepRow}>
              <Ionicons name={run.done[i] ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={run.done[i] ? COLORS.positive : COLORS.textMuted} />
              <Text variant="caption" color={run.done[i] ? COLORS.text : COLORS.textSecondary}>
                {s.label}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <RuleLabel>{`ALL CHALLENGES · ${doneIds.size}/${CHALLENGES.length}`}</RuleLabel>
      <View style={styles.chips}>
        {CHALLENGES.map((c) => {
          const done = doneIds.has(c.id);
          return (
            <View key={c.id} style={[styles.chip, done && { borderColor: withAlpha(c.color, 0.6), backgroundColor: withAlpha(c.color, 0.12) }]}>
              <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={12} color={done ? c.color : COLORS.textMuted} />
              <Text variant="caption" color={done ? COLORS.text : COLORS.textMuted}>
                {c.title}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ─── Ribbons ─── */}
      <RuleLabel color={COLORS.gold}>{`RIBBONS · ${Object.keys(earned).length}/${Object.keys(IDENTITY_TITLES).length}`}</RuleLabel>
      <View style={styles.chips}>
        {(Object.keys(IDENTITY_TITLES) as IdentityLabel[]).map((id) => {
          const n = earned[id] ?? 0;
          return (
            <View key={id} style={[styles.chip, n > 0 && styles.ribbonOn]}>
              <Text variant="caption" weight={n > 0 ? 'semibold' : 'regular'} color={n > 0 ? COLORS.gold : COLORS.textMuted}>
                {`${IDENTITY_TITLES[id].replace(/^The /, '')}${n > 1 ? ` ×${n}` : ''}`}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ─── Dreams ─── */}
      {Object.keys(dreamsEarned).length > 0 ? (
        <>
          <RuleLabel color={COLORS.gold}>DREAMS THAT CAME TRUE</RuleLabel>
          <View style={styles.chips}>
            {Object.entries(dreamsEarned).map(([id, n]) => (
              <View key={id} style={[styles.chip, styles.ribbonOn]}>
                <Text variant="caption" color={COLORS.gold}>
                  {`${getDream(id)?.label ?? id}${(n ?? 0) > 1 ? ` ×${n}` : ''}`}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* ─── Past lives ─── */}
      <RuleLabel color={COLORS.primary}>{`PAST LIVES · ${pastLives.length}`}</RuleLabel>
      {pastLives.length === 0 ? (
        <Text variant="caption" muted center>
          When this life ends, this artist lives on in the next world: on the radio, in the comparisons, in the samples.
        </Text>
      ) : (
        pastLives.map((p) => (
          <Card key={p.id} accent={p.died ? COLORS.textMuted : COLORS.primary}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="subheading">{p.artistName}</Text>
                <Text variant="caption" muted style={styles.small}>
                  {`${p.identityTitle} · ${p.died ? `died at ${p.ageAtEnd}` : `retired at ${p.ageAtEnd}`} · peak ${formatFanCount(p.peakFans)} fans`}
                </Text>
                {p.hits.length > 0 ? (
                  <Text variant="caption" color={COLORS.textSecondary} style={styles.small}>
                    {p.hits.map((h) => `"${h.title}"${h.peak ? ` #${h.peak}` : ''}`).join(' · ')}
                  </Text>
                ) : null}
              </View>
              <Text variant="label" color={p.died ? COLORS.textMuted : COLORS.positive}>
                {p.died ? 'ESTATE' : 'STILL OUT THERE'}
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  small: { marginTop: 3, lineHeight: 17 },
  gap: { marginTop: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ribbonOn: { borderColor: withAlpha(COLORS.gold, 0.5), backgroundColor: withAlpha(COLORS.gold, 0.08) },
});
