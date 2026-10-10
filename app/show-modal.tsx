import { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { MixSettings } from '../types/audio';
import type { MomentSpec } from '../types/drama';
import type { Cue, CueGrade, ShowSong, ShowVenue, StageMoment } from '../types/show';
import { usePlayerStore } from '../store/playerStore';
import { useCareerStore } from '../store/careerStore';
import { getBeat } from '../data/beats/beatCatalog';
import { stageMomentsFor } from '../data/show/stageMoments';
import { DEFAULT_MIX } from '../constants/audioConfig';
import { useLayeredPlayback } from '../hooks/useLayeredPlayback';
import { completeShow, showSongs, showsTonight } from '../systems/show/showActions';
import {
  autoShowScore,
  barAt,
  beatInBar,
  CUE_POINTS,
  cuesForSong,
  finalScore,
  gradeOffset,
  judgeSetlist,
  nextCrowdEnergy,
  offsetToBar,
  reviewFor,
  resolveStageOption,
  secondsPerBeat,
  segmentSeconds,
  SEGMENT_BARS,
  starsFor,
} from '../systems/show/showEngine';
import { traitEffects } from '../systems/identity/traits';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { RuleLabel } from '../components/ui/RuleLabel';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { StatBar } from '../components/ui/StatBar';
import { Grid } from '../components/ui/Grid';
import { PressableScale } from '../components/ui/PressableScale';
import { Orb3D } from '../components/fx/Orb3D';
import { COLORS, GRADIENTS, RADIUS, SPACING, withAlpha } from '../constants/theme';

type Phase = 'setlist' | 'ready' | 'playing' | 'moment' | 'between' | 'results';

const GRADE_COLOR: Record<CueGrade, string> = {
  perfect: COLORS.gold,
  great: COLORS.positive,
  ok: COLORS.accent,
  miss: COLORS.negative,
};

const ENERGY_LABEL = { high: 'HIGH', mid: 'MID', low: 'SLOW' } as const;

/** How each effect pad bends the live mix for two beats. */
const FX_MIX: Record<Exclude<Cue['kind'], 'drop'>, Partial<MixSettings>> = {
  filter: { filter: 0.12 },
  echo: { echo: 0.9 },
  drive: { drive: 0.85 },
};

/**
 * A live show. Build the set (order matters), then play it: each song is the
 * real beat, eight bars, with a beat counter that lights on the downbeat.
 * Hit the drop on the one; hit the effect cue on time (it really sweeps the
 * filter, throws the echo, slams the drive). Between songs, the stage throws
 * something at you. The night scores out of 100.
 */
export default function ShowModal() {
  const { key } = useLocalSearchParams<{ key?: string }>();
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const venue = useMemo(() => showsTonight().find((v) => v.key === key) ?? showsTonight()[0] ?? null, [key]);
  if (!player) return null;
  if (!venue) {
    return (
      <Screen scroll tint={COLORS.accent}>
        <ScreenHeader eyebrow="LIVE" title="No show tonight" accent={COLORS.accent} right={<Orb3D size={52} color={COLORS.accent} icon="mic" />} />
        <Text variant="body" muted center>
          Book a club gig from the Studio, play your tour stops, or get on a festival poster.
        </Text>
        <Button label="Back" variant="ghost" onPress={() => router.back()} style={styles.gap} />
      </Screen>
    );
  }
  return <ShowRunner venue={venue} onClose={() => router.back()} />;
}

function ShowRunner({ venue, onClose }: { venue: ShowVenue; onClose: () => void }) {
  const player = usePlayerStore((s) => s.player)!;
  const pool = useMemo(() => [...showSongs()].sort((a, b) => b.heat - a.heat), []);
  const [set, setSet] = useState<ShowSong[]>([]);
  const [phase, setPhase] = useState<Phase>('setlist');
  const [index, setIndex] = useState(0);
  const [energy, setEnergy] = useState(45);
  const [energies, setEnergies] = useState<number[]>([]);
  const [cuePoints, setCuePoints] = useState(0);
  const [grades, setGrades] = useState<CueGrade[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [moment, setMoment] = useState<StageMoment | null>(null);
  const [momentLine, setMomentLine] = useState<string | null>(null);
  const [momentEnergy, setMomentEnergy] = useState(0);
  const [bigMoment, setBigMoment] = useState<MomentSpec | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const want = Math.min(venue.setLength, pool.length);
  const verdict = judgeSetlist(set);

  // Which songs get a stage moment after them: one mid-set, one before the closer.
  const momentSlots = useMemo(() => {
    const n = Math.max(1, want);
    return new Set(n >= 3 ? [1, n - 2] : [0]);
  }, [want]);

  const toggleSong = (s: ShowSong) => {
    setSet((cur) => (cur.some((x) => x.trackId === s.trackId) ? cur.filter((x) => x.trackId !== s.trackId) : cur.length >= want ? cur : [...cur, s]));
  };

  const skip = () => {
    const s = autoShowScore(player.stats, useCareerStore.getState().mental.burnout, traitEffects().showBonus);
    completeShow(venue, { score: s, setlist: set.map((x) => x.title), highlights: ['You let the night happen.'], moment: null });
    setScore(s);
    setPhase('results');
  };

  const finishSong = (songPoints: number, songGrades: CueGrade[]) => {
    const song = set[index];
    const next = nextCrowdEnergy(energy, song, songPoints, 0);
    setEnergy(next);
    setEnergies((e) => [...e, next]);
    setCuePoints((p) => p + songPoints);
    setGrades((g) => [...g, ...songGrades]);
    if (songGrades.every((g) => g === 'perfect')) setHighlights((h) => [...h, `Every cue landed on "${song.title}".`]);
    if (momentSlots.has(index)) {
      const position = index === set.length - 2 ? 'closer' : song.energy === 'low' ? 'slow' : 'any';
      const options = stageMomentsFor(position, venue.crowd);
      if (options.length > 0) {
        setMoment(options[Math.floor(Math.random() * options.length)]);
        setMomentLine(null);
        setPhase('moment');
        return;
      }
    }
    setPhase('between');
  };

  const chooseMoment = (optionId: string) => {
    if (!moment) return;
    const option = moment.options.find((o) => o.id === optionId)!;
    const r = resolveStageOption(option, player.stats[option.stat] as number);
    setMomentLine(r.line);
    setMomentEnergy(r.energy);
    setEnergy((e) => Math.max(0, Math.min(100, e + r.energy)));
    setEnergies((list) => (list.length > 0 ? [...list.slice(0, -1), Math.max(0, Math.min(100, list[list.length - 1] + r.energy))] : list));
    setHighlights((h) => [...h, r.line]);
    const spec = r.worked ? option.goodMoment : option.badMoment;
    if (spec && (!bigMoment || spec.heat > bigMoment.heat)) setBigMoment(spec);
  };

  const nextSong = () => {
    if (index + 1 >= set.length) {
      const s = finalScore({
        stats: player.stats,
        burnout: useCareerStore.getState().mental.burnout,
        showBonus: traitEffects().showBonus,
        setBonus: verdict.bonus,
        cuePoints,
        energies,
      });
      completeShow(venue, {
        score: s,
        setlist: set.map((x) => x.title),
        highlights: [...verdict.notes, ...highlights].slice(0, 6),
        moment: bigMoment,
      });
      setScore(s);
      setPhase('results');
      return;
    }
    setIndex(index + 1);
    setMomentEnergy(0);
    setPhase('ready');
  };

  // ─── Setlist ───
  if (phase === 'setlist') {
    return (
      <Screen scroll tint={COLORS.accent}>
        <ScreenHeader
          eyebrow={`${venue.kind === 'festival' ? 'FESTIVAL' : venue.kind === 'tour' ? 'TOUR STOP' : 'CLUB GIG'} · ${venue.crowd.toLocaleString('en-US')} PEOPLE`}
          title={venue.name}
          subtitle={`${venue.city}. Pick ${want} song${want === 1 ? '' : 's'}, in order. Open loud, save the hit for last.`}
          accent={COLORS.accent}
          right={<Orb3D size={52} color={COLORS.accent} icon="mic" />}
        />
        {set.length > 0 ? (
          <View style={styles.setRow}>
            {set.map((s, i) => (
              <PressableScale key={s.trackId} onPress={() => toggleSong(s)} style={styles.setChip}>
                <Text variant="label" color={COLORS.accent}>{`${i + 1}`}</Text>
                <Text variant="caption" weight="semibold" numberOfLines={1} style={styles.flex}>
                  {s.title}
                </Text>
                <Ionicons name="close" size={12} color={COLORS.textMuted} />
              </PressableScale>
            ))}
          </View>
        ) : null}
        {verdict.notes.length > 0 && set.length > 0 ? (
          <Text variant="caption" color={COLORS.textSecondary} center style={styles.small}>
            {verdict.notes.join(' ')}
          </Text>
        ) : null}

        <RuleLabel color={COLORS.accent}>YOUR SONGS</RuleLabel>
        {pool.map((s) => {
          const at = set.findIndex((x) => x.trackId === s.trackId);
          return (
            <PressableScale
              key={s.trackId}
              onPress={() => toggleSong(s)}
              style={[styles.songRow, at >= 0 && { borderColor: withAlpha(COLORS.accent, 0.6), backgroundColor: withAlpha(COLORS.accent, 0.1) }]}
            >
              <View style={[styles.slot, at >= 0 && { backgroundColor: COLORS.accent }]}>
                <Text variant="label" color={at >= 0 ? COLORS.bg : COLORS.textMuted}>
                  {at >= 0 ? `${at + 1}` : '+'}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text variant="body" weight="semibold" numberOfLines={1}>
                  {s.title}
                </Text>
                <View style={styles.heatTrack}>
                  <View style={[styles.heatFill, { width: `${s.heat}%` }]} />
                </View>
              </View>
              <Text variant="label" color={s.energy === 'high' ? COLORS.secondary : s.energy === 'low' ? COLORS.accent : COLORS.textSecondary}>
                {`${ENERGY_LABEL[s.energy]} · ${s.bpm}`}
              </Text>
            </PressableScale>
          );
        })}

        <View style={styles.footer}>
          <Button
            label={set.length < want ? `Pick ${want - set.length} more` : 'Take the stage'}
            icon="mic"
            variant="brand"
            size="lg"
            fullWidth
            disabled={set.length < want || want === 0}
            onPress={() => {
              setEnergy(Math.round(40 + set.reduce((a, s) => a + s.heat, 0) / set.length / 5));
              setPhase('ready');
            }}
          />
          <Button label="Skip it — let the night happen" variant="ghost" fullWidth onPress={skip} disabled={want === 0} />
          <Button label="Not now" variant="ghost" fullWidth onPress={onClose} />
        </View>
      </Screen>
    );
  }

  // ─── Results ───
  if (phase === 'results') {
    const s = score ?? 0;
    const stars = starsFor(s);
    return (
      <Screen scroll tint={COLORS.gold}>
        <ScreenHeader eyebrow={`LIVE AT ${venue.name.toUpperCase()}`} title={`${s}/100`} accent={COLORS.gold} right={<Orb3D size={52} color={COLORS.gold} icon="star" />} />
        <Text variant="display" center color={COLORS.gold} style={styles.stars}>
          {'★'.repeat(stars) + '☆'.repeat(5 - stars)}
        </Text>
        <Card accent={COLORS.gold}>
          <Text variant="body">{reviewFor(s)}</Text>
        </Card>
        {grades.length > 0 ? (
          <Text variant="caption" muted center style={styles.small}>
            {`Cues: ${grades.filter((g) => g === 'perfect').length} perfect · ${grades.filter((g) => g === 'great').length} great · ${grades.filter((g) => g === 'miss').length} missed`}
          </Text>
        ) : null}
        {[...verdict.notes, ...highlights].slice(0, 5).map((h) => (
          <Text key={h} variant="caption" color={COLORS.textSecondary} style={styles.small}>
            {`· ${h}`}
          </Text>
        ))}
        <Button label="Back to the Deck" variant="gold" size="lg" fullWidth onPress={onClose} style={styles.gap} />
      </Screen>
    );
  }

  // ─── Stage moment ───
  if (phase === 'moment' && moment) {
    return (
      <Screen scroll tint={COLORS.secondary}>
        <ScreenHeader eyebrow="ON STAGE" title="Something happens" accent={COLORS.secondary} right={<Orb3D size={52} color={COLORS.secondary} icon="flash" />} />
        <Card accent={COLORS.secondary}>
          <Text variant="body">{moment.prompt}</Text>
        </Card>
        {momentLine ? (
          <>
            <Card accent={momentEnergy >= 0 ? COLORS.positive : COLORS.negative}>
              <Text variant="body">{momentLine}</Text>
              <Text variant="label" color={momentEnergy >= 0 ? COLORS.positive : COLORS.negative} style={styles.small}>
                {`CROWD ${momentEnergy >= 0 ? '+' : '−'}${Math.abs(momentEnergy)}`}
              </Text>
            </Card>
            <Button label="Back to the music" icon="musical-notes" variant="brand" fullWidth onPress={() => setPhase('between')} />
          </>
        ) : (
          moment.options.map((o) => (
            <Button key={o.id} label={o.label} variant="secondary" fullWidth style={styles.gap} onPress={() => chooseMoment(o.id)} />
          ))
        )}
      </Screen>
    );
  }

  // ─── Between songs ───
  if (phase === 'between') {
    const last = index + 1 >= set.length;
    return (
      <Screen scroll tint={COLORS.accent}>
        <ScreenHeader eyebrow={`SONG ${index + 1} OF ${set.length}`} title={last ? 'That’s the set' : 'Breathe'} accent={COLORS.accent} right={<Orb3D size={52} color={COLORS.accent} icon="pulse" />} />
        <StatBar label="Crowd energy" value={energy} color={energy >= 60 ? COLORS.positive : energy >= 35 ? COLORS.warning : COLORS.negative} />
        <Button
          label={last ? 'Take a bow' : `Next: ${set[index + 1].title}`}
          icon={last ? 'star' : 'play'}
          variant="brand"
          size="lg"
          fullWidth
          onPress={nextSong}
          style={styles.gap}
        />
      </Screen>
    );
  }

  // ─── Ready / playing ───
  return (
    <SongStage
      key={set[index].trackId}
      song={set[index]}
      number={index + 1}
      total={set.length}
      energy={energy}
      venueName={venue.name}
      playing={phase === 'playing'}
      onStart={() => setPhase('playing')}
      onDone={finishSong}
    />
  );
}

/** One song on stage: the beat, the counter, the cues. */
function SongStage({
  song,
  number,
  total,
  energy,
  venueName,
  playing,
  onStart,
  onDone,
}: {
  song: ShowSong;
  number: number;
  total: number;
  energy: number;
  venueName: string;
  playing: boolean;
  onStart: () => void;
  onDone: (points: number, grades: CueGrade[]) => void;
}) {
  const beat = getBeat(song.beatId);
  const [mix, setMix] = useState<MixSettings>({ ...DEFAULT_MIX, beatVolume: 0.9 });
  const playback = useLayeredPlayback(beat?.asset ?? null, null, mix);
  const cues = useMemo(() => cuesForSong(song), [song]);
  const [graded, setGraded] = useState<(CueGrade | null)[]>(cues.map(() => null));
  const [clock, setClock] = useState(0);
  const startedAt = useRef<number | null>(null);
  const finished = useRef(false);
  const [mountedAt] = useState(() => Date.now());
  const [, force] = useState(0);
  const length = segmentSeconds(song.bpm);
  const loaded = playback.durationSec > 0 || Date.now() - mountedAt > 1800;

  // A steady clock while waiting for the beat to load and while playing.
  useEffect(() => {
    const t = setInterval(() => {
      if (startedAt.current !== null) setClock((Date.now() - startedAt.current) / 1000);
      else force((n) => n + 1);
    }, 60);
    return () => clearInterval(t);
  }, []);

  const pos = startedAt.current !== null ? clock : 0;
  const bar = barAt(pos, song.bpm);
  const beatNow = beatInBar(pos, song.bpm);
  const nextCue = cues.findIndex((_, i) => graded[i] === null);
  const cue = nextCue >= 0 ? cues[nextCue] : null;
  const cueLive = !!cue && bar >= cue.bar - 1;

  // Before the drop, the filter closes for a bar of tension.
  useEffect(() => {
    if (startedAt.current === null) return;
    if (bar === 3) setMix((m) => ({ ...m, filter: 0.28 }));
    if (bar === 4) setMix((m) => ({ ...m, filter: 0.5 }));
  }, [bar]);

  // A cue nobody hit is a miss once its moment has passed.
  useEffect(() => {
    if (!cue || startedAt.current === null) return;
    if (pos > cue.bar * (secondsPerBeat(song.bpm) * 4) + 0.6) {
      setGraded((g) => g.map((x, i) => (i === nextCue ? 'miss' : x)));
    }
  }, [pos, cue, nextCue, song.bpm]);

  // The segment ends: stop the band, score the song.
  useEffect(() => {
    if (startedAt.current === null || finished.current) return;
    if (pos >= length) {
      finished.current = true;
      playback.stop();
      const final = graded.map((g) => g ?? 'miss');
      onDone(final.reduce((a, g) => a + CUE_POINTS[g], 0), final);
    }
  }, [pos, length, graded, onDone, playback]);

  const start = () => {
    startedAt.current = Date.now();
    setClock(0);
    if (!playback.playing) playback.toggle();
    onStart();
  };

  const hit = () => {
    if (!cue || !cueLive) return;
    const grade = gradeOffset(offsetToBar(pos, song.bpm, cue.bar));
    setGraded((g) => g.map((x, i) => (i === nextCue ? grade : x)));
    if (cue.kind !== 'drop') {
      const fx = FX_MIX[cue.kind];
      setMix((m) => ({ ...m, ...fx }));
      setTimeout(() => setMix((m) => ({ ...m, filter: 0.5, echo: DEFAULT_MIX.echo, drive: DEFAULT_MIX.drive })), secondsPerBeat(song.bpm) * 2000);
    } else {
      setMix((m) => ({ ...m, filter: 0.5 }));
    }
  };

  const lastGrade = [...graded].reverse().find((g) => g !== null) ?? null;

  return (
    <Screen tint={COLORS.secondary}>
      <ScreenHeader
        eyebrow={`${venueName.toUpperCase()} · SONG ${number} OF ${total}`}
        title={song.title}
        subtitle={`${song.bpm} BPM · ${SEGMENT_BARS} bars`}
        accent={COLORS.secondary}
        right={<Orb3D size={52} color={COLORS.secondary} icon="musical-notes" />}
      />
      <StatBar label="Crowd energy" value={energy} color={energy >= 60 ? COLORS.positive : energy >= 35 ? COLORS.warning : COLORS.negative} />

      <View style={styles.stage}>
        <LinearGradient colors={GRADIENTS.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text variant="label" muted center>
          {playing ? `BAR ${Math.min(SEGMENT_BARS, bar + 1)} / ${SEGMENT_BARS}` : 'READY'}
        </Text>
        {/* The counter only moves while the music plays. */}
        <Grid columns={4} gap={SPACING.sm} style={styles.counter}>
          {[0, 1, 2, 3].map((b) => (
            <View
              key={b}
              style={[
                styles.beatDot,
                playing && beatNow === b && { backgroundColor: b === 0 ? COLORS.gold : COLORS.accent, borderColor: 'transparent' },
              ]}
            >
              <Text variant="subheading" color={playing && beatNow === b ? COLORS.bg : COLORS.textMuted}>
                {b + 1}
              </Text>
            </View>
          ))}
        </Grid>
        <Text variant="subheading" center color={cueLive ? COLORS.gold : COLORS.textSecondary} style={styles.cue}>
          {!playing ? 'Count yourself in. Tap the pad on the ONE when the cue lights up.' : cue ? (cueLive ? cue.prompt : 'Feel it…') : 'Ride it out.'}
        </Text>
        {lastGrade ? (
          <Text variant="label" center color={GRADE_COLOR[lastGrade]}>
            {lastGrade.toUpperCase()}
          </Text>
        ) : null}
      </View>

      {!playing ? (
        <Button
          label={loaded ? 'Start the song' : 'Tuning up…'}
          icon="play"
          variant="brand"
          size="lg"
          fullWidth
          disabled={!loaded}
          onPress={start}
        />
      ) : (
        <PressableScale onPress={hit} scaleTo={0.94} style={[styles.pad, cueLive && styles.padLive]}>
          <Text variant="title" color={cueLive ? COLORS.bg : COLORS.textMuted}>
            {cue ? (cue.kind === 'drop' ? 'HIT' : cue.kind.toUpperCase()) : '—'}
          </Text>
        </PressableScale>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { marginTop: SPACING.sm },
  small: { marginTop: SPACING.xs, lineHeight: 18 },
  stars: { fontSize: 34, lineHeight: 42, marginVertical: SPACING.sm },
  setRow: { gap: 6, marginBottom: SPACING.sm },
  setChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: withAlpha(COLORS.accent, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.4),
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  slot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heatTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 6, overflow: 'hidden' },
  heatFill: { height: 4, borderRadius: 2, backgroundColor: COLORS.secondary },
  footer: { marginTop: SPACING.lg, gap: SPACING.sm },
  stage: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginVertical: SPACING.base,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  counter: { marginTop: SPACING.base },
  beatDot: {
    height: 64,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cue: { marginTop: SPACING.base, minHeight: 44 },
  pad: {
    height: 120,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  padLive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
});
