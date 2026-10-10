import type { InfluenceBundle } from '../../types/industry';
import { lifestyleBurn } from './lifestyle';
import { usePlayerStore } from '../../store/playerStore';
import { useCareerStore } from '../../store/careerStore';
import { usePressStore } from '../../store/pressStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { useTourStore } from '../../store/tourStore';
import { emptyBundle, note, resolveInfluences } from './influenceGraph';
import { weeklyLabel } from '../industry/labelEngine';
import { weeklyTour } from '../tour/tourEngine';
import { weeklyRivalry } from '../rivalry/rivalryEngine';
import { weeklyPR, spawnControversy } from '../pr/prEngine';
import { weeklyArc } from '../career/careerArcEngine';
import { weeklyMental } from '../mental/mentalEngine';
import { maybeResurface } from '../history/historyEngine';
import { weeklyCulture } from '../culture/cultureEngine';
import { applyBundle } from './applyBundle';
import { useMusicStore } from '../../store/musicStore';
import { weeklyRoyalties } from '../music/royalties';
import { weeklyMogul } from '../mogul/mogulActions';
import { weeklyIdentity } from '../identity/identityTick';

/** Streams pay: the artist's cut of every song's streams this week. */
function applyRoyalties(bundle: InfluenceBundle, week: number): void {
  const statement = weeklyRoyalties(useMusicStore.getState().discography);
  if (statement.total <= 0) return;
  bundle.moneyDelta += statement.total;
  useCareerStore.getState().recordLedger({
    week,
    amount: statement.total,
    kind: 'streaming',
    note: `Royalties on ${statement.streams.toLocaleString('en-US')} streams`,
  });
  // Worth a line when a label is keeping most of it.
  if (statement.withheld > statement.total * 2 && statement.withheld > 5_000) {
    note(
      bundle,
      `Your songs earned $${(statement.total + statement.withheld).toLocaleString('en-US')} this week. You saw $${statement.total.toLocaleString('en-US')} of it.`
    );
  }
}

const SPAWN_PREFIX = 'spawn-controversy:';

export interface Phase3WeekResult {
  notes: string[];
  socialBeats: string[];
}

/** Pull `spawn-controversy:<id>` markers off the bundle and instance them. */
function processControversyMarkers(bundle: InfluenceBundle, week: number): void {
  const remaining: string[] = [];
  for (const tag of bundle.addTags) {
    if (tag.startsWith(SPAWN_PREFIX)) {
      spawnControversy(tag.slice(SPAWN_PREFIX.length), week);
    } else {
      remaining.push(tag);
    }
  }
  bundle.addTags = remaining;
}

function applyEconomy(bundle: InfluenceBundle, week: number): void {
  const careerStore = useCareerStore.getState();
  const player = usePlayerStore.getState().player;
  if (!player) return;
  const eco = careerStore.economy;

  const burn = lifestyleBurn(eco.weeklyBurn, eco.lifestyleTier);
  bundle.moneyDelta -= burn;

  // Tax the net positive cash the player took in this week.
  if (bundle.moneyDelta > 0) {
    const tax = Math.round(bundle.moneyDelta * (eco.taxRatePct / 100));
    bundle.moneyDelta -= tax;
    careerStore.recordLedger({
      week,
      amount: -tax,
      kind: 'taxes',
      note: 'Estimated taxes',
    });
  }
  careerStore.recordLedger({
    week,
    amount: -Math.round(burn),
    kind: 'lifestyle',
    note: `Lifestyle (tier ${eco.lifestyleTier})`,
  });
}

/**
 * Phase 3 weekly simulation. Runs every subsystem against a single shared
 * InfluenceBundle, resolves second-order system→system effects, then
 * applies the result to the Phase 1 player/game stores exactly once. This
 * is the heartbeat that makes the industry feel like a living ecosystem.
 *
 * Call inside the existing week transition, before social regeneration so
 * the returned beats can dramatize what happened.
 */
export function runPhase3Week(week: number): Phase3WeekResult {
  const bundle = emptyBundle();

  // 1. Subsystems contribute (order: external pressure first, self last).
  //    Culture is the MOST external force — the world ages before anyone
  //    reacts to it, so it runs first and the rest of the week sees the
  //    current era / genre climate.
  weeklyCulture(bundle, week);
  weeklyLabel(bundle, week);
  applyRoyalties(bundle, week);
  weeklyMogul(bundle, week);
  weeklyTour(bundle, week);
  weeklyRivalry(bundle, week);
  weeklyPR(bundle, week);
  weeklyArc(bundle, week);
  maybeResurface(bundle, week);
  // Who the artist is presses on their mind (traits), before the mental model runs.
  weeklyIdentity(bundle);

  // 2. Markers raised this week become real controversies immediately.
  processControversyMarkers(bundle, week);

  // 3. Second-order resolution (mental↔creativity, scandal↔streams, …).
  const player = usePlayerStore.getState().player;
  const careerStore = useCareerStore.getState();
  const pressStore = usePressStore.getState();
  const activeHeat = pressStore
    .activeControversies()
    .reduce((max, c) => Math.max(max, c.heat), 0);

  resolveInfluences(bundle, {
    mental: careerStore.mental,
    fans: player?.stats.fans ?? 0,
    reputation: player?.stats.reputation ?? 50,
    momentum: careerStore.arc.momentum,
    onTour: useTourStore.getState().isOnTour(),
    activeControversyHeat: activeHeat,
    hottestRivalry: useRivalryStore.getState().hottestIntensity(),
  });

  // 4. Mental model finalizes (recovery, crisis, MH sync) using the
  //    accumulated pressure, then economy settles the books.
  weeklyMental(bundle, week);
  applyEconomy(bundle, week);

  // 5. Apply the resolved bundle exactly once.
  applyBundle(bundle, week);

  return { notes: bundle.notes, socialBeats: bundle.socialBeats };
}
