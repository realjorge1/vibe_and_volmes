import { useState } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WrappedCard } from '../types/calendar';
import { usePlayerStore } from '../store/playerStore';
import { useCalendarStore } from '../store/calendarStore';
import { saveProgress } from '../systems/persistence';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { formatMoney } from '../utils/formatters';
import { formatFanCount, formatStreams } from '../utils/statHelpers';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface Slide {
  eyebrow: string;
  big: string;
  line: string;
  colors: readonly [string, string, ...string[]];
}

function slidesFor(w: WrappedCard, name: string): Slide[] {
  const s: Slide[] = [
    {
      eyebrow: `YEAR ${w.year} · AGE ${w.age}`,
      big: `${name},\nwrapped.`,
      line: 'Your year in music. Tap to keep going.',
      colors: ['#8B6CFF', '#FF4FA3'],
    },
    {
      eyebrow: 'PEOPLE PRESSED PLAY',
      big: formatStreams(w.streams),
      line: w.streams > 0 ? 'streams across everything you ever put out.' : 'Not many streams yet. Every legend has a year like this.',
      colors: ['#36D6FF', '#6A45F5'],
    },
  ];
  if (w.topSong) {
    s.push({
      eyebrow: 'YOUR SONG OF THE YEAR',
      big: `"${w.topSong.title}"`,
      line: `${formatStreams(w.topSong.streams)} streams. It was the one.`,
      colors: ['#FF7EBD', '#E8367F'],
    });
  }
  s.push({
    eyebrow: 'NEW FANS',
    big: `${w.fansGained >= 0 ? '+' : '−'}${formatFanCount(Math.abs(w.fansGained))}`,
    line: w.fansGained >= 0 ? 'people who know your name now and didn’t last year.' : 'Some people moved on. The ones who stayed are yours.',
    colors: ['#3BE8A6', '#1FC98A'],
  });
  if (w.bestPeak !== null || w.releases > 0) {
    s.push({
      eyebrow: 'ON THE CHART',
      big: w.bestPeak !== null ? `#${w.bestPeak}` : `${w.releases}`,
      line: w.bestPeak !== null ? `Your best chart position this year, from ${w.releases} release${w.releases === 1 ? '' : 's'}.` : `release${w.releases === 1 ? '' : 's'}. None charted. Yet.`,
      colors: ['#FFB347', '#FF5470'],
    });
  }
  if (w.showsPlayed > 0) {
    s.push({
      eyebrow: 'ON STAGE',
      big: `${w.showsPlayed} show${w.showsPlayed === 1 ? '' : 's'}`,
      line: w.bestShow !== null ? `Best night: ${w.bestShow}/100.` : 'Every one of them counted.',
      colors: ['#FF8A3D', '#E2683C'],
    });
  }
  if (w.nominations > 0) {
    s.push({
      eyebrow: 'AWARD SEASON',
      big: w.awardsWon > 0 ? `${w.awardsWon} win${w.awardsWon === 1 ? '' : 's'}` : `${w.nominations} nod${w.nominations === 1 ? '' : 's'}`,
      line: w.awardsWon > 0 ? `from ${w.nominations} nomination${w.nominations === 1 ? '' : 's'}.` : 'No trophies. Next year.',
      colors: ['#FFE48F', '#FFAE3B'],
    });
  }
  if (w.biggestMoment) {
    s.push({ eyebrow: 'THE MOMENT', big: 'Remember this?', line: w.biggestMoment, colors: ['#B79CFF', '#7B5CFF'] });
  }
  s.push({
    eyebrow: 'THE MONEY',
    big: formatMoney(w.earned),
    line: 'earned this year, before the taxman and the lifestyle.',
    colors: ['#7CF5C8', '#2AA8F0'],
  });
  if (w.newPeople.length > 0) {
    s.push({ eyebrow: 'NEW IN YOUR LIFE', big: w.newPeople.join('\n'), line: 'People who weren’t there a year ago.', colors: ['#FF7EBD', '#8B6CFF'] });
  }
  s.push({
    eyebrow: 'WHERE YOU STAND',
    big: w.rankLine.split('.')[0],
    line: `${w.wantsMet} want${w.wantsMet === 1 ? '' : 's'} fulfilled. Here’s to the next one.`,
    colors: ['#FF4FA3', '#8B6CFF', '#36D6FF'],
  });
  return s;
}

/** The year in music, one slide at a time. */
export default function WrappedModal() {
  const router = useRouter();
  const { year } = useLocalSearchParams<{ year?: string }>();
  const player = usePlayerStore((s) => s.player);
  const current = useCalendarStore((s) => s.wrapped);
  const history = useCalendarStore((s) => s.wrappedHistory);
  const [i, setI] = useState(0);
  if (!player) return null;
  const card = year ? history.find((w) => String(w.year) === year) ?? current : current;
  if (!card) {
    return (
      <SafeAreaView style={styles.empty}>
        <Text variant="body" muted center>
          Your first Wrapped arrives when your first year ends.
        </Text>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }
  const slides = slidesFor(card, player.artistName);
  const slide = slides[Math.min(i, slides.length - 1)];
  const last = i >= slides.length - 1;

  const close = () => {
    if (card.year === current?.year && !current.seen) {
      useCalendarStore.getState().markWrappedSeen();
      saveProgress();
    }
    router.back();
  };

  const share = () => {
    const text = [
      `${player.artistName} · Year ${card.year} Wrapped`,
      `${formatStreams(card.streams)} streams · ${card.fansGained >= 0 ? '+' : ''}${formatFanCount(card.fansGained)} fans`,
      card.topSong ? `Song of the year: "${card.topSong.title}"` : null,
      card.bestPeak !== null ? `Chart peak: #${card.bestPeak}` : null,
      card.rankLine,
      '— Vibe & Volumes',
    ]
      .filter(Boolean)
      .join('\n');
    void Share.share({ message: text });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={slide.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        {/* Story-style progress: one segment per slide, drawn still. */}
        <View style={styles.progress}>
          {slides.map((_, k) => (
            <View key={k} style={[styles.seg, k <= i && styles.segOn]} />
          ))}
        </View>
        <PressableScale onPress={() => (last ? undefined : setI(i + 1))} scaleTo={1} style={styles.body}>
          <Text variant="label" color="rgba(255,255,255,0.8)" center>
            {slide.eyebrow}
          </Text>
          <Text variant="display" color="#FFFFFF" center style={styles.big} adjustsFontSizeToFit numberOfLines={4}>
            {slide.big}
          </Text>
          <Text variant="body" color="rgba(255,255,255,0.9)" center style={styles.line}>
            {slide.line}
          </Text>
        </PressableScale>
        <View style={styles.footer}>
          {i > 0 ? <Button label="Back" variant="ghost" onPress={() => setI(i - 1)} /> : <View />}
          {last ? (
            <View style={styles.endButtons}>
              <Button label="Share" icon="share-social" variant="secondary" onPress={share} />
              <Button label="Done" icon="checkmark" variant="primary" onPress={close} />
            </View>
          ) : (
            <Button label="Next" icon="arrow-forward" variant="primary" onPress={() => setI(i + 1)} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1, paddingHorizontal: SPACING.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.base, backgroundColor: COLORS.bg },
  progress: { flexDirection: 'row', gap: 4, marginTop: SPACING.sm },
  seg: { flex: 1, height: 3, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.3)' },
  segOn: { backgroundColor: '#FFFFFF' },
  body: { flex: 1, justifyContent: 'center', gap: SPACING.base },
  big: { fontSize: 46, lineHeight: 54 },
  line: { lineHeight: 24, maxWidth: 320, alignSelf: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: SPACING.base },
  endButtons: { flexDirection: 'row', gap: SPACING.sm },
});
