import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useLegalStore } from '../store/legalStore';
import { useActivityStore } from '../store/activityStore';
import { ESCAPE_STEPS, escapeOdds } from '../systems/legal/legalEngine';
import { attemptEscape, type EscapeOutcome } from '../systems/legal/legalTick';
import { spendEnergy } from '../systems/live/energySystem';
import { getLifeActivity } from '../data/life/lifeActions';
import { saveProgress } from '../systems/persistence';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { Orb3D } from '../components/fx/Orb3D';
import { COLORS, SPACING } from '../constants/theme';

const ESCAPE_ID = 'jail-escape';

/**
 * The escape. Three moves, picked one at a time; every one has to work, and
 * each leans on a different stat. Made it: a fugitive. Didn't: more time.
 */
export default function EscapeModal() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const legalCase = useLegalStore((s) => s.activeCase);
  const [picks, setPicks] = useState<string[]>([]);
  const [result, setResult] = useState<EscapeOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!player) return null;

  if (!legalCase || legalCase.stage !== 'jailed') {
    if (!result) {
      return (
        <Screen scroll tint={COLORS.negative}>
          <ScreenHeader eyebrow="THE ESCAPE" title="Nothing to escape" accent={COLORS.negative} right={<Orb3D size={52} color={COLORS.negative} icon="exit" />} />
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </Screen>
      );
    }
  }

  const step = ESCAPE_STEPS[picks.length];

  const choose = (id: string) => {
    const next = [...picks, id];
    if (next.length < ESCAPE_STEPS.length) {
      setPicks(next);
      return;
    }
    // Committing to the plan costs the energy and the activity slot.
    const activity = getLifeActivity(ESCAPE_ID);
    if (!activity || !spendEnergy(activity.energyCost)) {
      setError('You are too exhausted to try tonight.');
      return;
    }
    useActivityStore.getState().record({ activityId: ESCAPE_ID, week, earned: 0, reaction: 'none' });
    const outcome = attemptEscape(next);
    setPicks(next);
    setResult(outcome);
    saveProgress();
  };

  if (result) {
    return (
      <Screen scroll tint={result.ok ? COLORS.positive : COLORS.negative}>
        <ScreenHeader
          eyebrow="THE ESCAPE"
          title={result.ok ? 'You made it out' : 'Caught'}
          accent={result.ok ? COLORS.positive : COLORS.negative}
          right={<Orb3D size={52} color={result.ok ? COLORS.positive : COLORS.negative} icon={result.ok ? 'exit' : 'lock-closed'} />}
        />
        {result.steps.map((s) => (
          <View key={s.prompt} style={styles.stepRow}>
            <Ionicons name={s.worked ? 'checkmark-circle' : 'close-circle'} size={18} color={s.worked ? COLORS.positive : COLORS.negative} />
            <View style={styles.flex}>
              <Text variant="caption" muted>
                {s.prompt}
              </Text>
              <Text variant="body">{s.choice}</Text>
            </View>
          </View>
        ))}
        <Card accent={result.ok ? COLORS.positive : COLORS.negative}>
          <Text variant="body">{result.line}</Text>
        </Card>
        <Button label="Back" variant="secondary" fullWidth onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll tint={COLORS.negative}>
      <ScreenHeader
        eyebrow={`THE ESCAPE · MOVE ${picks.length + 1} OF ${ESCAPE_STEPS.length}`}
        title={step.prompt}
        subtitle="Every move has to work. Each one leans on a different part of you."
        accent={COLORS.negative}
        right={<Orb3D size={52} color={COLORS.negative} icon="exit" />}
      />
      {step.options.map((o) => {
        const odds = Math.round(escapeOdds(o.base, player.stats[o.stat] as number) * 100);
        return (
          <Card key={o.id} onPress={() => choose(o.id)} accent={COLORS.negative}>
            <View style={styles.optionRow}>
              <View style={styles.flex}>
                <Text variant="subheading">{o.label}</Text>
                <Text variant="caption" muted style={styles.small}>
                  {`Leans on ${o.stat}`}
                </Text>
              </View>
              <Text variant="heading" color={odds >= 60 ? COLORS.positive : odds >= 40 ? COLORS.warning : COLORS.negative}>
                {`${odds}%`}
              </Text>
            </View>
          </Card>
        );
      })}
      {error ? (
        <Text variant="caption" color={COLORS.warning} center>
          {error}
        </Text>
      ) : null}
      <Button label="Call it off" variant="ghost" onPress={() => router.back()} style={styles.gap} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  small: { marginTop: 3 },
  gap: { marginTop: SPACING.sm },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
});
