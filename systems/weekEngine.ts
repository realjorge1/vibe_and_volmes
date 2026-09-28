import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useMusicStore } from '../store/musicStore';
import { useSocialStore } from '../store/socialStore';
import { useLabelStore } from '../store/labelStore';
import { useTourStore } from '../store/tourStore';
import { usePressStore } from '../store/pressStore';
import { useCareerStore } from '../store/careerStore';
import { useRivalryStore } from '../store/rivalryStore';
import { useLiveStore } from '../store/liveStore';
import { usePlanStore } from '../store/planStore';
import { useWorldStore } from '../store/worldStore';
import { awardWeeklyXp } from './progression/xpEngine';
import type { SocialReactionType } from '../types/events';
import { generateWeekEvents, type EventContext } from './events/eventEngine';
import { updateWeeklyCharts } from './charts/chartEngine';
import { buildWeeklyChartContext } from './charts/chartContext';
import { generateFeed } from './social/feedGenerator';
import { generateTrending, trendStreamMultiplier } from './social/trendEngine';
import { maybeIntroduceRival } from './relationships/relationshipEngine';
import { runPhase3Week } from './simulation/phase3Tick';
import { getCultureBias } from './culture/cultureEngine';
import { enhanceCurrentFeedAsync } from '../ai/pipelines/socialEnhancer';
import { pruneCache } from '../ai/cache/genCache';
import { weeklyStatDecay } from '../utils/statHelpers';
import { ageAtWeek, birthdayBeat, birthdayLines, lifeStageForAge } from './life/age';
import { useActivityStore } from '../store/activityStore';
import { usePeopleStore } from '../store/peopleStore';
import { ensureFamily, runPeopleWeek } from './life/peopleTick';
import { newcomerCandidates } from './life/lifeContext';
import { saveAll } from './persistence';

export function buildEventContext(): EventContext {
  const player = usePlayerStore.getState().player!;
  const game = useGameStore.getState();
  const music = useMusicStore.getState();
  const career = useCareerStore.getState();
  const culture = getCultureBias();
  const age = ageAtWeek(player.startAge, game.week);
  return {
    age,
    lifeStage: lifeStageForAge(age).id,
    people: usePeopleStore.getState().people,
    newcomers: newcomerCandidates(),
    stats: player.stats,
    week: game.week,
    tags: game.playerTags,
    hasReleasedTrack: music.hasReleasedTrack(),
    eventHistory: game.eventHistory,
    eventCooldowns: game.eventCooldowns,
    hasContract: useLabelStore.getState().hasContract(),
    onTour: useTourStore.getState().isOnTour(),
    controversyActive:
      usePressStore.getState().activeControversies().length > 0,
    careerPhase: career.arc.phase,
    mental: career.mental,
    rivalryIntensity: useRivalryStore.getState().hottestIntensity(),
    eraId: culture.eraId,
    genreSaturated:
      culture.playerGenreTrend === 'saturated' ||
      (culture.playerGenreHeat < 25 && culture.playerGenreTrend === 'cooling'),
    genreAscendant:
      culture.ascendantGenres.includes(
        usePlayerStore.getState().player!.genre
      ) &&
      (culture.playerGenreTrend === 'rising' ||
        culture.playerGenreTrend === 'hot' ||
        culture.playerGenreTrend === 'revival'),
  };
}

/** Refresh the social feed + trending from the current game state. */
export function refreshSocial(
  recentReactions: SocialReactionType[] = [],
  recentEventIds: string[] = []
): void {
  const player = usePlayerStore.getState().player;
  if (!player) return;
  const game = useGameStore.getState();
  const music = useMusicStore.getState();
  const social = useSocialStore.getState();

  const latestTrack = music.getLatestTrack();
  const hasActiveBeef = game.playerTags.some(
    (t) => t.includes('beef') || t.includes('feud')
  );

  // Trends first — the feed reads them so on-trend posts get discovery reach.
  const trending = generateTrending({
    player,
    week: game.week,
    recentReactions,
    recentEventIds,
    latestTrack,
    hasActiveBeef,
  });
  const posts = generateFeed({
    player,
    week: game.week,
    recentReactions,
    recentEventIds,
    latestTrack,
    trending,
  });

  social.setFeed(posts);
  social.setTrending(trending);
  social.addToHistory(posts);
  social.setLastGeneratedWeek(game.week);
}

/**
 * Weeks of NPC life simulated at world creation so the world already has a
 * past — momentum, fresh feuds, a few emergent stars — the very first time the
 * player opens the app, instead of a sterile freshly-generated cast.
 */
const WORLD_WARMUP_WEEKS = 8;

/**
 * Bring the Living World (NPC life engine) online for a save. Deterministic
 * from `seed` (the player's creation timestamp), so the same career always
 * grows the same world. Safe to call once per save; warms the world forward so
 * day one already feels lived-in, then persists it.
 */
export function bootstrapWorld(seed: number): void {
  const world = useWorldStore.getState();
  world.initWorld(seed);
  world.advanceWeeks(WORLD_WARMUP_WEEKS);
  world.saveWorld();
}

/** Generate the first week's slate right after onboarding. */
export function initializeFirstWeek(): void {
  // Spin up the living world alongside the player's career so rivals, trends
  // and relationships start evolving from week one.
  const player = usePlayerStore.getState().player;
  if (player && !useWorldStore.getState().world) {
    bootstrapWorld(player.createdAt);
  }
  // The family exists from the first week, before its first slate.
  ensureFamily();

  const ctx = buildEventContext();
  useGameStore.getState().setActiveEvents(generateWeekEvents(ctx));
  refreshSocial();
  // Anchor the live clock to "now" so a fresh career doesn't open with a
  // giant fake "while you were away" on the very first session.
  const now = Date.now();
  useLiveStore.getState().markSeen(now);
  useLiveStore.getState().setEnergyUpdatedAt(now);
  // Anchor the plan clock too, so a fresh career doesn't resolve a fake first
  // "while you were away" plan run.
  usePlanStore.getState().markResolved(now);
  saveAll();
}

/**
 * End-of-week transition. The player has resolved this week's events;
 * roll the world forward and stage the next week.
 *
 * Pass the reactions/event ids gathered from this week's resolved
 * events so social reflects what just happened.
 */
export function runWeekTransition(
  eventReactions: SocialReactionType[],
  eventIds: string[]
): void {
  // Activities done this week feed the same social mood as the events.
  const activity = useActivityStore.getState().drainPending();
  const recentReactions = [...eventReactions, ...activity.reactions];
  const recentEventIds = [...eventIds, ...activity.storyIds];

  const player = usePlayerStore.getState();
  const game = useGameStore.getState();
  const music = useMusicStore.getState();

  const current = player.player;
  if (!current) return;

  // Snapshot fans before the world rolls so XP can reward true growth.
  const fansBefore = current.stats.fans;

  // 1. Weekly stat decay (energy drains, low mental health worsens).
  const decay = weeklyStatDecay(current.stats);
  player.updateStats(
    (Object.entries(decay) as Array<[keyof typeof current.stats, number]>).map(
      ([stat, value]) => ({
        stat,
        delta: value - (current.stats[stat] as number),
      })
    )
  );

  // 2. Decay catalog streams + recompute charts for the upcoming week.
  //    Trends → charts: a hot song/meme trend on last week's board lifts the
  //    latest track's streams before the chart curve is applied, so cultural
  //    momentum shows up as chart movement.
  const prevTrending = useSocialStore.getState().trending;
  const latest = music.getLatestTrack();
  const trendMult = trendStreamMultiplier(prevTrending, latest, game.week + 1);
  const discography =
    trendMult > 1 && latest
      ? music.discography.map((t) =>
          t.id === latest.id
            ? { ...t, weeklyStreams: Math.round(t.weeklyStreams * trendMult) }
            : t
        )
      : music.discography;
  // Full multi-factor recompute: each track's decayed streams blend with this
  // week's live world state (reputation, label backing, trend) plus its own
  // persisted release factors. The trend lift doubles as the latest track's
  // fresh social buzz.
  const chartCtx = buildWeeklyChartContext(
    usePlayerStore.getState().player!.stats,
    latest?.id ?? null,
    Math.max(0, Math.min(100, (trendMult - 1) * 100))
  );
  const chartUpdate = updateWeeklyCharts(discography, game.week + 1, chartCtx);
  for (const t of chartUpdate.tracks) {
    music.updateTrack(t.id, t);
  }
  for (const entry of chartUpdate.entries) {
    music.addChartEntry(entry);
  }

  // 3. Organic relationship growth.
  maybeIntroduceRival(current);

  // 4. Advance the clock.
  game.advanceWeek();
  const newWeek = useGameStore.getState().week;

  // 4b. Birthdays lead the new week in the Deck, plus the life stage the
  //     artist just entered, if any. Age is derived from the week.
  const birthday = birthdayBeat(current.startAge, newWeek);
  if (birthday) {
    useGameStore.getState().addWeekSummaryNotes(birthdayLines(birthday), 'personal');
  }

  // 5. Phase 3 ecosystem tick: labels, tours, rivalries, PR, career arc,
  //    mental health, dynamic history — all resolved through the shared
  //    influence graph. Surface its notes in the week summary.
  const phase3 = runPhase3Week(newWeek);
  useGameStore.getState().addWeekSummaryNotes(phase3.notes);

  // 5b. The living world advances one week of its own life independently of the
  //     player. Surface its biggest story so on-going play also reveals that
  //     rivals, romances and careers out there kept moving without you.
  const worldEvents = useWorldStore.getState().advanceWeek();
  if (worldEvents.length > 0) {
    useGameStore.getState().addWeekSummaryNotes([`🌍 ${worldEvents[0].headline}`]);
  }

  // 5c. The artist's personal life: neglect, allowances, births, partners
  //     walking out, and headlines about the people they know.
  runPeopleWeek(newWeek, worldEvents);

  // 6. Stage next week's events (now aware of Phase 3 state).
  const ctx = buildEventContext();
  game.setActiveEvents(generateWeekEvents(ctx));

  // 7. Regenerate the social world reflecting what just happened,
  //    including the dramatic beats Phase 3 produced.
  refreshSocial(recentReactions, [...recentEventIds, ...phase3.socialBeats]);

  // 8. Phase 4: async AI immersion pass. Fire-and-forget — the template
  //    feed is already live; high-impact posts get rewritten in-place when
  //    generation resolves. Self-gates on impact/budget; $0 on quiet weeks.
  pruneCache(newWeek);
  enhanceCurrentFeedAsync(newWeek);

  // 9. Translate the week's true outcomes into XP / achievements — the
  //    progression dopamine spine. Reads resolved state, drives nothing.
  awardWeeklyXp(recentReactions, fansBefore);

  // 10. Persist everything.
  saveAll();
}
