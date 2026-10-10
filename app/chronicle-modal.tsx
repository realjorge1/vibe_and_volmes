import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Orb3D } from '../components/fx/Orb3D';
import { COLORS, SPACING } from '../constants/theme';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { enhanceDocumentary, enhanceBiography, enhanceTopMoments } from '../ai';
import {
  buildDossier,
  buildBiography,
  buildTopMoments,
  toStoryCard,
  shareStoryCard,
} from '../systems/legacy';
import { ageAtWeek } from '../systems/life/age';
import { saveProgress } from '../systems/persistence';
import { getCultureBias } from '../systems/culture/cultureEngine';
import { getSyncAdapter } from '../systems/sync';
import type { CommunityLegend } from '../types/sync';

export default function ChronicleModal() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);

  const [confirmRetire, setConfirmRetire] = useState(false);
  const [hof, setHof] = useState<CommunityLegend[]>([]);
  const week = useGameStore((s) => s.week);

  // Snapshot the dossier once on open (pure projection over current state).
  const dossier = useMemo(
    () => (player ? buildDossier(null) : null),
    [player]
  );
  const culture = useMemo(() => getCultureBias(), []);

  // Deterministic Chronicle articles (offline truth, projected from the dossier).
  const bio = useMemo(() => (dossier ? buildBiography(dossier) : null), [dossier]);
  const top = useMemo(() => (dossier ? buildTopMoments(dossier) : null), [dossier]);

  // AI decorator: optionally swap in richer prose. The deterministic text is
  // shown immediately and remains the truth; each only replaces its baseline
  // if a cloud model produced a fuller version of the same shape.
  const [doc, setDoc] = useState<string[] | null>(null);
  const [bioParas, setBioParas] = useState<string[] | null>(null);
  const [topParas, setTopParas] = useState<string[] | null>(null);
  useEffect(() => {
    if (!dossier || !bio || !top) return;
    let alive = true;
    enhanceDocumentary(dossier.documentary, week)
      .then((p) => alive && p !== dossier.documentary && setDoc(p))
      .catch(() => {});
    enhanceBiography(bio.paragraphs, week)
      .then((p) => alive && p !== bio.paragraphs && setBioParas(p))
      .catch(() => {});
    enhanceTopMoments(top.paragraphs, week)
      .then((p) => alive && p !== top.paragraphs && setTopParas(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [dossier, bio, top, week]);

  useEffect(() => {
    let alive = true;
    getSyncAdapter()
      .fetchHallOfFame(8)
      .then((l) => alive && setHof(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!player || !dossier) {
    return (
      <Screen>
        <Text variant="body" muted>
          No career to chronicle yet.
        </Text>
      </Screen>
    );
  }

  const L = dossier.legacy;
  const comp = (label: string, v: number, max: number) => (
    <View style={styles.compRow} key={label}>
      <Text variant="caption" muted style={styles.compLabel}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.min(100, (v / max) * 100)}%` },
          ]}
        />
      </View>
      <Text variant="caption" style={styles.compVal}>
        {v}
      </Text>
    </View>
  );

  return (
    <Screen scroll tint={COLORS.gold}>
      <ScreenHeader
        eyebrow="THE CHRONICLE"
        title={dossier.artistName}
        accent={COLORS.gold}
        right={<Orb3D size={52} color={COLORS.gold} icon="book" />}
      />
      <Text variant="caption" muted style={styles.meta}>
        {dossier.identity.title} · {dossier.identity.confidence}% certain
      </Text>

      <Card>
        <Text variant="label" muted>
          LEGACY · {L.tier.toUpperCase()}
        </Text>
        <Text variant="title" color={COLORS.accent}>
          {L.total} / 1000
        </Text>
        <View style={styles.gap}>
          {comp('Fame', L.fameComponent, 260)}
          {comp('Longevity', L.longevityComponent, 240)}
          {comp('Influence', L.influenceComponent, 220)}
          {comp('Artistry', L.artistryComponent, 160)}
          {comp('Notoriety', L.notorietyComponent, 120)}
        </View>
      </Card>

      <Card>
        <Text variant="label" muted>
          IDENTITY
        </Text>
        <Text variant="body" style={styles.gap}>
          {dossier.identity.blurb}
        </Text>
      </Card>

      <Card>
        <Text variant="label" muted>
          THE WORLD RIGHT NOW
        </Text>
        <Text variant="subheading" style={styles.gap}>
          {culture.eraLabel}
        </Text>
        <Text variant="caption" muted>
          Your {dossier.genre} · heat {culture.playerGenreHeat} ·{' '}
          {culture.playerGenreTrend} · {dossier.erasLived.length} era
          {dossier.erasLived.length === 1 ? '' : 's'} lived
        </Text>
      </Card>

      <Text variant="heading" style={styles.section}>
        Legendary Moments
      </Text>
      <Card>
        {dossier.moments.map((m) => (
          <View key={m.id} style={styles.momentRow}>
            <Text variant="caption" color={COLORS.accent} style={styles.wk}>
              W{m.week}
            </Text>
            <View style={styles.flex}>
              <Text variant="body">{m.headline}</Text>
              <Text variant="caption" muted>
                {m.detail}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <Text variant="heading" style={styles.section}>
        Top Moments
      </Text>
      <Card>
        {(topParas ?? top?.paragraphs ?? []).map((p, i) => (
          <View key={i} style={styles.momentRow}>
            <Text variant="caption" color={COLORS.accent} style={styles.wk}>
              #{i + 1}
            </Text>
            <Text variant="body" style={styles.flex}>
              {p}
            </Text>
          </View>
        ))}
      </Card>

      <Text variant="heading" style={styles.section}>
        Biography
      </Text>
      <Card>
        {(bioParas ?? bio?.paragraphs ?? []).map((p, i) => (
          <Text key={i} variant="body" style={styles.docPara}>
            {p}
          </Text>
        ))}
      </Card>

      <Text variant="heading" style={styles.section}>
        The Documentary
      </Text>
      <Card>
        {(doc ?? dossier.documentary).map((p, i) => (
          <Text key={i} variant="body" style={styles.docPara}>
            {p}
          </Text>
        ))}
      </Card>

      {hof.length > 0 && (
        <>
          <Text variant="heading" style={styles.section}>
            Hall of Fame
          </Text>
          <Card>
            {hof.map((h, i) => (
              <View key={h.id} style={styles.momentRow}>
                <Text variant="caption" color={COLORS.accent} style={styles.wk}>
                  #{i + 1}
                </Text>
                <View style={styles.flex}>
                  <Text variant="body">
                    {h.artistName}{' '}
                    {!h.seeded ? (
                      <Text variant="caption" color={COLORS.accent}>
                        (you)
                      </Text>
                    ) : null}
                  </Text>
                  <Text variant="caption" muted>
                    {h.identityTitle} · {h.legacyTotal} · {h.era}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      <Button
        label="Share career card"
        variant="ghost"
        onPress={() => shareStoryCard(toStoryCard(dossier))}
        style={styles.section}
      />

      {!confirmRetire ? (
        <Button
          label="Retire this artist"
          variant="ghost"
          onPress={() => setConfirmRetire(true)}
          style={styles.gap}
        />
      ) : (
        <Card>
          <Text variant="body">
            Retiring ends this career for good. Your legacy carries forward —
            this artist does not. Sure?
          </Text>
          <View style={styles.confirmRow}>
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => setConfirmRetire(false)}
              style={styles.flex}
            />
            <Button
              label="Retire"
              onPress={() => {
                // Retiring is an ending like any other: it goes through the
                // end screen (ribbon, story card, continue as your child).
                const p = usePlayerStore.getState().player;
                if (!p) return;
                useGameStore.getState().setEnding({
                  id: 'retirement',
                  week,
                  age: ageAtWeek(p.startAge, week),
                });
                saveProgress();
                router.replace('/ending');
              }}
              style={styles.flex}
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { marginBottom: SPACING.md },
  gap: { marginTop: SPACING.sm },
  section: { marginTop: SPACING.lg, marginBottom: SPACING.md },
  cta: { marginTop: SPACING.lg },
  compRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
  compLabel: { width: 78 },
  compVal: { width: 34, textAlign: 'right' },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surface3,
    borderRadius: 3,
    marginHorizontal: SPACING.sm,
    overflow: 'hidden',
  },
  barFill: { height: 6, backgroundColor: COLORS.accent, borderRadius: 3 },
  momentRow: { flexDirection: 'row', marginBottom: SPACING.md },
  wk: { width: 42 },
  flex: { flex: 1 },
  docPara: { marginBottom: SPACING.md, lineHeight: 21 },
  confirmRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
});
