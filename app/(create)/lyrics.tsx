import { useState } from 'react';
import { View, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../../store/playerStore';
import { useAudioStore } from '../../store/audioStore';
import { useGameStore } from '../../store/gameStore';
import { suggestLyricLines } from '../../ai';
import type { LyricTheme } from '../../types/audio';
import {
  generateLyrics,
  makeWrittenLyrics,
  THEME_PROMPTS,
} from '../../systems/lyrics/lyricGenerator';
import { ALL_THEMES, THEME_LABELS } from '../../data/lyrics/lyricTemplates';
import { genreLabel } from '../../utils/formatters';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Typography';
import { StepHeader } from '../../components/audio/StepHeader';
import { Chip } from '../../components/audio/Chip';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

type Mode = 'generate' | 'write';

export default function LyricsStep() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const draft = useAudioStore((s) => s.draft);
  const setLyrics = useAudioStore((s) => s.setLyrics);
  const setStep = useAudioStore((s) => s.setStep);

  const week = useGameStore((s) => s.week);
  const [theme, setTheme] = useState<LyricTheme>(draft?.lyrics?.theme ?? 'flex');
  const [mode, setMode] = useState<Mode>('generate');
  const [written, setWritten] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);

  const loadIdeas = () => {
    setIdeasLoading(true);
    suggestLyricLines(theme, week, 5)
      .then(setIdeas)
      .catch(() => setIdeas([]))
      .finally(() => setIdeasLoading(false));
  };

  const applyIdea = (line: string) => {
    setWritten((w) => (w.trim() ? `${w}\n${line}` : line));
    setMode('write');
  };

  if (!player || !draft) {
    return (
      <Screen>
        <Text variant="body" muted>
          No draft in progress.
        </Text>
      </Screen>
    );
  }

  const ctx = {
    name: player.artistName,
    city: player.city,
    genre: genreLabel(player.genre),
  };

  const regenerate = () => setLyrics(generateLyrics(theme, ctx));

  const goRecord = () => {
    if (mode === 'write' && written.trim().length > 0) {
      setLyrics(makeWrittenLyrics(theme, written));
    }
    setStep('record');
    router.push('/(create)/record');
  };

  const skip = () => {
    setLyrics(null);
    setStep('record');
    router.push('/(create)/record');
  };

  const lyrics = draft.lyrics;

  return (
    <Screen>
      <StepHeader
        step="lyrics"
        title="Write the words"
        subtitle="Generate a starting point or write your own. Your own words read more authentic."
        onBack={() => router.back()}
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
        <Text variant="label" muted style={styles.section}>
          THEME
        </Text>
        <View style={styles.chips}>
          {ALL_THEMES.map((t) => (
            <Chip
              key={t}
              label={THEME_LABELS[t]}
              on={theme === t}
              onPress={() => setTheme(t)}
            />
          ))}
        </View>

        <View style={styles.modeRow}>
          <Chip
            label="Generate"
            on={mode === 'generate'}
            onPress={() => setMode('generate')}
          />
          <Chip
            label="Write my own"
            on={mode === 'write'}
            onPress={() => setMode('write')}
          />
        </View>

        {mode === 'generate' ? (
          <Card>
            <Button
              label={lyrics ? 'Regenerate' : 'Generate lyrics'}
              onPress={regenerate}
              variant="secondary"
            />
            {lyrics ? (
              <View style={styles.sheet}>
                {lyrics.sections.map((s, i) => (
                  <View key={i} style={styles.sectionBlock}>
                    <Text variant="label" color={COLORS.secondary}>
                      {s.type.toUpperCase()}
                    </Text>
                    {s.lines.map((l, j) => (
                      <Text key={j} variant="body" style={styles.line}>
                        {l}
                      </Text>
                    ))}
                  </View>
                ))}
                <Text variant="caption" muted style={styles.count}>
                  {lyrics.wordCount} words · generated
                </Text>
              </View>
            ) : (
              <Text variant="caption" muted style={styles.hint}>
                {THEME_PROMPTS[theme]}
              </Text>
            )}
          </Card>
        ) : (
          <Card>
            <Text variant="caption" muted style={styles.hint}>
              {THEME_PROMPTS[theme]}
            </Text>
            <TextInput
              value={written}
              onChangeText={setWritten}
              placeholder={'Type your lyrics…\nLeave a blank line between sections.'}
              placeholderTextColor={COLORS.textMuted}
              multiline
              style={styles.input}
            />
            <Text variant="caption" muted>
              {written.trim() ? `${written.trim().split(/\s+/).length} words` : ''}
            </Text>
          </Card>
        )}

        <Card style={styles.ideasCard}>
          <Button
            label={ideasLoading ? 'Thinking…' : '✦ AI line ideas'}
            onPress={loadIdeas}
            variant="ghost"
            disabled={ideasLoading}
          />
          {ideas.length > 0 && (
            <View style={styles.ideas}>
              <Text variant="caption" muted style={styles.hint}>
                Tap a line to drop it into your own lyrics.
              </Text>
              {ideas.map((line, i) => (
                <Pressable key={i} onPress={() => applyIdea(line)}>
                  <Text variant="body" style={styles.idea}>
                    {line}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue to recording" onPress={goRecord} fullWidth />
        <Button
          label="Skip — freestyle it"
          onPress={skip}
          variant="ghost"
          fullWidth
          style={styles.skip}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  section: { marginBottom: SPACING.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  modeRow: { flexDirection: 'row', gap: SPACING.sm, marginVertical: SPACING.base },
  sheet: { marginTop: SPACING.base },
  sectionBlock: { marginBottom: SPACING.md },
  line: { lineHeight: 22 },
  count: { marginTop: SPACING.sm },
  hint: { lineHeight: 18, marginBottom: SPACING.sm },
  input: {
    color: COLORS.text,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 180,
    textAlignVertical: 'top',
    marginVertical: SPACING.sm,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ideasCard: { marginTop: SPACING.base },
  ideas: { marginTop: SPACING.sm, gap: SPACING.xs },
  idea: { lineHeight: 22, paddingVertical: SPACING.xs },
  footer: { paddingVertical: SPACING.base },
  skip: { marginTop: SPACING.xs },
});
