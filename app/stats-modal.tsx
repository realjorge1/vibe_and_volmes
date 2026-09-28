import { View, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { BACKEND_URL } from '../constants/aiConfig';
import { Screen } from '../components/ui/Screen';
import { Button } from '../components/ui/Button';
import { StatBar } from '../components/ui/StatBar';
import { Text } from '../components/ui/Typography';
import { STAT_LABELS } from '../constants/gameConfig';
import { archetypeLabel, genreLabel } from '../utils/formatters';
import { SPACING, COLORS } from '../constants/theme';

const SHOWN: (keyof typeof STAT_LABELS)[] = [
  'talent',
  'writing',
  'vocalSkill',
  'charisma',
  'authenticity',
  'creativity',
  'discipline',
  'reputation',
  'fanLoyalty',
  'industryRespect',
  'mentalHealth',
  'energy',
];

export default function StatsModal() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const aiCloudEnabled = useSettingsStore((s) => s.aiCloudEnabled);
  const setAiCloudEnabled = useSettingsStore((s) => s.setAiCloudEnabled);
  if (!player) return null;

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {player.artistName}
      </Text>
      <Text variant="caption" muted style={styles.meta}>
        {player.realName} · {genreLabel(player.genre)} ·{' '}
        {archetypeLabel(player.archetype)}
      </Text>

      <View style={styles.stats}>
        {SHOWN.map((key) => (
          <StatBar
            key={key}
            label={STAT_LABELS[key]}
            value={player.stats[key as keyof typeof player.stats] as number}
          />
        ))}
      </View>

      <View style={styles.aiRow}>
        <View style={styles.aiText}>
          <Text variant="body" weight="semibold">
            AI immersion
          </Text>
          <Text variant="caption" muted>
            {BACKEND_URL
              ? 'Let the cloud write reactive internet drama. Off = free deterministic generation.'
              : 'No backend configured — game runs on free deterministic generation.'}
          </Text>
        </View>
        <Switch
          value={aiCloudEnabled}
          onValueChange={setAiCloudEnabled}
          disabled={!BACKEND_URL}
          trackColor={{ false: COLORS.surface3, true: COLORS.primary }}
          thumbColor={COLORS.text}
        />
      </View>

      <Button label="Close" variant="outline" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: SPACING.lg },
  meta: { marginTop: SPACING.xs, marginBottom: SPACING.xl },
  stats: { marginBottom: SPACING.lg },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    marginBottom: SPACING.lg,
  },
  aiText: { flex: 1, gap: SPACING.xs },
});
