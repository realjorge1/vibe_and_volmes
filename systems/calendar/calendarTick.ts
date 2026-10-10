import type { WorldEvent, Npc } from '../../types/world';
import type { ChartEntry } from '../../types/music';
import type { AwardResult } from '../../types/calendar';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useCareerStore } from '../../store/careerStore';
import { useCalendarStore } from '../../store/calendarStore';
import { useWorldStore } from '../../store/worldStore';
import { useShowStore } from '../../store/showStore';
import { usePressStore } from '../../store/pressStore';
import { useIdentityStore } from '../../store/identityStore';
import { useLegalStore } from '../../store/legalStore';
import { usePeopleStore } from '../../store/peopleStore';
import { useDramaStore } from '../../store/dramaStore';
import { CALENDAR, careerYear, isNewYearWeek, yearWeek } from './calendar';
import {
  AWARD_SHOW,
  campaignBonus,
  nominate,
  rollWinners,
  type AwardContext,
  type NpcCandidate,
} from './awardsEngine';
import { buildLineup, festivalName, slotCrowd, slotLabel } from './festivalEngine';
import { buildWrapped } from './wrapped';
import { buildBoard, chartDayBeat, type WorldRelease } from '../charts/chartBoard';
import { autoShowScore, showFans } from '../show/showEngine';
import { traitEffects } from '../identity/traits';
import { hottestRival, spawnMoment } from '../drama/publish';
import { awardXp } from '../progression/xpEngine';
import { pushNotification } from '../live/notify';
import { genreLabel } from '../../utils/formatters';
import { generateTrackTitle } from '../../utils/nameGenerator';
import { uid } from '../../utils/id';
import { pick } from '../../utils/random';
import { WEEKS_PER_YEAR } from '../../constants/gameConfig';

/**
 * The music year, applied in the week transition: the chart board turns over,
 * the lineup drops, the festival plays, nominations land, award night
 * happens, the holidays come, and Wrapped arrives when the year turns.
 */

/** Held from nominations to award night (events read it). */
export const NOMINATED_TAG = 'nominated-this-year';

function line(text: string, category: 'career' | 'opportunity' | 'drama' | 'personal' | 'social' = 'career'): void {
  useGameStore.getState().addStoryLine(text, category, 'calendar');
}

function worldArtists(): Npc[] {
  const world = useWorldStore.getState().world;
  if (!world) return [];
  return world.npcIds
    .map((id) => world.npcs[id])
    .filter((n): n is Npc => !!n && n.active && n.role === 'artist');
}

// ─── The chart board ──────────────────────────────────────────────────────────

/** Turn the board over for `week` from this week's chart entries. */
export function updateChartBoard(week: number, entries: ChartEntry[], worldEvents: WorldEvent[]): void {
  const player = usePlayerStore.getState().player;
  if (!player) return;
  const cal = useCalendarStore.getState();
  const music = useMusicStore.getState();
  const world = useWorldStore.getState().world;
  const npc = (id: string) => world?.npcs[id];

  const releases: WorldRelease[] = worldEvents
    .filter((e) => e.type === 'release' || e.type === 'debut' || e.type === 'comeback' || e.type === 'viral-moment')
    .map((e) => npc(e.primaryId))
    .filter((n): n is Npc => !!n && n.role === 'artist')
    .map((n) => ({
      npcId: n.id,
      artist: n.name,
      followers: n.social.followers,
      momentum: n.momentum,
      title: generateTrackTitle(n.genre ?? player.genre),
    }));
  const filler: WorldRelease[] = worldArtists()
    .sort((a, b) => b.social.followers - a.social.followers)
    .slice(0, 80)
    .map((n) => ({
      npcId: n.id,
      artist: n.name,
      followers: n.social.followers,
      momentum: n.momentum,
      title: generateTrackTitle(n.genre ?? player.genre),
    }));
  const rival = hottestRival();
  const existingRivalSong = cal.npcSongs.find((s) => s.rivalId === rival?.id);

  const weeksOn = (trackId: string) => music.chartHistory.filter((e) => e.trackId === trackId).length;
  const peakOf = (trackId: string) => music.discography.find((t) => t.id === trackId)?.peakChartPosition ?? null;

  const { board, pool } = buildBoard({
    week,
    prev: cal.chart,
    pool: cal.npcSongs,
    playerName: player.artistName,
    playerEntries: entries.map((e) => ({
      trackId: e.trackId,
      title: e.trackTitle,
      position: e.position,
      streams: e.streams,
      peak: peakOf(e.trackId),
      weeksOn: weeksOn(e.trackId),
    })),
    releases,
    filler,
    rival: rival
      ? {
          id: rival.id,
          name: rival.name,
          fans: rival.fans,
          title: existingRivalSong?.title ?? generateTrackTitle(player.genre),
        }
      : null,
    rng: Math.random,
  });
  cal.setChart(board, pool);

  // A chart week worth stopping for gets the reveal.
  const lastWeek = new Map<string, number>();
  for (const e of music.chartHistory) {
    if (e.week === week - 1 && !lastWeek.has(e.trackId)) lastWeek.set(e.trackId, e.position);
  }
  const beat = chartDayBeat(entries, lastWeek);
  if (beat) cal.setChartDay({ week, seen: false, beat });
}

// ─── Awards ───────────────────────────────────────────────────────────────────

function awardContext(): AwardContext | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const week = useGameStore.getState().week;
  const since = week - WEEKS_PER_YEAR;
  const music = useMusicStore.getState();
  const shows = useShowStore.getState().history.filter((s) => s.week > since);
  const cal = useCalendarStore.getState();
  return {
    playerName: player.artistName,
    careerYear: careerYear(week),
    genreLabel: genreLabel(player.genre),
    fans: player.stats.fans,
    reputation: player.stats.reputation,
    industryRespect: player.stats.industryRespect,
    charisma: player.stats.charisma,
    vocalSkill: player.stats.vocalSkill,
    songs: music.discography
      .filter((t) => t.releasedAtWeek > since)
      .map((t) => ({ title: t.title, critics: t.criticsScore ?? 50, peak: t.peakChartPosition, viral: t.wentViral })),
    bestShow: shows.reduce((m, s) => Math.max(m, s.score), 0),
    showsThisYear: shows.length,
    hadBestNew: cal.awardHistory.some((a) => a.category === 'best-new-artist' && a.won),
  };
}

function npcCandidates(): NpcCandidate[] {
  const genre = usePlayerStore.getState().player?.genre ?? 'pop';
  return worldArtists().map((n) => ({
    npcId: n.id,
    name: n.name,
    genre: n.genre,
    followers: n.social.followers,
    talent: n.reputation.talent,
    marketability: n.reputation.marketability,
    influence: n.reputation.influence,
    momentum: n.momentum,
    stage: n.stage,
    work: generateTrackTitle(n.genre ?? genre),
  }));
}

function announceNominations(week: number): void {
  const ctx = awardContext();
  const player = usePlayerStore.getState().player;
  if (!ctx || !player) return;
  const noms = nominate(ctx, npcCandidates(), player.genre);
  const cal = useCalendarStore.getState();
  cal.setAwards({
    year: careerYear(week),
    show: AWARD_SHOW,
    nominations: noms,
    campaign: 0,
    results: null,
    attended: false,
    resolved: false,
    redCarpet: null,
  });
  const mine = noms.filter((n) => n.nominees.some((x) => x.isPlayer));
  if (mine.length > 0) {
    useGameStore.getState().addTag(NOMINATED_TAG);
    line(
      `✦ Nominated: ${mine.length} ${AWARD_SHOW.replace('The ', '')} nomination${mine.length > 1 ? 's' : ''} — ${mine.map((n) => n.label).join(', ')}. Award night is in two weeks.`,
      'opportunity'
    );
    pushNotification({
      kind: 'achievement',
      title: `${mine.length} nomination${mine.length > 1 ? 's' : ''}`,
      body: mine.map((n) => n.label).join(' · '),
      color: '#FFCE5C',
    });
  } else if (ctx.songs.length > 0) {
    const aoty = noms.find((n) => n.category === 'artist-of-the-year');
    const lead = aoty?.nominees[0]?.name;
    line(`${AWARD_SHOW} nominations dropped. Your name isn't on them.${lead ? ` ${lead} leads Artist of the Year.` : ''}`, 'career');
  }
}

/** The artist's edge with voters on the night: traits, campaign, minus scandal. */
export function awardsEdge(): number {
  const cal = useCalendarStore.getState();
  let heat = 0;
  try {
    heat = usePressStore.getState().activeControversies().reduce((m, c) => Math.max(m, c.heat), 0);
  } catch {
    /* press optional */
  }
  return traitEffects().awardsBonus + campaignBonus(cal.awards?.campaign ?? 0) - heat / 10;
}

/** Roll the night's winners once (opening the night, or the week it passes). */
export function rollAwardNight(): AwardResult[] | null {
  const cal = useCalendarStore.getState();
  const a = cal.awards;
  if (!a) return null;
  if (a.results) return a.results;
  const results = rollWinners(a.nominations, awardsEdge());
  cal.patchAwards({ results });
  return results;
}

/** Book the results: trophies, history, fans, the moment. */
export function applyAwardResults(attended: boolean): void {
  const cal = useCalendarStore.getState();
  const a = cal.awards;
  const player = usePlayerStore.getState().player;
  if (!a || a.resolved || !player) return;
  const results = a.results ?? rollAwardNight() ?? [];
  const week = useGameStore.getState().week;
  const records = results
    .filter((r) => r.playerNominated)
    .map((r) => ({
      year: a.year,
      category: r.category,
      label: r.label,
      won: r.playerWon,
      work: a.nominations.find((n) => n.category === r.category)?.nominees.find((x) => x.isPlayer)?.work,
    }));
  cal.addAwardRecords(records);
  cal.patchAwards({ resolved: true, attended });
  useGameStore.getState().removeTag(NOMINATED_TAG);

  const wins = results.filter((r) => r.playerWon);
  for (const w of wins) {
    const big = w.category === 'artist-of-the-year';
    usePlayerStore.getState().updateStats([
      { stat: 'fans', delta: Math.round(2_000 + player.stats.fans * (big ? 0.08 : 0.03)) },
      { stat: 'industryRespect', delta: big ? 8 : 4 },
      { stat: 'reputation', delta: big ? 4 : 2 },
    ]);
    useCareerStore.getState().addHistory({
      id: uid('hist'),
      kind: 'award',
      week,
      summary: `won ${w.label} at ${a.show}`,
      severity: big ? 92 : 72,
      tags: ['award', w.category],
      artistId: null,
      resurfacedCount: 0,
      buried: false,
    });
    awardXp('milestone', big ? 500 : 250, `${w.label}`);
  }
  if (wins.length > 0) {
    const big = wins.some((w) => w.category === 'artist-of-the-year');
    spawnMoment({
      kind: 'best',
      headline: big
        ? '{playerName} wins Artist of the Year'
        : `{playerName} wins ${wins.map((w) => w.label).join(' and ')}`,
      topic: big ? 'Artist of the Year' : 'the win',
      heat: big ? 90 : 60,
      valence: 75,
      hashtag: 'Meridians',
      tags: ['award'],
    });
    if (!attended) {
      line(`✦ You won ${wins.map((w) => w.label).join(', ')} at ${a.show}. Someone else accepted it for you.`, 'opportunity');
    }
  } else if (records.length > 0) {
    useCareerStore.getState().adjustMental({ depression: 4 });
    if (!attended) line(`${a.show} came and went. ${records.length} nomination${records.length > 1 ? 's' : ''}, no wins.`, 'career');
  } else {
    const aoty = results.find((r) => r.category === 'artist-of-the-year');
    if (aoty) line(`${aoty.winner.name} won Artist of the Year at ${a.show}. You watched from the couch.`, 'social');
  }
}

/** Pay for a "for your consideration" push before the night. */
export function runAwardsCampaign(spend: number): boolean {
  const cal = useCalendarStore.getState();
  const player = usePlayerStore.getState().player;
  if (!cal.awards || cal.awards.results || !player || spend <= 0 || player.money < spend) return false;
  usePlayerStore.getState().addMoney(-spend);
  useCareerStore.getState().recordLedger({
    week: useGameStore.getState().week,
    amount: -spend,
    kind: 'pr',
    note: 'Awards campaign',
  });
  cal.patchAwards({ campaign: cal.awards.campaign + spend });
  return true;
}

/** Is tonight award night (and the artist hasn't been through it yet)? */
export function awardNightTonight(): boolean {
  const week = useGameStore.getState().week;
  const a = useCalendarStore.getState().awards;
  return !!a && !a.resolved && yearWeek(week) === CALENDAR.awards && a.nominations.some((n) => n.nominees.some((x) => x.isPlayer));
}

// ─── Festival ─────────────────────────────────────────────────────────────────

function announceLineup(week: number): void {
  const player = usePlayerStore.getState().player;
  if (!player) return;
  const year = careerYear(week);
  const name = festivalName(year);
  const inJail = useLegalStore.getState().activeCase?.stage === 'jailed';
  const lineup = buildLineup(
    worldArtists().map((n) => ({ name: n.name, followers: n.social.followers })),
    { name: player.artistName, followers: inJail ? 0 : player.stats.fans }
  );
  useCalendarStore.getState().setFestival({
    year,
    name,
    tiers: lineup.tiers,
    slot: lineup.slot,
    fee: lineup.fee,
    accepted: lineup.slot ? null : false,
    week: week + (CALENDAR.festival - CALENDAR.lineup),
    played: false,
    score: null,
  });
  if (lineup.slot) {
    line(
      `✦ The ${name} lineup dropped, and your name is on it: ${slotLabel(lineup.slot).toLowerCase()}. They're offering $${lineup.fee.toLocaleString('en-US')}.`,
      'opportunity'
    );
    pushNotification({ kind: 'info', title: `${name} wants you`, body: `${slotLabel(lineup.slot)} · $${lineup.fee.toLocaleString('en-US')}`, color: '#FF8A3D' });
  } else if (useMusicStore.getState().discography.length > 0) {
    line(`The ${name} lineup dropped. You're not on it. Yet.`, 'career');
  }
}

/** Accept or turn down the slot. */
export function answerFestival(accept: boolean): boolean {
  const cal = useCalendarStore.getState();
  const f = cal.festival;
  if (!f || !f.slot || f.accepted !== null) return false;
  cal.patchFestival({ accepted: accept });
  line(
    accept
      ? `You said yes to ${f.name}. ${slotLabel(f.slot)}, festival weekend.`
      : `You passed on ${f.name}. Some slots are worth more as a no.`,
    'career'
  );
  return true;
}

/** Pay the artist for a played festival set (by the show screen or the auto-sim). */
export function settleFestival(score: number, played: boolean): void {
  const cal = useCalendarStore.getState();
  const f = cal.festival;
  const player = usePlayerStore.getState().player;
  if (!f || !f.slot || !f.accepted || f.played || !player) return;
  const week = useGameStore.getState().week;
  const fans = showFans(slotCrowd(f.slot), score);
  usePlayerStore.getState().addMoney(f.fee);
  usePlayerStore.getState().updateStats([
    { stat: 'fans', delta: fans },
    { stat: 'charisma', delta: score >= 75 ? 1 : 0 },
  ]);
  useCareerStore.getState().recordLedger({ week, amount: f.fee, kind: 'shows', note: `${f.name} (${slotLabel(f.slot)})` });
  cal.patchFestival({ played: true, score });
  cal.addFestivalRecord({ year: f.year, name: f.name, slot: f.slot, score });
  if (!played) {
    line(`You played ${f.name}. ${score >= 70 ? 'A strong set' : score >= 45 ? 'A decent set' : 'A rough set'} — ${fans.toLocaleString('en-US')} new fans and $${f.fee.toLocaleString('en-US')}.`);
  }
  if (f.slot === 'headliner') {
    useCareerStore.getState().addHistory({
      id: uid('hist'),
      kind: 'triumph',
      week,
      summary: `headlined ${f.name}`,
      severity: 85,
      tags: ['festival', 'headliner'],
      artistId: null,
      resurfacedCount: 0,
      buried: false,
    });
  }
}

/** Is the festival set this week? */
export function festivalTonight(): boolean {
  const f = useCalendarStore.getState().festival;
  const week = useGameStore.getState().week;
  return !!f && !!f.slot && f.accepted === true && !f.played && week === f.week;
}

// ─── Wrapped ──────────────────────────────────────────────────────────────────

/** Snapshot the numbers as a year begins. */
export function startYear(week: number): void {
  const player = usePlayerStore.getState().player;
  if (!player) return;
  const music = useMusicStore.getState();
  useCalendarStore.getState().setYearStart({
    year: careerYear(week),
    week,
    fans: player.stats.fans,
    lifetimeEarnings: useCareerStore.getState().economy.lifetimeEarnings,
    trackStreams: Object.fromEntries(music.discography.map((t) => [t.id, t.totalStreams])),
    releases: music.discography.length,
  });
}

function closeYear(week: number): void {
  const cal = useCalendarStore.getState();
  const start = cal.yearStart;
  const player = usePlayerStore.getState().player;
  if (!start || !player) return;
  const since = start.week;
  const shows = useShowStore.getState().history.filter((s) => s.week >= since);
  const awards = cal.awardHistory.filter((a) => a.year === start.year);
  const moment = [...useDramaStore.getState().moments, ...useDramaStore.getState().archive]
    .filter((m) => m.week >= since)
    .sort((a, b) => b.peak - a.peak)[0];
  const artists = worldArtists();
  const position = artists.filter((n) => n.social.followers > player.stats.fans).length + 1;
  const newPeople = usePeopleStore
    .getState()
    .people.filter((p) => p.sinceWeek >= since && p.role !== 'child')
    .map((p) => p.name);
  const wantsMet = useIdentityStore
    .getState()
    .wantLog.filter((w) => w.week >= since && (w.outcome === 'met' || w.outcome === 'faced')).length;
  const card = buildWrapped({
    start,
    age: player.startAge + start.year - 1,
    fans: player.stats.fans,
    lifetimeEarnings: useCareerStore.getState().economy.lifetimeEarnings,
    tracks: useMusicStore.getState().discography,
    showScores: shows.map((s) => s.score),
    awardsWon: awards.filter((a) => a.won).length,
    nominations: awards.length,
    biggestMoment: moment?.headline.replace(/\{playerName\}/g, player.artistName) ?? null,
    rank: { position, of: artists.length + 1 },
    newPeople,
    wantsMet,
  });
  cal.setWrapped(card);
  line(`✦ Your year ${start.year} in music is ready. Tap Wrapped.`, 'opportunity');
  pushNotification({ kind: 'info', title: `Your Year ${start.year} Wrapped`, body: 'Your year in music is ready.', color: '#FF4FA3' });
}

// ─── The weekly turn ──────────────────────────────────────────────────────────

/**
 * After the clock moves into `week`. Settles last week's festival/awards if
 * the artist didn't play them, then opens this week's tentpole.
 */
export function runCalendarWeek(week: number): void {
  const yw = yearWeek(week);
  const cal = useCalendarStore.getState();
  const player = usePlayerStore.getState().player;
  if (!player) return;

  if (isNewYearWeek(week)) {
    closeYear(week);
    startYear(week);
  } else if (!cal.yearStart) {
    startYear(week);
  }

  // A festival weekend the artist booked but didn't play themselves.
  const f = useCalendarStore.getState().festival;
  if (f && f.slot && f.accepted === true && !f.played && week > f.week) {
    const score = autoShowScore(player.stats, useCareerStore.getState().mental.burnout, traitEffects().showBonus);
    settleFestival(score, false);
  }
  if (f && f.slot && f.accepted === null && week >= f.week) {
    useCalendarStore.getState().patchFestival({ accepted: false });
    line(`You never answered ${f.name}. They gave the slot to someone who did.`, 'career');
  }

  // Award night came and went without the artist walking through it.
  const a = useCalendarStore.getState().awards;
  if (a && !a.resolved && week > (a.year - 1) * WEEKS_PER_YEAR + CALENDAR.awards) {
    // Walked the carpet but left before the end: they were still there.
    applyAwardResults(!!a.redCarpet);
  }

  if (yw === CALENDAR.lineup) announceLineup(week);
  if (yw === CALENDAR.festival && festivalTonight()) {
    const fest = useCalendarStore.getState().festival!;
    line(`Festival weekend. ${fest.name} is tonight. Build your set.`, 'opportunity');
  }
  if (yw === CALENDAR.nominations) announceNominations(week);
  if (yw === CALENDAR.awards) {
    const awards = useCalendarStore.getState().awards;
    if (awards && awards.nominations.some((n) => n.nominees.some((x) => x.isPlayer))) {
      line(`Award night. ${awards.show} is tonight. Get dressed.`, 'opportunity');
    } else if (awards) {
      applyAwardResults(false);
    }
  }
  if (yw === CALENDAR.holidayStart) {
    const holiday = useMusicStore.getState().discography.filter((t) => t.seasonal === 'holiday');
    line(
      holiday.length > 0
        ? `Holiday season. "${pick(holiday).title}" is creeping back onto every playlist.`
        : 'Holiday season. The same twelve Christmas songs are back on every playlist.',
      'social'
    );
  }
}

/** The first week of a life: the year begins. */
export function startCalendar(week: number): void {
  startYear(week);
}
