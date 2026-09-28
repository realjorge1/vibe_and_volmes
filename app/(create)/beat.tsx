import { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../../store/playerStore';
import { useAudioStore } from '../../store/audioStore';
import { usePremiumStore } from '../../store/premiumStore';
import { BEAT_CATALOG, BEAT_GENRES } from '../../data/beats/beatCatalog';
import { premiumBeatsForPacks } from '../../data/premium/premiumBeats';
import type { BeatGenre } from '../../types/audio';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Typography';
import { StepHeader } from '../../components/audio/StepHeader';
import { BeatCard } from '../../components/audio/BeatCard';
import { Chip } from '../../components/audio/Chip';
import { SPACING } from '../../constants/theme';

export default function BeatStep() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const draft = useAudioStore((s) => s.draft);
  const setBeat = useAudioStore((s) => s.setBeat);
  const setStep = useAudioStore((s) => s.setStep);
  const discardDraft = useAudioStore((s) => s.discardDraft);
  const ownedPacks = usePremiumStore((s) => s.ownedBeatPackIds());

  // Free catalog + any owned premium pack beats (cosmetic variety only).
  const catalog = useMemo(
    () => [...BEAT_CATALOG, ...premiumBeatsForPacks(ownedPacks)],
    [ownedPacks]
  );

  // Default to the genre that flatters the player's lane.
  const suggested = useMemo<BeatGenre | 'all'>(() => {
    if (!player) return 'all';
    const hit = catalog.find((b) => b.flattersGenres.includes(player.genre));
    return hit?.genre ?? 'all';
  }, [player, catalog]);

  const [filter, setFilter] = useState<BeatGenre | 'all'>(suggested);

  if (!player || !draft) {
    return (
      <Screen>
        <Text variant="body" muted>
          No draft in progress.
        </Text>
      </Screen>
    );
  }

  const beats =
    filter === 'all' ? catalog : catalog.filter((b) => b.genre === filter);

  const cancel = () => {
    discardDraft();
    router.back();
  };

  const next = () => {
    if (!draft.beatId) return;
    setStep('lyrics');
    router.push('/(create)/lyrics');
  };

  return (
    <Screen>
      <StepHeader
        step="beat"
        title="Pick a beat"
        subtitle="This sets the vibe. Beats that flatter your genre score better."
        onBack={cancel}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <Chip label="All" on={filter === 'all'} onPress={() => setFilter('all')} />
        {BEAT_GENRES.map((g) => (
          <Chip
            key={g}
            label={g}
            on={filter === g}
            onPress={() => setFilter(g)}
          />
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {beats.map((b) => (
          <BeatCard
            key={b.id}
            beat={b}
            selected={draft.beatId === b.id}
            onSelect={() => setBeat(b.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={draft.beatId ? 'Continue' : 'Select a beat'}
          onPress={next}
          disabled={!draft.beatId}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  list: { flex: 1, marginTop: SPACING.sm },
  listContent: { paddingBottom: SPACING.base },
  footer: { paddingVertical: SPACING.base },
});
