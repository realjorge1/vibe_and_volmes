import { LIVE_CONFIG } from '../../constants/liveConfig';
import { usePlayerStore } from '../../store/playerStore';
import { useLiveStore } from '../../store/liveStore';
import { pushEnergyFull } from './notify';

const MS_PER_POINT =
  LIVE_CONFIG.ENERGY_FULL_RECHARGE_MS / LIVE_CONFIG.ENERGY_MAX;

/** Energy points that have regenerated since the given timestamp. */
export function regenSince(currentEnergy: number, sinceTs: number, now: number): {
  energy: number;
  regained: number;
} {
  if (currentEnergy >= LIVE_CONFIG.ENERGY_MAX) {
    return { energy: LIVE_CONFIG.ENERGY_MAX, regained: 0 };
  }
  const elapsed = Math.max(0, now - sinceTs);
  const points = Math.floor(elapsed / MS_PER_POINT);
  if (points <= 0) return { energy: currentEnergy, regained: 0 };
  const energy = Math.min(LIVE_CONFIG.ENERGY_MAX, currentEnergy + points);
  return { energy, regained: energy - currentEnergy };
}

/**
 * Reconcile the player's energy bar against the wall clock. Idempotent —
 * safe to call on every resume / focus. Returns points regained.
 */
export function reconcileEnergy(now = Date.now()): number {
  const player = usePlayerStore.getState().player;
  if (!player) return 0;
  const live = useLiveStore.getState();
  const { energy, regained } = regenSince(
    player.stats.energy,
    live.energyUpdatedAt,
    now
  );
  if (regained > 0) {
    const wasFull = player.stats.energy >= LIVE_CONFIG.ENERGY_MAX;
    usePlayerStore.getState().setStatDirect('energy', energy);
    live.setEnergyUpdatedAt(now);
    if (!wasFull && energy >= LIVE_CONFIG.ENERGY_MAX) pushEnergyFull();
  } else {
    // Advance the clock past whole-point remainders so we don't lose
    // fractional progress across many short focus events.
    if (player.stats.energy < LIVE_CONFIG.ENERGY_MAX) {
      live.setEnergyUpdatedAt(now - ((now - live.energyUpdatedAt) % MS_PER_POINT));
    } else {
      live.setEnergyUpdatedAt(now);
    }
  }
  return regained;
}

/** Ms until the next single energy point ticks in (0 if already full). */
export function msToNextPoint(now = Date.now()): number {
  const player = usePlayerStore.getState().player;
  if (!player || player.stats.energy >= LIVE_CONFIG.ENERGY_MAX) return 0;
  const elapsed = now - useLiveStore.getState().energyUpdatedAt;
  return Math.max(0, MS_PER_POINT - (elapsed % MS_PER_POINT));
}

/** Ms until the bar is completely full (0 if already full). */
export function msToFull(now = Date.now()): number {
  const player = usePlayerStore.getState().player;
  if (!player) return 0;
  const deficit = LIVE_CONFIG.ENERGY_MAX - player.stats.energy;
  if (deficit <= 0) return 0;
  return Math.round((deficit - 1) * MS_PER_POINT + msToNextPoint(now));
}

/**
 * Guarded energy spend for player-initiated actions (record, interview,
 * tour stop…). Returns false (and spends nothing) if too drained — this
 * is the come-back-later retention lever, deliberately not punishing.
 */
export function spendEnergy(cost: number): boolean {
  reconcileEnergy();
  const player = usePlayerStore.getState().player;
  if (!player) return false;
  if (player.stats.energy < cost) return false;
  usePlayerStore
    .getState()
    .setStatDirect('energy', player.stats.energy - cost);
  return true;
}
