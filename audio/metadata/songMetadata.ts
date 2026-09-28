import type { Player } from '../../types/player';
import type { Track } from '../../types/music';
import type {
  Beat,
  ProducedSong,
  SongDraft,
  SongScore,
  EmotionalTone,
  BeatMood,
} from '../../types/audio';
import { THEME_TONE } from '../../constants/audioConfig';
import { clamp } from '../../utils/random';

const MOOD_TONE: Record<BeatMood, EmotionalTone> = {
  dark: 'reflective',
  hype: 'euphoric',
  melodic: 'tender',
  sad: 'melancholic',
  romantic: 'tender',
  aggressive: 'angry',
  dreamy: 'reflective',
  triumphant: 'confident',
};

function deriveTone(draft: SongDraft, beat: Beat | null): EmotionalTone {
  if (draft.lyrics) return THEME_TONE[draft.lyrics.theme];
  if (beat) return MOOD_TONE[beat.mood];
  return 'confident';
}

/** Build the finalized song record from a draft + its evaluated score. */
export function buildProducedSong(args: {
  draft: SongDraft;
  player: Player;
  week: number;
  score: SongScore;
  beat: Beat | null;
}): ProducedSong {
  const { draft, player, week, score, beat } = args;
  const id = `song-${week}-${Date.now()}`;
  const durationSec = draft.recording?.durationSec ?? beat?.durationSec ?? 60;

  // Controversial if the take is divisive: low rep, diss energy, or a
  // critic/fan split wide enough to start arguments online.
  const split = Math.abs(score.critic - score.fan);
  const controversial =
    player.stats.reputation < 40 ||
    draft.lyrics?.theme === 'diss' ||
    split >= 28;

  return {
    id,
    trackId: `track-${id}`,
    title: draft.title.trim() || 'Untitled',
    genre: player.genre,
    beatId: draft.beatId,
    beatTitle: beat?.title ?? 'No beat',
    durationSec,
    recordingUri: draft.recording?.uri ?? null,
    peaks: draft.recording?.peaks ?? [],
    coverArtId: draft.coverArtId ?? 'cover-1',
    lyricsTheme: draft.lyrics?.theme ?? null,
    emotionalTone: deriveTone(draft, beat),
    mix: draft.mix,
    score,
    releasedAtWeek: week,
    releasedAt: Date.now(),
    popularity: clamp(Math.round(score.fan * 0.6 + score.viralPotential * 0.4), 1, 100),
    controversial,
    collaborators: draft.collaborators,
    rollout: draft.rollout,
    marketingBudget: draft.marketingBudget,
    exported: false,
    exportPath: null,
  };
}

/**
 * Project a produced song onto the Phase 1 `Track` model so charts, social
 * and discography keep working unchanged — the score *is* the track quality
 * here, instead of the random stat blend used by the quick-release path.
 */
export function producedSongToTrack(song: ProducedSong, week: number): Track {
  const s = song.score;
  return {
    id: song.trackId,
    title: song.title,
    type: 'single',
    genre: song.genre,
    releasedAtWeek: week,
    quality: s.overall,
    replayValue: s.replayability,
    originality: s.authenticity,
    mainstreamAppeal: clamp(
      Math.round(s.fan * 0.6 + s.breakdown.zeitgeist * 0.4),
      1,
      100
    ),
    peakChartPosition: null,
    peakFans: 0,
    weeklyStreams: 0,
    totalStreams: 0,
    status: 'charting',
    wentViral: false,
  };
}
