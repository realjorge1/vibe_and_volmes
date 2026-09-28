import type { InfluenceBundle, MentalState } from '../../types/industry';
import { useCareerStore } from '../../store/careerStore';
import { usePlayerStore } from '../../store/playerStore';
import { addStat, addMental, note, beat } from '../simulation/influenceGraph';
import { clamp, chance } from '../../utils/random';

const AXES: (keyof MentalState)[] = [
  'burnout',
  'anxiety',
  'paranoia',
  'depression',
  'addictionRisk',
  'isolation',
];

/**
 * Weekly mental-health model. Pressure accumulates from other systems
 * (via the bundle's mentalDeltas, applied before this runs) — here we model
 * natural recovery, treatment, crises, and the sync back into the Phase 1
 * `mentalHealth` stat so existing systems feel it. Consequences are shown,
 * never romanticized: a crisis degrades creativity, decisions and image.
 */
export function weeklyMental(bundle: InfluenceBundle, week: number): void {
  const careerStore = useCareerStore.getState();
  const m = careerStore.mental;
  const player = usePlayerStore.getState().player;
  if (!player) return;

  // Natural recovery when the week was relatively calm.
  const pressure = bundle.notes.length + bundle.socialBeats.length;
  const calm = pressure <= 2;
  const recovery = m.inTreatment ? 6 : calm ? 3 : 1;
  for (const axis of AXES) {
    addMental(bundle, axis, -recovery);
  }
  // Discipline buffers burnout; isolation feeds on weak fan loyalty.
  addMental(bundle, 'burnout', -player.stats.discipline / 40);
  if (player.stats.fanLoyalty < 35) addMental(bundle, 'isolation', 2);

  // Crisis check on the *projected* post-bundle state.
  const projected: MentalState = { ...m };
  for (const axis of AXES) {
    const d = (bundle.mentalDeltas[axis] as number) ?? 0;
    (projected[axis] as number) = clamp(
      (m[axis] as number) + d,
      0,
      100
    );
  }

  const severe =
    projected.depression >= 80 ||
    projected.burnout >= 88 ||
    projected.addictionRisk >= 82;
  const recentlyHadCrisis =
    m.lastCrisisWeek !== null && week - m.lastCrisisWeek < 6;

  if (severe && !recentlyHadCrisis && chance(0.55)) {
    careerStore.setLastCrisisWeek(week);
    addStat(bundle, 'creativity', -8);
    addStat(bundle, 'charisma', -6);
    addStat(bundle, 'energy', -15);
    bundle.fansDelta -= Math.round(player.stats.fans * 0.03);
    beat(bundle, 'mental-crisis');
    note(
      bundle,
      'It got bad this week. You hit a wall and the work — and people — paid for it.'
    );
    bundle.historyRecords.push({
      kind: 'statement',
      week,
      summary: 'went through a public mental-health crisis',
      severity: 80,
      tags: ['mental-health', 'crisis'],
      artistId: null,
    });
    bundle.addTags.push('mental-crisis');
  }

  // Sync into the Phase 1 mentalHealth stat: it is the inverse of the
  // accumulated load, so existing decay/event triggers respond naturally.
  const load =
    (projected.burnout +
      projected.anxiety +
      projected.depression +
      projected.paranoia +
      projected.addictionRisk +
      projected.isolation) /
    6;
  const targetMH = clamp(100 - load, 0, 100);
  const mhDelta = Math.round((targetMH - player.stats.mentalHealth) * 0.4);
  if (mhDelta !== 0) addStat(bundle, 'mentalHealth', mhDelta);
}

export function enterTreatment(): void {
  useCareerStore.getState().setInTreatment(true);
}

export function leaveTreatment(): void {
  useCareerStore.getState().setInTreatment(false);
}
