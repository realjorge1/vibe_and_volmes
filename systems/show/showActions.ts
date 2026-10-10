import type { BeatGenre } from '../../types/audio';
import type { MusicGenre } from '../../types/player';
import type { MomentSpec } from '../../types/drama';
import type { ShowRecord, ShowSong, ShowVenue } from '../../types/show';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useAudioStore } from '../../store/audioStore';
import { useTourStore } from '../../store/tourStore';
import { useShowStore } from '../../store/showStore';
import { useCalendarStore } from '../../store/calendarStore';
import { useCareerStore } from '../../store/careerStore';
import { useLegalStore } from '../../store/legalStore';
import { getVenue } from '../../data/tour/venues';
import { beatsByGenre, getBeat } from '../../data/beats/beatCatalog';
import { festivalTonight, settleFestival } from '../calendar/calendarTick';
import { slotCrowd, slotLabel } from '../calendar/festivalEngine';
import { gigPayout, reviewFor, showFans, songEnergy, songHeat, starsFor } from './showEngine';
import { spawnMoment } from '../drama/publish';
import { awardXp } from '../progression/xpEngine';
import { XP_REWARDS } from '../../constants/progression';
import { checkIdentityNow } from '../identity/identityTick';
import { saveProgress } from '../persistence';
import { pick } from '../../utils/random';

/**
 * Live shows, applied: which shows are tonight, the songs the artist can put
 * in a set (each with a real beat, and their own vocal when they recorded
 * one), and settling the night into the tour, the festival or the gig.
 */

export const SHOW_ENERGY = 15;

const BEAT_GENRE: Record<MusicGenre, BeatGenre> = {
  'hip-hop': 'trap',
  pop: 'pop',
  'r&b': 'r&b',
  rock: 'indie',
  electronic: 'hyperpop',
  country: 'indie',
  latin: 'afrobeats',
  gospel: 'r&b',
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Every released song, as something the artist can play live. */
export function showSongs(): ShowSong[] {
  const player = usePlayerStore.getState().player;
  if (!player) return [];
  const disc = useMusicStore.getState().discography.filter((t) => !t.rerecorded);
  const produced = useAudioStore.getState().producedSongs;
  const maxStreams = disc.reduce((m, t) => Math.max(m, t.totalStreams), 0);
  return disc.map((t) => {
    const song = produced.find((p) => p.trackId === t.id);
    let beat = song ? getBeat(song.beatId) : null;
    if (!beat) {
      // A quick drop has no session; give it a beat in the artist's sound.
      const pool = beatsByGenre(BEAT_GENRE[player.genre]);
      beat = pool.length > 0 ? pool[hash(t.id) % pool.length] : null;
    }
    const bpm = beat?.bpm ?? 120;
    return {
      trackId: t.id,
      title: t.title,
      heat: songHeat(t, maxStreams),
      energy: songEnergy(bpm),
      bpm,
      beatId: beat?.id ?? null,
      vocalUri: song?.recordingUri ?? null,
    };
  });
}

/** Songs per set for a crowd this size. */
function setLength(capacity: number): number {
  if (capacity >= 30_000) return 5;
  if (capacity >= 2_000) return 4;
  return 3;
}

/** The shows the artist can play this week. */
export function showsTonight(): ShowVenue[] {
  const week = useGameStore.getState().week;
  const out: ShowVenue[] = [];
  if (useLegalStore.getState().activeCase?.stage === 'jailed') return out;

  const tour = useTourStore.getState().activeTour;
  if (tour && tour.status === 'active') {
    tour.stops.forEach((stop, i) => {
      if (stop.week !== week || stop.played || stop.liveScore != null) return;
      const venue = getVenue(stop.venueId);
      if (!venue) return;
      out.push({
        kind: 'tour',
        key: `${tour.id}:${i}`,
        name: venue.name,
        city: stop.city,
        capacity: venue.capacity,
        crowd: venue.capacity,
        setLength: setLength(venue.capacity),
        payout: 0,
        prestige: venue.prestige,
      });
    });
  }

  if (festivalTonight()) {
    const f = useCalendarStore.getState().festival!;
    const crowd = slotCrowd(f.slot!);
    out.push({
      kind: 'festival',
      key: `festival:${f.year}`,
      name: f.name,
      city: slotLabel(f.slot!),
      capacity: crowd,
      crowd,
      slot: f.slot!,
      setLength: setLength(crowd),
      payout: f.fee,
      prestige: f.slot === 'headliner' ? 95 : f.slot === 'sub-headliner' ? 75 : f.slot === 'mid' ? 55 : 35,
    });
  }

  const gig = useShowStore.getState().gig;
  if (gig && gig.week === week && !gig.played) {
    out.push({
      kind: 'gig',
      key: `gig:${gig.week}`,
      name: gig.venue,
      city: gig.city,
      capacity: gig.capacity,
      crowd: gig.capacity,
      setLength: setLength(gig.capacity),
      payout: gig.payout,
      prestige: gig.capacity >= 900 ? 40 : 20,
    });
  }
  return out;
}

const CLUBS = ['The Basement', 'Velvet Room', 'Echo Lounge', 'The Mint', 'Bottle & Bass', 'Room 9', 'The Annex'];

export type GigCheck = { ok: true } | { ok: false; reason: string };

export function canBookGig(): GigCheck {
  const player = usePlayerStore.getState().player;
  const week = useGameStore.getState().week;
  if (!player) return { ok: false, reason: 'No career in progress' };
  if (useLegalStore.getState().activeCase?.stage === 'jailed') return { ok: false, reason: 'Not from in here' };
  if (useMusicStore.getState().discography.length === 0) return { ok: false, reason: 'Release a song first' };
  const gig = useShowStore.getState().gig;
  if (gig && gig.week === week) return { ok: false, reason: gig.played ? 'One gig a week' : 'Already booked tonight' };
  if (useTourStore.getState().isOnTour()) return { ok: false, reason: 'You are on tour' };
  return { ok: true };
}

/** Book a club show for tonight. */
export function bookGig(): GigCheck {
  const check = canBookGig();
  if (!check.ok) return check;
  const player = usePlayerStore.getState().player!;
  const week = useGameStore.getState().week;
  const fans = player.stats.fans;
  const capacity = fans >= 50_000 ? 1_200 : fans >= 5_000 ? 400 : 150;
  useShowStore.getState().setGig({
    week,
    venue: pick(CLUBS),
    city: player.city.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    capacity,
    payout: gigPayout(capacity, fans),
    played: false,
  });
  useShowStore.getState().save();
  return { ok: true };
}

export interface ShowOutcome {
  score: number;
  setlist: string[];
  highlights: string[];
  /** The loudest stage moment, if one went big. */
  moment: MomentSpec | null;
}

/** Settle a played show into whatever it belongs to. */
export function completeShow(venue: ShowVenue, outcome: ShowOutcome): ShowRecord | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const week = useGameStore.getState().week;
  const score = Math.max(5, Math.min(100, Math.round(outcome.score)));
  const stars = starsFor(score);
  const review = reviewFor(score);
  usePlayerStore.getState().updateStats([{ stat: 'energy', delta: -SHOW_ENERGY }]);

  if (venue.kind === 'tour') {
    const [tourId, idx] = venue.key.split(':');
    const tour = useTourStore.getState().activeTour;
    if (tour && tour.id === tourId) useTourStore.getState().applyStopResult(Number(idx), { liveScore: score });
  } else if (venue.kind === 'festival') {
    settleFestival(score, true);
  } else {
    const gig = useShowStore.getState().gig;
    if (gig) {
      const pay = Math.round(gig.payout * (0.6 + score / 250));
      const fans = showFans(gig.capacity, score);
      usePlayerStore.getState().addMoney(pay);
      usePlayerStore.getState().updateStats([{ stat: 'fans', delta: fans }]);
      useCareerStore.getState().recordLedger({ week, amount: pay, kind: 'shows', note: `${gig.venue} gig` });
      useShowStore.getState().setGig({ ...gig, played: true });
    }
  }

  if (score >= 80) usePlayerStore.getState().updateStats([{ stat: 'charisma', delta: 1 }, { stat: 'fanLoyalty', delta: 2 }]);
  if (outcome.moment) spawnMoment(outcome.moment);

  const record: ShowRecord = {
    key: venue.key,
    kind: venue.kind,
    venue: venue.name,
    city: venue.city,
    week,
    score,
    stars,
    setlist: outcome.setlist,
    highlights: outcome.highlights,
    review,
  };
  useShowStore.getState().addRecord(record);
  awardXp('performance', Math.round(XP_REWARDS.performance * (0.5 + stars / 3)), `Live at ${venue.name}`);
  useGameStore
    .getState()
    .addStoryLine(`${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} Live at ${venue.name}: ${review}`, 'career', 'show');
  checkIdentityNow();
  saveProgress();
  return record;
}
