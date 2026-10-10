import type {
  CareerDossier,
  IdentityLabel,
  IdentityVerdict,
  LegacyScore,
  LegacyTier,
  LegendaryMoment,
} from '../../types/legacy';
import type { HistoryRecord } from '../../types/industry';
import { usePlayerStore } from '../../store/playerStore';
import { useCareerStore } from '../../store/careerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useCultureStore } from '../../store/cultureStore';
import { getEra } from '../../data/culture/eras';
import { buildDocumentary } from './documentaryEngine';
import { useCalendarStore } from '../../store/calendarStore';
import { useIdentityStore } from '../../store/identityStore';
import { getDream } from '../../data/identity/dreams';
import { clamp } from '../../utils/random';

/**
 * The Chronicle is a PURE PROJECTOR. It reads only data the deterministic
 * sim already recorded (careerStore.history/arc/economy, musicStore charts,
 * cultureStore eras) and derives the retrospective. It NEVER mutates a store
 * or influences the sim — same decorator contract as the Phase 4 AI layer.
 * Deleting this whole folder would not change a single mechanical outcome.
 */

const TIER_THRESHOLDS: [LegacyTier, number][] = [
  ['immortal', 850],
  ['legend', 680],
  ['icon', 520],
  ['star', 370],
  ['respected', 230],
  ['footnote', 110],
  ['forgotten', 0],
];

function tierFor(total: number): LegacyTier {
  return (TIER_THRESHOLDS.find(([, min]) => total >= min) ?? ['forgotten', 0])[0];
}

function fameCurve(fans: number): number {
  if (fans <= 0) return 0;
  return clamp((Math.log10(fans + 1) / Math.log10(200_000_000)) * 100, 0, 100);
}

export function computeLegacy(): LegacyScore {
  const player = usePlayerStore.getState().player;
  const career = useCareerStore.getState();
  const music = useMusicStore.getState();
  const game = useGameStore.getState();

  const peakFans = Math.max(career.arc.peakFans, player?.stats.fans ?? 0);
  const weeksActive = Math.max(1, game.week);

  // Fame — how big they ever got.
  const fameComponent = Math.round(fameCurve(peakFans) * 2.6); // 0..260

  // Longevity — surviving the years and the eras is itself legendary.
  const erasLived = useCultureStore.getState().eraHistory.length;
  const longevityComponent = Math.round(
    clamp(weeksActive / 3, 0, 130) + erasLived * 20 + career.arc.comebackCount * 22
  ); // ~0..240

  // Influence — industry respect + classic records that outlived their week.
  const classics = music.discography.filter(
    (t) => t.status === 'classic' || t.wentViral
  ).length;
  // Trophies and dreams that came true are what people remember a life by.
  const trophies = useCalendarStore.getState().awardHistory.filter((a) => a.won).length;
  const dreamLegacy = useIdentityStore
    .getState()
    .dreamLog.filter((d) => d.fulfilled)
    .reduce((sum, d) => sum + (getDream(d.defId)?.legacy ?? 0), 0);
  const influenceComponent = Math.round(
    (player?.stats.industryRespect ?? 0) * 1.4 + classics * 18 + clamp(trophies * 25 + dreamLegacy, 0, 160)
  ); // ~0..380

  // Artistry — the craft stats, weighted toward what endures.
  const s = player?.stats;
  const artistryComponent = s
    ? Math.round(
        (s.creativity * 0.4 + s.authenticity * 0.35 + s.writing * 0.25) * 1.6
      )
    : 0; // 0..160

  // Notoriety — drama is legacy too. Big scandals/feuds count, capped.
  const drama = career.history
    .filter((h) => ['scandal', 'feud', 'betrayal'].includes(h.kind))
    .reduce((sum, h) => sum + h.severity, 0);
  const notorietyComponent = Math.round(clamp(drama / 6, 0, 120)); // 0..120

  const total = clamp(
    fameComponent +
      longevityComponent +
      influenceComponent +
      artistryComponent +
      notorietyComponent,
    0,
    1000
  );

  return {
    total,
    fameComponent,
    longevityComponent,
    influenceComponent,
    artistryComponent,
    notorietyComponent,
    tier: tierFor(total),
  };
}

export const IDENTITY_TITLES: Record<IdentityLabel, string> = {
  'authentic-legend': 'The Authentic Legend',
  'industry-puppet': 'The Industry Puppet',
  'chaotic-genius': 'The Chaotic Genius',
  'cancelled-icon': 'The Cancelled Icon',
  'commercial-sellout': 'The Commercial Sellout',
  'cult-favorite': 'The Cult Favorite',
  'one-hit-wonder': 'The One-Hit Wonder',
  'untouchable-mogul': 'The Untouchable Mogul',
  'tragic-prodigy': 'The Tragic Prodigy',
  journeyman: 'The Journeyman',
};

/**
 * Identity EMERGES from the run — never chosen. Each candidate scores against
 * the career's shape; the strongest wins. Pure read.
 */
export function deriveIdentity(): IdentityVerdict {
  const player = usePlayerStore.getState().player;
  const career = useCareerStore.getState();
  const music = useMusicStore.getState();
  const s = player?.stats;

  const scandals = career.history.filter((h) =>
    ['scandal', 'betrayal'].includes(h.kind)
  ).length;
  const feuds = career.history.filter((h) => h.kind === 'feud').length;
  const classics = music.discography.filter(
    (t) => t.status === 'classic'
  ).length;
  const viral = music.discography.filter((t) => t.wentViral).length;
  const auth = s?.authenticity ?? 50;
  const repu = s?.reputation ?? 50;
  const creativity = s?.creativity ?? 50;
  const respect = s?.industryRespect ?? 0;
  const fans = s?.fans ?? 0;
  const net = career.economy.lifetimeEarnings;
  const comebacks = career.arc.comebackCount;

  const scores: Record<IdentityLabel, number> = {
    'authentic-legend': auth * 1.4 + classics * 25 + (fans > 5_000_000 ? 60 : 0),
    'industry-puppet': respect * 1.5 + (auth < 40 ? 50 : 0) - classics * 10,
    'chaotic-genius': creativity * 1.3 + scandals * 22 + (auth > 55 ? 30 : 0),
    'cancelled-icon': scandals * 35 + (repu < 35 ? 60 : 0) + feuds * 12,
    'commercial-sellout':
      (net > 5_000_000 ? 70 : net / 80_000) + (auth < 45 ? 45 : 0),
    'cult-favorite':
      (s?.fanLoyalty ?? 0) * 1.2 + (fans < 1_500_000 ? 50 : 0) + classics * 18,
    'one-hit-wonder':
      viral >= 1 && music.discography.length >= 4 && fans < 1_000_000 ? 130 : 0,
    'untouchable-mogul':
      (net > 10_000_000 ? 90 : net / 120_000) + respect + (fans > 8_000_000 ? 50 : 0),
    'tragic-prodigy':
      creativity * 1.1 +
      (career.mental.depression + career.mental.addictionRisk) * 0.6 +
      comebacks * 18,
    journeyman: 45, // floor — nobody is nothing
  };

  let best: IdentityLabel = 'journeyman';
  let bestScore = -Infinity;
  for (const k of Object.keys(scores) as IdentityLabel[]) {
    if (scores[k] > bestScore) {
      bestScore = scores[k];
      best = k;
    }
  }
  const sorted = Object.values(scores).sort((a, b) => b - a);
  const confidence = clamp(
    Math.round(((sorted[0] - sorted[1]) / Math.max(1, sorted[0])) * 100 + 35),
    20,
    99
  );

  const blurbs: Record<IdentityLabel, string> = {
    'authentic-legend':
      'You never sold the truth. The catalog speaks, and it does not lie.',
    'industry-puppet':
      'The machine loved you because you let it drive. History noticed.',
    'chaotic-genius':
      'Brilliant and ungovernable. Every great record came wrapped in a fire.',
    'cancelled-icon':
      'They tried to bury you and built a monument by accident.',
    'commercial-sellout':
      'You won the money game. The purists will never forgive it, and you can buy their silence.',
    'cult-favorite':
      'Never the biggest. To the ones who stayed, the only one that mattered.',
    'one-hit-wonder':
      'For one perfect moment you owned the world. The world moved on; the moment did not.',
    'untouchable-mogul':
      'You stopped being an artist and became an institution.',
    'tragic-prodigy':
      'The gift and the wound were the same thing. Unforgettable, and it cost you.',
    journeyman:
      'You showed up, year after year. No myth — just the work, and that is its own kind of legend.',
  };

  return {
    label: best,
    title: IDENTITY_TITLES[best],
    blurb: blurbs[best],
    confidence,
  };
}

function momentFromHistory(h: HistoryRecord): LegendaryMoment {
  const eraId =
    useCultureStore
      .getState()
      .eraHistory.find(
        (e) =>
          h.week >= e.startedWeek && (e.endedWeek === null || h.week <= e.endedWeek)
      )?.eraId ?? null;
  return {
    id: h.id,
    week: h.week,
    eraId,
    kind: h.kind,
    headline: h.summary.replace(/^you\s+/i, '').replace(/^\w/, (m) => m.toUpperCase()),
    detail:
      eraId !== null
        ? `Week ${h.week} · ${getEra(eraId).label}`
        : `Week ${h.week}`,
    weight: h.severity,
  };
}

export function legendaryMoments(limit = 8): LegendaryMoment[] {
  const career = useCareerStore.getState();
  const game = useGameStore.getState();
  const moments: LegendaryMoment[] = career.history.map(momentFromHistory);

  // Always anchor the timeline with the debut and the commercial peak.
  moments.push({
    id: 'moment-debut',
    week: 1,
    eraId: useCultureStore.getState().eraHistory[0]?.eraId ?? null,
    kind: 'debut',
    headline: 'The beginning',
    detail: 'Week 1 · an unknown with a dream',
    weight: 30,
  });
  if (career.arc.peakFans > 0) {
    moments.push({
      id: 'moment-peak',
      week: career.arc.peakWeek,
      eraId:
        useCultureStore
          .getState()
          .eraHistory.find(
            (e) =>
              career.arc.peakWeek >= e.startedWeek &&
              (e.endedWeek === null || career.arc.peakWeek <= e.endedWeek)
          )?.eraId ?? null,
      kind: 'peak',
      headline: `Peak: ${career.arc.peakFans.toLocaleString('en-US')} fans`,
      detail: `Week ${career.arc.peakWeek} · the top of the mountain`,
      weight: 75,
    });
  }

  return moments
    .sort((a, b) => b.weight - a.weight || a.week - b.week)
    .slice(0, limit)
    .sort((a, b) => a.week - b.week); // chronological for display
}

export function buildDossier(retiredWeek: number | null = null): CareerDossier {
  const player = usePlayerStore.getState().player;
  const career = useCareerStore.getState();
  const game = useGameStore.getState();
  const erasLived = useCultureStore.getState().eraHistory.map((e) => e.eraId);

  const identity = deriveIdentity();
  const legacy = computeLegacy();
  const moments = legendaryMoments();

  const dossier: CareerDossier = {
    artistName: player?.artistName ?? 'Unknown',
    realName: player?.realName ?? '',
    genre: player?.genre ?? 'pop',
    archetype: player?.archetype ?? 'indie-dreamer',
    weeksActive: game.week,
    peakFans: Math.max(career.arc.peakFans, player?.stats.fans ?? 0),
    lifetimeEarnings: career.economy.lifetimeEarnings,
    comebackCount: career.arc.comebackCount,
    erasLived,
    identity,
    legacy,
    moments,
    documentary: [],
    retiredWeek,
  };
  dossier.documentary = buildDocumentary(dossier);
  return dossier;
}
