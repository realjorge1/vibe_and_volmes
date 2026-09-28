import type { InfluenceBundle } from '../../types/industry';
import type { CultureBias, GenreClimate, GenreTrend } from '../../types/culture';
import type { MusicGenre } from '../../types/player';
import { useCultureStore } from '../../store/cultureStore';
import { usePlayerStore } from '../../store/playerStore';
import { ERAS, getEra, nextEra, eraGenreFit } from '../../data/culture/eras';
import { addStat, note, beat } from '../simulation/influenceGraph';
import { clamp, chance } from '../../utils/random';

/**
 * Dynamic Culture & Era engine (Phase 5 deep vertical).
 *
 * Two responsibilities, cleanly separated:
 *  1. `weeklyCulture(bundle, week)` — ages the world. Drifts genre climate,
 *     rolls eras over on their own clock, and pushes MECHANICAL pressure
 *     (fan/stat deltas, history) ONLY through the shared InfluenceBundle —
 *     same contract as every Phase 3 system. Runs FIRST in phase3Tick
 *     because it is the most external pressure of all.
 *  2. `getCultureBias()` — a PURE read-only projection the scoring / trend /
 *     event engines consult so the same actions land differently in Year 1
 *     vs Year 15. It never mutates a store (it is a read, exactly like
 *     scoreEngine already reads player state).
 */

const TREND_ORDER: GenreTrend[] = [
  'rising',
  'hot',
  'cooling',
  'saturated',
  'revival',
];

function driftGenre(c: GenreClimate, ascendant: boolean): GenreClimate {
  let { heat, trend, weeksInTrend } = c;
  weeksInTrend += 1;

  // Trend governs the direction of the heat random-walk.
  const pull =
    trend === 'rising' || trend === 'revival'
      ? 4
      : trend === 'hot'
        ? 0
        : trend === 'cooling'
          ? -4
          : -6; // saturated bleeds out fastest
  const eraLift = ascendant ? 3 : -1;
  heat = clamp(
    Math.round(heat + pull + eraLift + (Math.random() * 6 - 3)),
    5,
    100
  );

  // Trend lifecycle: long enough in a trend (or hitting an extreme) rotates.
  const shouldRotate =
    weeksInTrend >= 6 + Math.floor(Math.random() * 6) ||
    (heat >= 92 && trend === 'hot') ||
    (heat <= 12 && trend === 'cooling');
  if (shouldRotate) {
    let nextTrend: GenreTrend;
    if (trend === 'rising') nextTrend = 'hot';
    else if (trend === 'hot') nextTrend = 'saturated';
    else if (trend === 'saturated') nextTrend = 'cooling';
    else if (trend === 'cooling')
      nextTrend = heat <= 25 && chance(0.4) ? 'revival' : 'rising';
    else nextTrend = 'rising'; // revival → rising
    trend = nextTrend;
    weeksInTrend = 0;
  }

  return { genre: c.genre, heat, trend, weeksInTrend };
}

/** Roll the era over to the next on the timeline; reseed ascendant heat. */
function advanceEra(week: number): { fromLabel: string; toLabel: string } | null {
  const store = useCultureStore.getState();
  const upcoming = nextEra(store.eraId);
  if (!upcoming) return null; // already at the final era — world stops aging
  const fromLabel = getEra(store.eraId).label;

  const history = store.eraHistory.map((h) =>
    h.eraId === store.eraId && h.endedWeek === null
      ? { ...h, endedWeek: week }
      : h
  );
  history.push({ eraId: upcoming.id, startedWeek: week, endedWeek: null });

  // The new era's ascendant genres get a cultural jolt; everything else cools
  // slightly — the sound of the moment genuinely changes.
  const reseeded = store.genreClimate.map((c) => {
    if (upcoming.ascendantGenres.includes(c.genre)) {
      return {
        genre: c.genre,
        heat: clamp(c.heat + 22, 40, 100),
        trend: 'rising' as GenreTrend,
        weeksInTrend: 0,
      };
    }
    return {
      genre: c.genre,
      heat: clamp(c.heat - 10, 5, 90),
      trend: 'cooling' as GenreTrend,
      weeksInTrend: 0,
    };
  });

  store.setState({
    eraId: upcoming.id,
    eraIndex: ERAS.findIndex((e) => e.id === upcoming.id),
    eraStartedWeek: week,
    weeksInEra: 0,
    eraHistory: history,
  });
  store.setGenreClimate(reseeded);
  return { fromLabel, toLabel: upcoming.label };
}

export function weeklyCulture(bundle: InfluenceBundle, week: number): void {
  const store = useCultureStore.getState();
  const era = getEra(store.eraId);
  const weeksInEra = store.weeksInEra + 1;

  // 1. Drift every genre's climate within the active era.
  const climate = store.genreClimate.map((c) =>
    driftGenre(c, era.ascendantGenres.includes(c.genre))
  );
  store.setGenreClimate(climate);
  store.setState({ weeksInEra });

  // 2. Era rollover. Past the soft minimum the chance ramps; at the hard
  //    maximum it is forced. The world ages whether the player likes it or not.
  let transitioned: { fromLabel: string; toLabel: string } | null = null;
  if (weeksInEra >= era.minWeeks) {
    const span = Math.max(1, era.maxWeeks - era.minWeeks);
    const progress = clamp((weeksInEra - era.minWeeks) / span, 0, 1);
    const rollChance = 0.02 + progress * 0.12;
    if (weeksInEra >= era.maxWeeks || chance(rollChance)) {
      transitioned = advanceEra(week);
    }
  }

  if (transitioned) {
    const newEra = getEra(useCultureStore.getState().eraId);
    note(
      bundle,
      `The culture shifted. ${transitioned.fromLabel} is over — welcome to ${transitioned.toLabel}. ${newEra.vibe}`
    );
    beat(bundle, 'era-shift');
    bundle.historyRecords.push({
      kind: 'statement',
      week,
      summary: `lived through the end of ${transitioned.fromLabel} into ${transitioned.toLabel}`,
      severity: 50,
      tags: ['era-shift', newEra.id],
      artistId: null,
    });
    bundle.addTags.push(`era:${newEra.id}`);
  }

  // 3. Mechanical pressure on the PLAYER's genre — through the bundle only.
  const player = usePlayerStore.getState().player;
  if (!player) return;
  const mine = useCultureStore
    .getState()
    .genreClimate.find((c) => c.genre === player.genre);
  if (!mine) return;
  const fit = eraGenreFit(era, player.genre);

  if (mine.trend === 'saturated' || (mine.heat < 25 && mine.trend === 'cooling')) {
    const sting = Math.round(player.stats.fans * 0.012) + 2;
    bundle.fansDelta -= sting;
    addStat(bundle, 'reputation', -1);
    if (chance(0.5))
      note(
        bundle,
        `${player.genre} feels played out right now — your sound is fighting the current.`
      );
  } else if (
    (mine.trend === 'rising' || mine.trend === 'hot' || mine.trend === 'revival') &&
    fit >= 1.15
  ) {
    const lift = Math.round(player.stats.fans * 0.01) + 2;
    bundle.fansDelta += lift;
    if (chance(0.4))
      note(
        bundle,
        `${player.genre} is the sound of the moment — the era is on your side.`
      );
  }
}

/**
 * Pure read-only cultural lens for the deterministic engines. Safe to call
 * anywhere; never mutates. Returns neutral values if there is no player yet.
 */
export function getCultureBias(): CultureBias {
  const store = useCultureStore.getState();
  const era = getEra(store.eraId);
  const player = usePlayerStore.getState().player;
  const genre: MusicGenre = player?.genre ?? 'pop';
  const mine = store.genreClimate.find((c) => c.genre === genre);

  return {
    eraId: era.id,
    eraLabel: era.label,
    playerGenreFit: eraGenreFit(era, genre),
    playerGenreHeat: mine?.heat ?? 50,
    playerGenreTrend: mine?.trend ?? 'hot',
    fanVolatility: era.fanVolatility,
    mediaHostility: era.mediaHostility,
    authenticityWeight: era.authenticityWeight,
    trendDescriptors: era.trendDescriptors,
    ascendantGenres: era.ascendantGenres,
  };
}
