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
