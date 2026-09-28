import { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioStore } from '../../store/audioStore';
import { getBeat } from '../../data/beats/beatCatalog';
import type { VocalRecording } from '../../types/audio';
import { useVocalRecorder } from '../../hooks/useVocalRecorder';
import { useLayeredPlayback } from '../../hooks/useLayeredPlayback';
import { SimplePlayer } from '../../audio/playback/audioPlayer';
import { MAX_RECORDING_SEC, DEFAULT_MIX } from '../../constants/audioConfig';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Typography';
import { StepHeader } from '../../components/audio/StepHeader';
import { RecordButton } from '../../components/audio/RecordButton';
import { WaveformView } from '../../components/audio/WaveformView';
import { COLORS, SPACING } from '../../constants/theme';

function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function RecordStep() {
  const router = useRouter();
  const draft = useAudioStore((s) => s.draft);
  const setRecording = useAudioStore((s) => s.setRecording);
  const setStep = useAudioStore((s) => s.setStep);

  const beat = getBeat(draft?.beatId ?? null);
  const beatSource = beat?.asset ?? null;

  const rec = useVocalRecorder();
  const [take, setTake] = useState<VocalRecording | null>(
    draft?.recording ?? null
  );
  const [monitorBeat, setMonitorBeat] = useState(true);
  const beatMonitor = useRef<SimplePlayer | null>(null);

  // Capture both manual-stop and the 2-min auto-cap.
  useEffect(() => {
    if (rec.result) {
      setTake(rec.result);
      rec.clearResult();
    }
  }, [rec.result, rec]);

  // Play the beat under the take while recording, if it has audio.
  useEffect(() => {
    if (rec.status === 'recording' && monitorBeat && beatSource != null) {
      const p = new SimplePlayer();
      p.load(beatSource, { loop: true, volume: 0.55 });
      p.play();
      beatMonitor.current = p;
    }
    return () => {
      beatMonitor.current?.release();
      beatMonitor.current = null;
    };
  }, [rec.status, monitorBeat, beatSource]);

  const preview = useLayeredPlayback(
    beatSource,
    take?.uri ?? null,
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

  const onRecordPress = async () => {
    if (rec.status === 'recording' || rec.status === 'paused') {
      await rec.stop();
    } else {
      setTake(null);
      await rec.start();
    }
  };

  const reRecord = () => {
    setTake(null);
    rec.clearResult();
  };

  const accept = () => {
    if (!take) return;
    preview.stop();
    setRecording(take);
    setStep('mix');
    router.push('/(create)/mix');
  };

  const mode =
    rec.status === 'recording'
      ? 'recording'
      : rec.status === 'paused'
        ? 'paused'
        : rec.status === 'processing'
          ? 'processing'
          : 'idle';

  return (
    <Screen>
      <StepHeader
        step="record"
        title="Record vocals"
        subtitle={`One take, up to ${MAX_RECORDING_SEC / 60} minutes. Tap to start, tap to stop.`}
        onBack={() => router.back()}
      />

      {beat ? (
        <Text variant="caption" muted style={styles.beatLine}>
          Over <Text variant="caption">{beat.title}</Text> · {beat.bpm} BPM
          {beatSource == null ? ' · (silent — no audio file)' : ''}
        </Text>
      ) : null}

      {rec.status === 'no-permission' && (
        <Card accent={COLORS.warning}>
          <Text variant="subheading">Microphone needed</Text>
          <Text variant="caption" muted style={styles.permMsg}>
            Recording vocals needs mic access. Enable it in Settings, then come
            back.
          </Text>
          <Button
            label="Request access"
            onPress={rec.requestPermission}
            variant="secondary"
            style={styles.permBtn}
          />
        </Card>
      )}

      <Card>
        <View style={styles.waveWrap}>
          <WaveformView
            peaks={take ? take.peaks : rec.livePeaks}
            progress={
              take && preview.durationSec > 0
                ? preview.positionSec / preview.durationSec
                : undefined
            }
            height={64}
            activeColor={rec.status === 'recording' ? COLORS.primary : COLORS.accent}
          />
        </View>

        <Text variant="display" center color={COLORS.text} style={styles.timer}>
          {mmss(take ? take.durationSec : rec.durationSec)}
        </Text>
        {rec.atLimit && !take ? (
          <Text variant="caption" center color={COLORS.warning}>
            Reached the {MAX_RECORDING_SEC / 60}-minute limit
          </Text>
        ) : null}

        {!take ? (
          <View style={styles.controls}>
            <RecordButton mode={mode as any} onPress={onRecordPress} />
            {rec.status === 'recording' || rec.status === 'paused' ? (
              <Pressable
                onPress={rec.status === 'recording' ? rec.pause : rec.resume}
                style={styles.secondary}
                hitSlop={8}
              >
                <Ionicons
                  name={rec.status === 'recording' ? 'pause' : 'play'}
                  size={20}
                  color={COLORS.textSecondary}
                />
                <Text variant="caption" muted>
                  {rec.status === 'recording' ? 'Pause' : 'Resume'}
                </Text>
              </Pressable>
            ) : (
              beatSource != null && (
                <Pressable
                  onPress={() => setMonitorBeat((v) => !v)}
                  style={styles.secondary}
                  hitSlop={8}
                >
                  <Ionicons
                    name={monitorBeat ? 'volume-high' : 'volume-mute'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                  <Text variant="caption" muted>
                    Beat while recording: {monitorBeat ? 'on' : 'off'}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        ) : (
          <View style={styles.takeActions}>
            <Button
              label={preview.playing ? 'Pause preview' : 'Preview with beat'}
              onPress={preview.toggle}
              variant="secondary"
              fullWidth
            />
            <View style={styles.row}>
              <Button
                label="Re-record"
                onPress={reRecord}
                variant="outline"
                style={styles.half}
              />
              <Button label="Use this take" onPress={accept} style={styles.half} />
            </View>
          </View>
        )}
      </Card>

      {rec.error ? (
        <Text variant="caption" color={COLORS.negative}>
          {rec.error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  beatLine: { marginBottom: SPACING.md },
  permMsg: { marginTop: SPACING.xs, lineHeight: 18 },
  permBtn: { marginTop: SPACING.md },
  waveWrap: { marginVertical: SPACING.base },
  timer: { marginVertical: SPACING.sm },
  controls: { alignItems: 'center', marginTop: SPACING.base, gap: SPACING.base },
  secondary: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  takeActions: { marginTop: SPACING.base, gap: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.md },
  half: { flex: 1 },
});
