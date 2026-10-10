import { View, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { ageAtWeek, lifeStageForAge } from '../systems/life/age';
import { useSettingsStore } from '../store/settingsStore';
import { BACKEND_URL } from '../constants/aiConfig';
import { PhoneNotifications } from '../modules/phone-notifications';
import { clearShade, clearSchedule, requestNotificationPermission } from '../systems/notifications';
import { Screen } from '../components/ui/Screen';
import { Button } from '../components/ui/Button';
import { StatBar } from '../components/ui/StatBar';
import { Grid } from '../components/ui/Grid';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Orb3D } from '../components/fx/Orb3D';
import { STAT_LABELS } from '../constants/gameConfig';
import { archetypeLabel, genreLabel } from '../utils/formatters';
import { SPACING, COLORS } from '../constants/theme';
import { refreshRealWorld } from '../systems/realworld/refresh';

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
  const week = useGameStore((s) => s.week);
  const aiCloudEnabled = useSettingsStore((s) => s.aiCloudEnabled);
  const setAiCloudEnabled = useSettingsStore((s) => s.setAiCloudEnabled);
  const phoneNotifications = useSettingsStore((s) => s.phoneNotifications);
  const setPhoneNotifications = useSettingsStore((s) => s.setPhoneNotifications);
  const realWorld = useSettingsStore((s) => s.realWorld);
  const setRealWorld = useSettingsStore((s) => s.setRealWorld);
  if (!player) return null;

  const toggleRealWorld = (on: boolean) => {
    setRealWorld(on);
    if (on) void refreshRealWorld(true);
  };

  const togglePhone = async (on: boolean) => {
    setPhoneNotifications(on);
    if (on) await requestNotificationPermission();
    else {
      clearSchedule();
      clearShade();
    }
  };
  const age = ageAtWeek(player.startAge, week);

  return (
    <Screen scroll tint={COLORS.primary}>
      <ScreenHeader
        eyebrow="ARTIST PROFILE"
        title={player.artistName}
        right={<Orb3D size={52} color={COLORS.primary} icon="person" />}
      />
      <Text variant="caption" muted style={styles.meta}>
        {player.realName} · {age} · {lifeStageForAge(age).label}
        {'\n'}
        {genreLabel(player.genre)} · {archetypeLabel(player.archetype)}
      </Text>

      <Grid columns={2} gap={SPACING.base} style={styles.stats}>
        {SHOWN.map((key) => (
          <StatBar
            key={key}
            label={STAT_LABELS[key]}
            value={player.stats[key as keyof typeof player.stats] as number}
          />
        ))}
      </Grid>

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

      <View style={styles.aiRow}>
        <View style={styles.aiText}>
          <Text variant="body" weight="semibold">
            Phone notifications
          </Text>
          <Text variant="caption" muted>
            {PhoneNotifications
              ? 'Chirp, VibeGram, TokTalk and VibeNews ping your real notification bar. Off = banners inside the game.'
              : 'This build has no notification module yet. Rebuild the app to get real notifications; banners show in the game meanwhile.'}
          </Text>
        </View>
        <Switch
          value={phoneNotifications && !!PhoneNotifications}
          onValueChange={(v) => void togglePhone(v)}
          disabled={!PhoneNotifications}
          trackColor={{ false: COLORS.surface3, true: COLORS.primary }}
          thumbColor={COLORS.text}
        />
      </View>

      <View style={styles.aiRow}>
        <View style={styles.aiText}>
          <Text variant="body" weight="semibold">
            Real-world news & trends
          </Text>
          <Text variant="caption" muted>
            {"The apps' everyday internet talks about what's really happening in sports, tech, games, science, space, wellness and luxury. Never politics, religion, crime or gossip. Off = the game's own world only."}
          </Text>
        </View>
        <Switch
          value={realWorld}
          onValueChange={toggleRealWorld}
          trackColor={{ false: COLORS.surface3, true: COLORS.primary }}
          thumbColor={COLORS.text}
        />
      </View>

      <Button label="Close" icon="close" variant="outline" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
