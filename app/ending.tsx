import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Typography';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { usePeopleStore } from '../store/peopleStore';
import { useMetaStore } from '../store/metaStore';
import { buildDossier, toStoryCard, shareStoryCard } from '../systems/legacy';
import { IDENTITY_TITLES } from '../systems/legacy/chronicleEngine';
import { endCareer, type EndCareerResult } from '../systems/legacy/endCareer';
import { getEnding } from '../data/life/endings';
import { fillFinalLine } from '../systems/life/endingEngine';
import { activePeople, childAge } from '../systems/life/peopleEngine';
import type { IdentityLabel } from '../types/legacy';

const TIER_LABEL: Record<string, string> = {
  immortal: 'Immortal',
  legend: 'Legend',
  icon: 'Icon',
  star: 'Star',
  respected: 'Respected',
  footnote: 'Footnote',
  forgotten: 'Forgotten',
};

/**
 * The end of a career, however it came: one screen that headlines the
 * identity the world remembers (the ribbon), how it ended, the legacy it
 * left, and what comes next — the story continues as one of the artist's
 * children, or a new life starts from nothing. Every path goes through the
 * dossier and retireCareer (systems/legacy/endCareer.ts).
 */
export default function Ending() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const ending = useGameStore((s) => s.ending);
  const people = usePeopleStore((s) => s.people);
  const earned = useMetaStore((s) => s.identitiesEarned);
  const [result, setResult] = useState<EndCareerResult | null>(null);

  // One snapshot: the career is over, nothing below changes it.
  const dossier = useMemo(() => (player && ending ? buildDossier(ending.week) : null), [player, ending]);

  // After the career is closed the stores are empty; show what it minted.
  if (result) {
    const unlocks = result.unlockedPerkIds.length + result.unlockedBloodlineIds.length;
    return (
      <Screen scroll>
        <Text variant="title" style={styles.subtitle}>
          The mic goes quiet.
        </Text>
        <Card>
          <Text variant="body">
            +{result.legacyGained} legacy minted. Lifetime legacy:{' '}
            {result.lifetimeLegacy.toLocaleString('en-US')}.
          </Text>
          {unlocks > 0 && (
            <Text variant="body" color={COLORS.primary} style={styles.gap}>
              {unlocks} new inheritance{unlocks === 1 ? '' : 's'} unlocked for your next artist.
            </Text>
          )}
          {result.heir && (
            <Text variant="body" color={COLORS.gold} style={styles.gap}>
              {result.heir.childName} {result.heir.surname} is ready to pick up where{' '}
              {result.dossier.artistName} left off.
            </Text>
          )}
        </Card>
        <Button
          label={result.heir ? `Begin as ${result.heir.childName}` : 'Begin a new life'}
          onPress={() => router.replace('/onboarding')}
          style={styles.gap}
        />
      </Screen>
    );
  }

  if (!player || !ending || !dossier) return <Redirect href="/" />;

  const def = getEnding(ending.id);
  const identity = dossier.identity;
  const isNewRibbon = !earned[identity.label];
  const children = activePeople(people).filter((p) => p.role === 'child');
  const card = toStoryCard({
    ...dossier,
    ending: {
      id: def.id,
      label: def.label,
      kind: def.kind,
      age: ending.age,
      finalLine: fillFinalLine(def, player.artistName, ending.age),
    },
  });

  const finish = (childId?: string) => setResult(endCareer(childId));

  return (
    <Screen scroll>
      <View style={styles.ribbon}>
        <Text variant="label" color={COLORS.bg} center>
          {isNewRibbon ? 'NEW RIBBON' : 'RIBBON'}
        </Text>
        <Text variant="title" color={COLORS.bg} center style={styles.ribbonTitle}>
          {identity.title}
        </Text>
      </View>

      <Text variant="label" muted center style={styles.subtitle}>
        {`${def.label.toUpperCase()} · AGE ${ending.age} · WEEK ${ending.week}`}
      </Text>
      <Text variant="heading" center style={styles.name}>
        {player.artistName}
      </Text>
      <Text variant="body" center style={styles.line}>
        {fillFinalLine(def, player.artistName, ending.age)}
      </Text>
      <Text variant="caption" muted center style={styles.blurb}>
        {identity.blurb}
      </Text>

      <Card accent={COLORS.gold}>
        <Text variant="label" muted>
          LEGACY
        </Text>
        <Text variant="heading" style={styles.legacy}>
          {TIER_LABEL[dossier.legacy.tier] ?? dossier.legacy.tier} · {dossier.legacy.total}/1000
        </Text>
        {card.statLines.map((l) => (
          <Text key={l} variant="caption" muted>
            {l}
          </Text>
        ))}
      </Card>

      <Card>
        <Text variant="label" muted>
          RIBBONS ·{' '}
          {Object.keys({ ...earned, [identity.label]: 1 }).length}/
          {Object.keys(IDENTITY_TITLES).length}
        </Text>
        <View style={styles.ribbons}>
          {(Object.keys(IDENTITY_TITLES) as IdentityLabel[]).map((id) => {
            const have = id === identity.label || (earned[id] ?? 0) > 0;
            return (
              <View
                key={id}
                style={[styles.chip, have && styles.chipEarned, id === identity.label && styles.chipNow]}
              >
                <Text variant="caption" color={have ? COLORS.text : COLORS.textMuted}>
                  {IDENTITY_TITLES[id].replace(/^The /, '')}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Button
        label="Share the story"
        variant="ghost"
        onPress={() => shareStoryCard(card)}
        style={styles.gap}
      />

      <Text variant="heading" style={styles.next}>
        What happens next
      </Text>
      {children.map((c) => (
        <Button
          key={c.id}
          label={`Continue as ${c.name} (${Math.max(18, childAge(c, ending.week))})`}
          onPress={() => finish(c.id)}
          style={styles.gap}
        />
      ))}
      {children.length > 0 && (
        <Text variant="caption" muted style={styles.gap}>
          Your child inherits part of the money, the family&apos;s rivals, and everyone&apos;s
          expectations.
        </Text>
      )}
      <Button
        label="Start a new life"
        variant={children.length > 0 ? 'ghost' : 'primary'}
        onPress={() => finish()}
        style={styles.gap}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ribbon: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.lg,
  },
  ribbonTitle: { marginTop: SPACING.xs },
  subtitle: { marginTop: SPACING.lg },
  name: { marginTop: SPACING.xs },
  line: { marginTop: SPACING.md, marginBottom: SPACING.sm },
  blurb: { marginBottom: SPACING.lg },
  legacy: { marginTop: SPACING.xs, marginBottom: SPACING.sm },
  ribbons: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipEarned: { borderColor: COLORS.gold },
  chipNow: { backgroundColor: COLORS.surface3 },
  gap: { marginTop: SPACING.sm },
  next: { marginTop: SPACING.lg },
});
