import type { IdentitySnapshot } from '../../types/identity';
import type { HomeId } from '../../types/status';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useCareerStore } from '../../store/careerStore';
import { useLabelStore } from '../../store/labelStore';
import { useTourStore } from '../../store/tourStore';
import { usePressStore } from '../../store/pressStore';
import { usePeopleStore } from '../../store/peopleStore';
import { useStatusStore } from '../../store/statusStore';
import { useIdentityStore } from '../../store/identityStore';
import { useCalendarStore } from '../../store/calendarStore';
import { useLegalStore } from '../../store/legalStore';
import { useMogulStore } from '../../store/mogulStore';
import { useShowStore } from '../../store/showStore';
import { useWorldStore } from '../../store/worldStore';
import { activePeople, partnerOf } from '../life/peopleEngine';
import { ageAtWeek, lifeStageForAge } from '../life/age';
import { careerYear, yearWeek } from '../calendar/calendar';
import { hottestRival } from '../drama/publish';
import { traitsFromTags } from './traits';

const HOME_RANK: Record<HomeId, number> = {
  'childhood-bedroom': 0,
  'shared-apartment': 1,
  'own-place': 2,
  penthouse: 3,
  mansion: 4,
};

/**
 * One read-only picture of the whole career, for wants, dreams, earned
 * traits and challenges. Every predicate in data/identity and data/meta runs
 * against this, so they stay pure functions of a plain object.
 */
export function buildIdentitySnapshot(): IdentitySnapshot | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const game = useGameStore.getState();
  const music = useMusicStore.getState();
  const career = useCareerStore.getState();
  const calendar = useCalendarStore.getState();
  const identity = useIdentityStore.getState();
  const legal = useLegalStore.getState();
  const mogul = useMogulStore.getState();
  const shows = useShowStore.getState().history;
  const people = activePeople(usePeopleStore.getState().people);
  const status = useStatusStore.getState();

  const week = game.week;
  const age = ageAtWeek(player.startAge, week);
  const disc = music.discography;
  const latest = disc[0] ?? null;
  const nowEntries = music.chartHistory.filter((e) => e.week === week);
  const peaks = disc.map((t) => t.peakChartPosition).filter((p): p is number => p !== null);
  const lastRelease = music.lastRelease && latest && music.lastRelease.track.id === latest.id ? music.lastRelease : null;

  let controversiesSurvived = 0;
  let controversyActive = false;
  try {
    const press = usePressStore.getState();
    controversiesSurvived = press.controversies.filter((c) => c.resolved).length;
    controversyActive = press.activeControversies().length > 0;
  } catch {
    /* press optional */
  }

  const rival = hottestRival();
  const world = useWorldStore.getState().world;
  const roster = mogul.roster.filter((r) => r.status === 'active');
  const starSignees = roster.filter((r) => {
    const stage = world?.npcs[r.npcId]?.stage;
    return stage === 'star' || stage === 'legend';
  }).length;

  const parentAffinities = people.filter((p) => p.role === 'parent').map((p) => p.affinity);
  const exes = usePeopleStore.getState().people.filter((p) => p.role === 'ex').length;
  const historyBreakups = career.history.filter((h) => h.kind === 'breakup').length;

  return {
    week,
    yearWeek: yearWeek(week),
    careerYear: careerYear(week),
    age,
    lifeStage: lifeStageForAge(age).id,
    stats: player.stats,
    money: player.money,
    genre: player.genre,
    traits: traitsFromTags(game.playerTags),
    tags: game.playerTags,
    releases: disc.length,
    lastReleaseWeek: latest?.releasedAtWeek ?? null,
    lastReception: lastRelease?.reception ?? null,
    lastCritics: latest?.criticsScore ?? null,
    bestPositionNow: nowEntries.length > 0 ? Math.min(...nowEntries.map((e) => e.position)) : null,
    bestPositionEver: peaks.length > 0 ? Math.min(...peaks) : null,
    number1s: disc.filter((t) => t.peakChartPosition === 1).length,
    top10s: disc.filter((t) => t.peakChartPosition !== null && t.peakChartPosition <= 10).length,
    viral: disc.filter((t) => t.wentViral).length,
    totalStreams: disc.reduce((s, t) => s + t.totalStreams, 0),
    // A re-recorded song is reclaimed: its "(Your Version)" is what counts.
    labelOwnedTracks: disc.filter((t) => (t.owner === 'label' || t.owner === 'vault') && !t.rerecorded).length,
    rerecords: disc.filter((t) => t.rerecordOf).length,
    arcPhase: career.arc.phase,
    comebacks: career.arc.comebackCount,
    peakFans: Math.max(career.arc.peakFans, player.stats.fans),
    hasContract: useLabelStore.getState().hasContract(),
    onTour: useTourStore.getState().isOnTour(),
    toursDone: useTourStore.getState().tourHistory.filter((t) => t.status === 'completed').length,
    showsPlayed: shows.length,
    bestShow: shows.reduce((m, s) => Math.max(m, s.score), 0),
    festivalsPlayed: calendar.festivalHistory.length,
    headlinedFestival: calendar.festivalHistory.some((f) => f.slot === 'headliner'),
    nominations: calendar.awardHistory.length,
    nominatedNow:
      !!calendar.awards &&
      !calendar.awards.resolved &&
      calendar.awards.nominations.some((n) => n.nominees.some((x) => x.isPlayer)),
    awardsWon: calendar.awardHistory.filter((a) => a.won).length,
    bigAwardsWon: calendar.awardHistory.filter((a) => a.won && a.category === 'artist-of-the-year').length,
    lifetimeEarnings: career.economy.lifetimeEarnings,
    controversyActive,
    controversiesSurvived,
    warScore: rival ? rival.score : null,
    rivalName: rival?.name ?? null,
    charityActs: career.history.filter((h) => h.kind === 'charity').length,
    scandals: career.history.filter((h) => h.kind === 'scandal').length,
    partnerBond: partnerOf(people)?.bond ?? null,
    children: people.filter((p) => p.role === 'child').length,
    parentAffinity: parentAffinities.length > 0 ? Math.max(...parentAffinities) : null,
    friends: people.filter((p) => p.role === 'friend').length,
    breakups: Math.max(exes, historyBreakups),
    homeRank: HOME_RANK[status.homeId ?? 'shared-apartment'] ?? 1,
    luxuryCount: status.owned.length,
    statusScore: status.statusScore(),
    mental: career.mental,
    inJail: legal.activeCase?.stage === 'jailed',
    servedTime: legal.record.some((r) => r.outcome === 'served'),
    ownsLabel: mogul.label !== null,
    signees: roster.length,
    starSignees,
    ventures: mogul.ventures.filter((v) => v.status === 'running').length,
    eras: identity.eras.length,
    dreamsFulfilled: identity.dreamLog.filter((d) => d.fulfilled).length,
    wantsMet: identity.wantsMet,
  };
}
