import { useMemo, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Typography';
import { Orb3D } from '../components/fx/Orb3D';
import { GradientText } from '../components/fx/GradientText';
import { RingGauge } from '../components/fx/RingGauge';
import { COLORS, GRADIENTS, RADIUS, SPACING, ifAnimated, withAlpha } from '../constants/theme';
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
  const { width } = useWindowDimensions();
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
      <Screen scroll tint={COLORS.gold}>
        <Animated.View entering={ifAnimated(ZoomIn.springify().damping(14))} style={styles.center}>
          <Orb3D size={96} color={COLORS.gold} icon="infinite" />
          <Text variant="title" center style={styles.subtitle}>
            The mic goes quiet.
          </Text>
        </Animated.View>
        <Card accent={COLORS.gold}>
          <Text variant="label" muted>
            LEGACY MINTED
          </Text>
          <GradientText text={`+${result.legacyGained}`} size={44} colors={GRADIENTS.gold} style={styles.minted} />
          <Text variant="body" muted>
            Lifetime legacy: {result.lifetimeLegacy.toLocaleString('en-US')}.
          </Text>
          {unlocks > 0 && (
            <Text variant="body" color={COLORS.primary} style={styles.gap}>
              ✦ {unlocks} new inheritance{unlocks === 1 ? '' : 's'} unlocked for your next artist.
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
          icon="play"
          variant="brand"
          size="lg"
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
    <Screen scroll tint={COLORS.gold}>
      <Animated.View entering={ifAnimated(ZoomIn.springify().damping(13))} style={styles.center}>
        <Orb3D size={104} color={COLORS.gold} icon="trophy" />
      </Animated.View>

      <Animated.View entering={ifAnimated(FadeInDown.delay(150).springify().damping(15))} style={styles.ribbon}>
        <LinearGradient
          colors={GRADIENTS.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.ribbonRound]}
        />
        <LinearGradient
          colors={GRADIENTS.sheen}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.ribbonSheen}
        />
        <Text variant="label" color="#3A2600" center>
          {isNewRibbon ? '✦ NEW RIBBON ✦' : 'RIBBON'}
        </Text>
        <Text variant="title" color="#2A1A00" center style={styles.ribbonTitle}>
          {identity.title}
        </Text>
      </Animated.View>

      <Animated.View entering={ifAnimated(FadeInDown.delay(300).duration(500))}>
        <Text variant="label" muted center style={styles.subtitle}>
          {`${def.label.toUpperCase()} · AGE ${ending.age} · WEEK ${ending.week}`}
        </Text>
        <Text
          variant="title"
          center
          color={COLORS.gold}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.name, { maxWidth: width - 48 }]}
        >
          {player.artistName}
        </Text>
        <Text variant="body" center style={styles.line}>
          {fillFinalLine(def, player.artistName, ending.age)}
        </Text>
        <Text variant="caption" muted center style={styles.blurb}>
          {identity.blurb}
        </Text>
        <Text variant="caption" color={COLORS.primary} center style={styles.blurb}>
          {def.kind === 'died'
            ? `${player.artistName} lives on in the next world: their songs on the radio, their estate still releasing.`
            : `${player.artistName} lives on in the next world: still out there, still touring, remembered.`}
        </Text>
      </Animated.View>

      <Card accent={COLORS.gold}>
        <View style={styles.legacyRow}>
          <RingGauge progress={dossier.legacy.total / 1000} size={76} stroke={7} color={COLORS.gold}>
            <Text variant="subheading" color={COLORS.gold}>
              {dossier.legacy.total}
            </Text>
          </RingGauge>
          <View style={styles.flex}>
            <Text variant="label" muted>
              LEGACY
            </Text>
            <Text variant="heading" style={styles.legacy}>
              {TIER_LABEL[dossier.legacy.tier] ?? dossier.legacy.tier} · {dossier.legacy.total}/1000
            </Text>
          </View>
        </View>
        <View style={styles.statLines}>
          {card.statLines.map((l) => (
            <Text key={l} variant="caption" muted>
              {l}
            </Text>
          ))}
        </View>
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
                <Text variant="caption" weight={have ? 'semibold' : 'regular'} color={have ? COLORS.gold : COLORS.textMuted}>
                  {IDENTITY_TITLES[id].replace(/^The /, '')}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Button
        label="Share the story"
        icon="share-social"
        variant="outline"
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
          icon="people"
          variant="brand"
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
        icon="refresh"
        variant={children.length > 0 ? 'ghost' : 'brand'}
        onPress={() => finish()}
        style={styles.gap}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', marginTop: SPACING.lg },
  flex: { flex: 1 },
  ribbon: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.lg,
    overflow: 'hidden',
  },
  ribbonRound: { borderRadius: RADIUS.lg },
  ribbonSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  ribbonTitle: { marginTop: SPACING.xs },
  subtitle: { marginTop: SPACING.lg },
  minted: { marginVertical: SPACING.xs },
  name: {
    marginTop: SPACING.sm,
    alignSelf: 'center',
    fontSize: 28,
    lineHeight: 36,
  },
  line: { marginTop: SPACING.md, marginBottom: SPACING.sm },
  blurb: { marginBottom: SPACING.lg },
  legacyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base },
  legacy: { marginTop: SPACING.xs },
  statLines: { marginTop: SPACING.md, gap: 2 },
  ribbons: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs + 2, marginTop: SPACING.md },
  chip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipEarned: { borderColor: withAlpha(COLORS.gold, 0.5), backgroundColor: withAlpha(COLORS.gold, 0.08) },
  chipNow: { backgroundColor: withAlpha(COLORS.gold, 0.22) },
  gap: { marginTop: SPACING.sm },
  next: { marginTop: SPACING.lg },
});
