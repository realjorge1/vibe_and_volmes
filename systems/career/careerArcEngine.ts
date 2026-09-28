import type { CareerPhase, InfluenceBundle } from '../../types/industry';
import { useCareerStore } from '../../store/careerStore';
import { usePlayerStore } from '../../store/playerStore';
import { note, beat } from '../simulation/influenceGraph';
import { clamp } from '../../utils/random';

const PHASE_LABEL: Record<CareerPhase, string> = {
  'come-up': 'The Come-Up',
  breakthrough: 'The Breakthrough',
  peak: 'The Peak',
  plateau: 'The Plateau',
  decline: 'The Decline',
  comeback: 'The Comeback',
  legacy: 'Legacy',
};

/**
 * Career-arc state machine. Tracks momentum from the fan trajectory and
 * moves the artist through emotionally distinct phases. Decline and
 * comeback are first-class: a fall from a real peak is the setup for the
 * defining redemption story.
 */
export function weeklyArc(bundle: InfluenceBundle, week: number): void {
  const store = useCareerStore.getState();
  const player = usePlayerStore.getState().player;
  if (!player) return;

  const arc = store.arc;
  const fans = player.stats.fans;

  // Momentum: trailing growth rate vs the recent peak, smoothed.
  const fromPeak = arc.peakFans > 0 ? (fans - arc.peakFans) / arc.peakFans : 0;
  const rawMomentum = clamp(
    (bundle.fansDelta / Math.max(1000, fans)) * 400 + fromPeak * 60,
    -100,
    100
  );
  const momentum = clamp(arc.momentum * 0.6 + rawMomentum * 0.4, -100, 100);

  const isNewPeak = fans > arc.peakFans;
  const peakFans = Math.max(arc.peakFans, fans);
  const peakWeek = isNewPeak ? week : arc.peakWeek;
  const weeksSincePeak = isNewPeak ? 0 : arc.weeksSincePeak + 1;

  // Phase transition logic.
  let phase: CareerPhase = arc.phase;
  let comebackCount = arc.comebackCount;

  if (arc.phase === 'come-up' && fans >= 50_000 && momentum > 20) {
    phase = 'breakthrough';
  } else if (arc.phase === 'breakthrough' && fans >= 1_000_000) {
    phase = 'peak';
  } else if (arc.phase === 'peak' && momentum < -5 && weeksSincePeak > 4) {
    phase = 'plateau';
  } else if (
    (arc.phase === 'plateau' || arc.phase === 'peak') &&
    momentum < -30
  ) {
    phase = 'decline';
  } else if (arc.phase === 'decline' && momentum > 25) {
    phase = 'comeback';
    comebackCount += 1;
  } else if (arc.phase === 'comeback' && momentum > 10 && fans >= peakFans * 0.8) {
    phase = fans >= peakFans ? 'peak' : 'plateau';
  } else if (
    arc.phase === 'decline' &&
    weeksSincePeak > 60 &&
    momentum < -10
  ) {
    phase = 'legacy';
  } else if (arc.phase === 'plateau' && momentum > 30) {
    phase = fans >= peakFans ? 'peak' : 'breakthrough';
  }

  const transitioned = phase !== arc.phase;

  store.setArc({
    phase,
    momentum,
    peakFans,
    peakWeek,
    weeksSincePeak,
    comebackCount,
    phaseStartedWeek: transitioned ? week : arc.phaseStartedWeek,
  });

  if (transitioned) {
    note(bundle, `Your career entered a new chapter: ${PHASE_LABEL[phase]}.`);
    if (phase === 'decline') {
      beat(bundle, 'career-decline');
      bundle.historyRecords.push({
        kind: 'flop',
        week,
        summary: 'entered a visible career decline',
        severity: 65,
        tags: ['career-arc', 'decline'],
        artistId: null,
      });
    } else if (phase === 'comeback') {
      beat(bundle, 'career-comeback');
      bundle.historyRecords.push({
        kind: 'triumph',
        week,
        summary: `pulled off a comeback (#${comebackCount})`,
        severity: 80,
        tags: ['career-arc', 'comeback'],
        artistId: null,
      });
    } else if (phase === 'peak') {
      beat(bundle, 'career-peak');
    } else if (phase === 'legacy') {
      beat(bundle, 'career-legacy');
      bundle.historyRecords.push({
        kind: 'triumph',
        week,
        summary: 'settled into legacy-act status',
        severity: 70,
        tags: ['career-arc', 'legacy'],
        artistId: null,
      });
    }
  }
}
