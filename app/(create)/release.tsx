import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../../store/playerStore';
import { useAudioStore } from '../../store/audioStore';
import { getCareerStage } from '../../systems/career/careerStage';
import {
  getAvailableFeatures,
  combineFeatures,
} from '../../data/collabs/featureRoster';
import type { ReleaseRollout } from '../../types/audio';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Typography';
import { StepHeader } from '../../components/audio/StepHeader';
import { Chip } from '../../components/audio/Chip';
import { formatStreams } from '../../utils/statHelpers';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

const ROLLOUTS: { id: ReleaseRollout; label: string; desc: string }[] = [
  {
    id: 'surprise',
    label: 'Surprise drop',
    desc: 'No warning. A spike of buzz and authenticity, but less sustained push.',
  },
  {
    id: 'standard',
    label: 'Standard release',
    desc: 'A normal rollout. No bonus, no risk.',
  },
  {
    id: 'campaign',
    label: 'Marketing campaign',
    desc: 'A full rollout — big first week and playlist push. Rewards a real budget.',
  },
];

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export default function ReleaseStep() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const draft = useAudioStore((s) => s.draft);
  const setStep = useAudioStore((s) => s.setStep);
  const setRollout = useAudioStore((s) => s.setRollout);
  const setMarketingBudget = useAudioStore((s) => s.setMarketingBudget);
  const toggleCollaborator = useAudioStore((s) => s.toggleCollaborator);

  if (!player || !draft) {
    return (
      <Screen>
        <Text variant="body" muted>
          No draft in progress.
        </Text>
      </Screen>
    );
  }

  const stage = getCareerStage();
  const available = getAvailableFeatures(stage);
  const selected = draft.collaborators;
  const selectedIds = new Set(selected.map((c) => c.artistId));
  const collabCost = selected.reduce((s, c) => s + c.cost, 0);
  const totalSpend = collabCost + draft.marketingBudget;
  const overBudget = totalSpend > player.money;
  const combo = combineFeatures(selected);

  const presets = Array.from(
    new Set([0, 1_000, 5_000, 25_000, 100_000, Math.round(player.money * 0.25)])
  )
    .filter((p) => p >= 0 && p <= player.money - collabCost)
    .sort((a, b) => a - b);

  const next = () => {
    if (overBudget) return;
    setStep('finalize');
    router.push('/(create)/finalize');
  };

  return (
    <Screen>
      <StepHeader
        step="release"
        title="Plan the release"
        subtitle="Features, rollout and marketing. Money talks on the charts."
        onBack={() => router.back()}
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
        <Card accent={COLORS.gold}>
          <View style={styles.walletRow}>
            <View>
              <Text variant="label" muted>
                WALLET
              </Text>
              <Text variant="subheading">{money(player.money)}</Text>
            </View>
            <View style={styles.right}>
              <Text variant="label" muted>
                THIS RELEASE
              </Text>
              <Text
                variant="subheading"
                color={overBudget ? COLORS.negative : COLORS.text}
              >
                {money(totalSpend)}
              </Text>
            </View>
          </View>
          {selected.length > 0 ? (
            <Text variant="caption" muted style={styles.comboLine}>
              Features add +{combo.reach} reach · +{combo.credibility} credibility
            </Text>
          ) : null}
        </Card>

        <Text variant="label" muted style={styles.section}>
          COLLABORATORS · {stage.label.toUpperCase()}
        </Text>
        {available.length === 0 ? (
          <Text variant="caption" muted>
            No artists will take a feature at your stage yet. Grow your name.
          </Text>
        ) : (
          available.map((f) => {
            const on = selectedIds.has(f.artistId);
            const affordable =
              on || f.cost + collabCost + draft.marketingBudget <= player.money;
            return (
              <Pressable
                key={f.artistId}
                onPress={() => (affordable ? toggleCollaborator(f) : undefined)}
                style={[
                  styles.collab,
                  { borderColor: on ? COLORS.primary : COLORS.border },
                  !affordable && styles.dim,
                ]}
              >
                <View style={styles.flex}>
                  <Text variant="subheading">{f.name}</Text>
                  <Text variant="caption" muted>
                    {f.genre} · {formatStreams(f.fans)} fans · +{f.reachBonus} reach
                  </Text>
                </View>
                <Text
                  variant="subheading"
                  color={on ? COLORS.primary : COLORS.textSecondary}
                >
                  {money(f.cost)}
                </Text>
              </Pressable>
            );
          })
        )}

        <Text variant="label" muted style={styles.section}>
          ROLLOUT
        </Text>
        {ROLLOUTS.map((r) => {
          const on = draft.rollout === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => setRollout(r.id)}
              style={[
                styles.rollout,
                { borderColor: on ? COLORS.primary : COLORS.border },
              ]}
            >
              <Text variant="subheading" color={on ? COLORS.primary : COLORS.text}>
                {r.label}
              </Text>
              <Text variant="caption" muted style={styles.rolloutDesc}>
                {r.desc}
              </Text>
            </Pressable>
          );
        })}

        <Text variant="label" muted style={styles.section}>
          MARKETING BUDGET
        </Text>
        <View style={styles.presets}>
          {presets.map((p) => (
            <Chip
              key={p}
              label={p === 0 ? 'None' : money(p)}
              on={draft.marketingBudget === p}
              onPress={() => setMarketingBudget(p)}
            />
          ))}
        </View>
        <Text variant="caption" muted style={styles.note}>
          Marketing fuels playlist support and a bigger first week — with
          diminishing returns. It fades in the weeks after release.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={overBudget ? 'Over budget' : 'Continue'}
          onPress={next}
          disabled={overBudget}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  walletRow: { flexDirection: 'row', justifyContent: 'space-between' },
  right: { alignItems: 'flex-end' },
  comboLine: { marginTop: SPACING.sm },
  section: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  flex: { flex: 1, paddingRight: SPACING.md },
  collab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    marginBottom: SPACING.md,
  },
  rollout: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    marginBottom: SPACING.md,
  },
  rolloutDesc: { marginTop: SPACING.xs, lineHeight: 18 },
  dim: { opacity: 0.4 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  note: { marginTop: SPACING.md, lineHeight: 18 },
  footer: { paddingVertical: SPACING.base },
});
