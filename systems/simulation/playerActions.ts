import type { PRStrategyId, VenueScale } from '../../types/industry';
import { useGameStore } from '../../store/gameStore';
import { useLabelStore } from '../../store/labelStore';
import { useTourStore } from '../../store/tourStore';
import { usePressStore } from '../../store/pressStore';
import { useCareerStore } from '../../store/careerStore';
import { applyPRStrategy } from '../pr/prEngine';
import { resolveSession } from '../media/mediaEngine';
import { planTour, confirmTour } from '../tour/tourEngine';
import { signOffer } from '../industry/labelEngine';
import { emptyBundle } from './influenceGraph';
import { applyBundle } from './applyBundle';
import { useActivityStore } from '../../store/activityStore';
import { getLifeActivity, ACTIVITY_CATEGORIES } from '../../data/life/lifeActions';
import { activityAvailability, resolveActivity, type ActivityResult } from '../life/activityEngine';
import { buildActivityContext, currentRival, randomWorldNpc } from '../life/lifeContext';
import { applyConsequence } from '../events/consequenceApplicator';
import { spendEnergy } from '../live/energySystem';
import { publishStoryBeat } from '../social/storyPost';
import { saveProgress } from '../persistence';
import { usePlayerStore } from '../../store/playerStore';

/**
 * Thin action layer for player-initiated Phase 3 decisions made outside
 * the weekly tick (from the Industry UI). Each builds a one-shot influence
 * bundle, runs the relevant engine, applies it once, and persists.
 */

function persist(): void {
  useLabelStore.getState().save();
  useTourStore.getState().save();
  usePressStore.getState().save();
  useCareerStore.getState().save();
}

export function playerRespondToControversy(
  instanceId: string,
  strategyId: PRStrategyId
): string {
  const week = useGameStore.getState().week;
  const bundle = emptyBundle();
  const result = applyPRStrategy(instanceId, strategyId, week, bundle);
  applyBundle(bundle, week);
  persist();
  return result.message;
}

export function playerResolveInterview(): string | null {
  const week = useGameStore.getState().week;
  const bundle = emptyBundle();
  const res = resolveSession(bundle, week);
  applyBundle(bundle, week);
  persist();
  return res?.headline ?? null;
}

export function playerSignOffer(offerId: string): boolean {
  const week = useGameStore.getState().week;
  const ok = signOffer(offerId, week);
  persist();
  return ok;
}

export function playerDeclineOffer(offerId: string): void {
  useLabelStore.getState().removeOffer(offerId);
  persist();
}

export function playerStartTour(scale: VenueScale): boolean {
  const week = useGameStore.getState().week;
  const tour = planTour(scale, week);
  if (!tour) return false;
  confirmTour(tour);
  persist();
  return true;
}

// ─── Life: activities ──────────────────────────────────────────────────────

export type DoActivityResult =
  | { ok: true; result: ActivityResult; posted: boolean }
  | { ok: false; reason: string };

/**
 * Do one activity from the Life tab. Resolves through the pure activity
 * engine, applies the outcome through the same consequence pipeline as event
 * choices, writes the story line into the Deck, and posts dramatic outcomes
 * to the feed. Energy is spent with `spendEnergy`, so the wall-clock regen is
 * reconciled first.
 */
export function playerDoActivity(activityId: string): DoActivityResult {
  const activity = getLifeActivity(activityId);
  if (!activity) return { ok: false, reason: 'Unknown activity' };
  const ctx = buildActivityContext();
  const player = usePlayerStore.getState().player;
  if (!ctx || !player) return { ok: false, reason: 'No career in progress' };

  const availability = activityAvailability(activity, ctx);
  if (!availability.ok) return { ok: false, reason: availability.reason };
  if (!spendEnergy(activity.energyCost)) return { ok: false, reason: 'Too tired' };

  const rival = activity.npc === 'rival' ? currentRival() : null;
  const npcName =
    rival?.name ??
    (activity.npc === 'world' ? randomWorldNpc()?.name : undefined) ??
    'someone you half-recognize';

  // Re-read stats after the energy spend so the tilt sees the live values.
  const live = buildActivityContext() ?? ctx;
  const result = resolveActivity(activity, live, {
    playerName: player.artistName,
    npc: npcName,
  });
  const consequences =
    rival && result.consequences.rivalryIntensityDelta
      ? {
          ...result.consequences,
          rivalryIntensityDelta: {
            ...result.consequences.rivalryIntensityDelta,
            artistId: rival.id,
          },
        }
      : result.consequences;

  const week = useGameStore.getState().week;
  const applied = applyConsequence(consequences, week);

  const logAs =
    ACTIVITY_CATEGORIES.find((c) => c.id === activity.category)?.logAs ?? 'personal';
  const storyId = `activity:${activity.id}`;
  useGameStore.getState().addStoryLine(result.line, logAs, storyId);
  const posted = result.social ? publishStoryBeat(result.social, storyId) !== null : false;

  useActivityStore.getState().record({
    activityId: activity.id,
    week,
    earned: result.earned,
    reaction: applied.socialReaction,
  });
  saveProgress();
  return { ok: true, result: { ...result, consequences }, posted };
}
