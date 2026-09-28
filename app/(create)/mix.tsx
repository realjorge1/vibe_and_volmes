import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAudioStore } from '../../store/audioStore';
import { getBeat } from '../../data/beats/beatCatalog';
import { useLayeredPlayback } from '../../hooks/useLayeredPlayback';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Typography';
import { StepHeader } from '../../components/audio/StepHeader';
import { MixControls } from '../../components/audio/MixControls';
import { DEFAULT_MIX } from '../../constants/audioConfig';
import { SPACING } from '../../constants/theme';

export default function MixStep() {
  const router = useRouter();
  const draft = useAudioStore((s) => s.draft);
  const setMix = useAudioStore((s) => s.setMix);
  const setStep = useAudioStore((s) => s.setStep);

  const beat = getBeat(draft?.beatId ?? null);
  const preview = useLayeredPlayback(
    beat?.asset ?? null,
    draft?.recording?.uri ?? null,
    draft?.mix ?? DEFAULT_MIX
  );

  if (!draft) {
    return (
      <Screen>
        <Text variant="body" muted>
          No draft in progress.
        </Text>
      </Screen>
    );
  }

  const next = () => {
    preview.stop();
    setStep('release');
    router.push('/(create)/release');
  };

  return (
    <Screen>
      <StepHeader
        step="mix"
        title="Mix & FX"
        subtitle="Balance the vocal and beat, then ride the DJ FX — filter, space, echo, drive — live while it plays."
        onBack={() => router.back()}
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
        <Card>
          <Button
            label={preview.playing ? 'Pause' : 'Play the mix'}
            onPress={preview.toggle}
            variant="secondary"
          />
          <View style={styles.controls}>
            <MixControls mix={draft.mix} onChange={setMix} />
          </View>
        </Card>
        <Text variant="caption" muted style={styles.note}>
          Drag a knob while it plays to hear the sweep. Tasteful moves read as
          better production and lift the score; burying the mix behind a closed
          filter or drowning it in echo will cost you.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue" onPress={next} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  controls: { marginTop: SPACING.lg },
  note: { lineHeight: 18, marginTop: SPACING.sm },
  footer: { paddingVertical: SPACING.base },
});
