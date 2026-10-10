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
import { releaseProgressNote, rollBreakout } from './music/releaseCurve';
import { generateFeed } from './social/feedGenerator';
import { laneInput, syncCastLinks } from './social/celebContext';
import { everydayTrends } from './social/everyday';
import { celebTrends } from './social/celebFeed';
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
import { currentRival, newcomerCandidates, ownedAssetViews } from './life/lifeContext';
import { useStatusStore } from '../store/statusStore';
import { getHome } from '../data/life/homes';
import { ensureHome, runAssetWeek } from './life/assetTick';
import { fillFinalLine, rollEnding } from './life/endingEngine';
import { saveAll } from './persistence';
import { notifyNewWeek } from './notifications/triggers';
import { runDramaWeek } from './drama/dramaTick';
import { discourseInput } from './drama/publish';
import { useIdentityStore } from '../store/identityStore';
import { useLegalStore } from '../store/legalStore';
import { useMogulStore } from '../store/mogulStore';
import { getCharge } from '../data/legal/charges';
import { careerYear, isHolidaySeason, yearWeek } from './calendar/calendar';
import { runCalendarWeek, startCalendar, updateChartBoard } from './calendar/calendarTick';
import { runIdentityWeek, startIdentity } from './identity/identityTick';
import { runLegalWeek } from './legal/legalTick';
import { buybackPrice, heldMasters } from './music/royalties';
import { injectLegends, legendViews } from './meta/legends';

export function buildEventContext(): EventContext {
  const player = usePlayerStore.getState().player!;
  const game = useGameStore.getState();
  const music = useMusicStore.getState();
  const career = useCareerStore.getState();
  const culture = getCultureBias();
  const age = ageAtWeek(player.startAge, game.week);
  const identity = useIdentityStore.getState();
  const legalCase = useLegalStore.getState().activeCase;
  const mogul = useMogulStore.getState();
  const world = useWorldStore.getState().world;
  return {
    seeds: identity.seeds,
    npcStageOf: (id: string) => world?.npcs[id]?.stage,
    yearWeek: yearWeek(game.week),
    careerYear: careerYear(game.week),
    inJail: legalCase?.stage === 'jailed',
    casePending: legalCase?.stage === 'charged',
    chargeLabel: legalCase ? getCharge(legalCase.chargeId)?.label ?? null : null,
    eraPersona: identity.currentEra()?.persona ?? null,
    comebackActive: identity.comeback !== null,
    legends: legendViews(),
    ownsLabel: mogul.label !== null,
    labelName: mogul.label?.name ?? null,
    signees: mogul.activeRoster().map((r) => ({
      npcId: r.npcId,
      name: r.name,
      stage: world?.npcs[r.npcId]?.stage ?? r.lastStage,
    })),
    labelOwnsMasters: heldMasters(music.discography).length > 0,
    mastersPrice: buybackPrice(music.discography),
    playerName: player.artistName,
    age,
    lifeStage: lifeStageForAge(age).id,
    people: usePeopleStore.getState().people,
    newcomers: newcomerCandidates(),
    assets: ownedAssetViews(),
    homeId: useStatusStore.getState().homeId ?? 'shared-apartment',
    homeTitle: getHome(useStatusStore.getState().homeId ?? 'shared-apartment').title,
    rival: currentRival(),
    money: player.money,
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

  // The named artists keep living the same world artist's life from week to week.
  syncCastLinks();
  const lanes = laneInput();
  // Trends first — the feed reads them so on-trend posts get discovery reach.
  const own = generateTrending({
    player,
    week: game.week,
    recentReactions,
    recentEventIds,
    latestTrack,
    hasActiveBeef,
  });
  // The board also carries the world's trends (finals, finales, other artists): an
  // unknown artist's board is mostly the world, a star's is mostly them.
  const trending = lanes
    ? [...own, ...everydayTrends(game.week, lanes.baseYear), ...celebTrends(lanes.celeb)].sort((a, b) => b.volume - a.volume).slice(0, 10)
    : own;
  const posts = generateFeed({
    player,
    week: game.week,
    recentReactions,
    recentEventIds,
    latestTrack,
    trending,
    discourse: discourseInput(),
    lanes,
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
  // Past lives are part of this world from the start: legends still working,
  // estates still releasing.
  injectLegends(0);
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
  // The family and a home exist from the first week, before its first slate.
  ensureFamily();
  ensureHome(true);
  // The year begins, and the artist starts out wanting things.
  startCalendar(useGameStore.getState().week);
  startIdentity();

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

  // 2. Move catalog streams one week along + recompute charts for the
  //    upcoming week. New songs build by word of mouth before they fade, and
  //    an upcoming artist's song can break out while it builds.
  //    Trends → charts: a hot song/meme trend on last week's board lifts the
  //    latest track's streams before the chart curve is applied, so cultural
  //    momentum shows up as chart movement.
  const prevTrending = useSocialStore.getState().trending;
  const latest = music.getLatestTrack();
  const trendMult = trendStreamMultiplier(prevTrending, latest, game.week + 1);
  // Holiday songs come back every season (and a little bigger each year).
  const holiday = isHolidaySeason(game.week + 1);
  const discography = music.discography.map((t) => {
    const seasonal =
      holiday && t.seasonal === 'holiday' && game.week + 1 - t.releasedAtWeek >= 3
        ? {
            ...t,
            weeklyStreams: Math.max(t.weeklyStreams, Math.round(t.totalStreams * 0.12)),
            status: t.status === 'forgotten' || t.status === 'classic' ? ('fading' as const) : t.status,
          }
        : t;
    const lifted =
      trendMult > 1 && t.id === latest?.id
        ? { ...seasonal, weeklyStreams: Math.round(seasonal.weeklyStreams * trendMult) }
        : seasonal;
    return rollBreakout(lifted, game.week + 1 - t.releasedAtWeek) ?? lifted;
  });
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
  // Fans arrive with the plays, week by week, not all on release day.
  if (chartUpdate.fansGained > 0) {
    player.updateStats([{ stat: 'fans', delta: chartUpdate.fansGained }]);
  }
  const releaseNotes: string[] = [];
  for (const next of chartUpdate.tracks) {
    const prev = music.discography.find((t) => t.id === next.id);
    if (!prev || prev === next) continue;
    const position = chartUpdate.entries.find((e) => e.trackId === next.id)?.position ?? null;
    const fansWon = (next.fansEarned ?? 0) - (prev.fansEarned ?? 0);
    // Breakouts and chart moves for any song; plain growth for the latest only.
    const note = releaseProgressNote(prev, next, position, fansWon);
    if (note && (note.kind !== 'building' || next.id === latest?.id)) {
      releaseNotes.push(note.text);
    }
  }

  // 3. Organic relationship growth.
  maybeIntroduceRival(current);

  // 4. Advance the clock.
  game.advanceWeek();
  const newWeek = useGameStore.getState().week;
  useGameStore.getState().addWeekSummaryNotes(releaseNotes);

  // 4b. Birthdays lead the new week in the Deck, plus the life stage the
  //     artist just entered, if any. Age is derived from the week.
  const birthday = birthdayBeat(current.startAge, newWeek);
  if (birthday) {
    useGameStore.getState().addWeekSummaryNotes(birthdayLines(birthday), 'personal');
  }

  // 4c. The law moves first: verdicts land, sentences end, fugitives run.
  //     Everything after sees whether the artist is inside.
  runLegalWeek(newWeek);

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

  // 5b'. The chart board turns over: the artist's songs among the world's
  //      releases, and the chart day reveal when something moved.
  updateChartBoard(newWeek, chartUpdate.entries, worldEvents);

  // 5c. The artist's personal life: neglect, allowances, births, partners
  //     walking out, and headlines about the people they know.
  runPeopleWeek(newWeek, worldEvents);

  // 5d. What the artist owns costs upkeep; where they live moves their mood.
  runAssetWeek(newWeek);

  // 5e. The artist's public life: the rival war gets scored, the inbox fills
  //     up, the tabloids look for something. Before events and the feed, so
  //     both can see it.
  const dramaNotes = runDramaWeek(newWeek);
  if (dramaNotes.length > 0) {
    useGameStore.getState().addWeekSummaryNotes(dramaNotes, 'drama');
  }

  // 5f. The music year: lineup, festival, nominations, award night, the
  //     holidays, Wrapped.
  runCalendarWeek(newWeek);

  // 5g. Who the artist is: wants settle and refill, traits are earned, the
  //     dream is checked, the past ripens, the challenge advances.
  runIdentityWeek();

  // 6. Stage next week's events (now aware of Phase 3 state).
  const ctx = buildEventContext();
  game.setActiveEvents(generateWeekEvents(ctx));

  // 7. Regenerate the social world reflecting what just happened,
  //    including the dramatic beats Phase 3 produced.
  refreshSocial(recentReactions, [...recentEventIds, ...phase3.socialBeats]);
  // 7b. The artist's phone buzzes with the posts worth a push.
  notifyNewWeek();

  // 8. Phase 4: async AI immersion pass. Fire-and-forget — the template
  //    feed is already live; high-impact posts get rewritten in-place when
  //    generation resolves. Self-gates on impact/budget; $0 on quiet weeks.
  pruneCache(newWeek);
  enhanceCurrentFeedAsync(newWeek);

  // 9. Translate the week's true outcomes into XP / achievements — the
  //    progression dopamine spine. Reads resolved state, drives nothing.
  awardWeeklyXp(recentReactions, fansBefore);

  // 9b. Does the career end here? The last line goes in the Deck, and the
  //     end screen takes over from the next render.
  checkForEnding(newWeek);

  // 10. Persist everything.
  saveAll();
}

/**
 * Roll this week's endings. Kept separate from the transition so tests (and
 * a future "hardcore" mode) can call it directly.
 */
export function checkForEnding(week: number, rng: () => number = Math.random): boolean {
  const player = usePlayerStore.getState().player;
  const game = useGameStore.getState();
  if (!player || game.ending) return false;
  const age = ageAtWeek(player.startAge, week);
  const def = rollEnding(
    {
      week,
      age,
      stats: player.stats,
      mental: useCareerStore.getState().mental,
      tags: game.playerTags,
    },
    rng
  );
  if (!def) return false;
  game.setEnding({ id: def.id, week, age });
  game.addWeekSummaryNotes([fillFinalLine(def, player.artistName, age)], def.kind === 'died' ? 'drama' : 'personal');
  return true;
}
