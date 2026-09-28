import type {
  ActiveControversy,
  PRStrategyId,
  InfluenceBundle,
} from '../../types/industry';
import { getControversy } from '../../data/pr/controversies';
import { PR_STRATEGIES, getStrategy } from '../../data/pr/prStrategies';
import { usePressStore } from '../../store/pressStore';
import { usePlayerStore } from '../../store/playerStore';
import { addStat, addMental, note, beat } from '../simulation/influenceGraph';
import { uid } from '../../utils/id';
import { chance, clamp } from '../../utils/random';

/** Instantiate a controversy. `guilty` defaults to a roll if unspecified. */
export function spawnControversy(
  defId: string,
  week: number,
  opts: { guilty?: boolean; instigatorArtistId?: string | null } = {}
): ActiveControversy | null {
  const def = getControversy(defId);
  if (!def) return null;
  const press = usePressStore.getState();
  if (press.controversies.some((c) => c.defId === defId && !c.resolved)) {
    return null; // don't double-stack the same active controversy
  }

  const guilty =
    opts.guilty ?? (def.truthMatters ? chance(0.5) : false);

  const instance: ActiveControversy = {
    instanceId: uid('ctrl'),
    defId,
    kind: def.kind,
    severity: def.severity,
    startedWeek: week,
    heat: def.baseHeat,
    guilty,
    strategyApplied: null,
    resolved: false,
    resolutionWeek: null,
    outcome: null,
    instigatorArtistId: opts.instigatorArtistId ?? null,
  };
  press.addControversy(instance);
  return instance;
}

export interface PROptions {
  id: PRStrategyId;
  label: string;
  description: string;
  cost: number;
  affordable: boolean;
  available: boolean;
}

export function strategiesFor(): PROptions[] {
  const press = usePressStore.getState();
  const player = usePlayerStore.getState().player;
  const money = player?.money ?? 0;
  return PR_STRATEGIES.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
    cost: s.cost,
    affordable: money >= s.cost,
    available: !s.requiresPRTeam || press.hasPRTeam,
  }));
}

const SEVERITY_DIFFICULTY: Record<ActiveControversy['severity'], number> = {
  minor: 0.1,
  moderate: 0,
  severe: -0.15,
  'career-ending': -0.3,
};

export interface PRResult {
  success: boolean;
  outcome: ActiveControversy['outcome'];
  message: string;
}

/**
 * Player chooses a PR strategy for an active controversy. Success blends
 * the strategy baseline, severity, actual guilt, charisma, and noise — the
 * internet is deliberately unpredictable, so even strong plays can backfire.
 */
export function applyPRStrategy(
  instanceId: string,
  strategyId: PRStrategyId,
  week: number,
  bundle: InfluenceBundle
): PRResult {
  const press = usePressStore.getState();
  const c = press.controversies.find((x) => x.instanceId === instanceId);
  const strat = getStrategy(strategyId);
  const player = usePlayerStore.getState().player;
  if (!c || !strat || !player || c.resolved) {
    return { success: false, outcome: null, message: 'No action taken.' };
  }

  if (strat.cost > 0) {
    usePlayerStore.getState().addMoney(-strat.cost);
  }

  const charisma = player.stats.charisma / 100;
  const guiltBase = c.guilty ? strat.successIfGuilty : strat.successIfInnocent;
  let p =
    (strat.baseSuccess * 0.4 + guiltBase * 0.6) +
    SEVERITY_DIFFICULTY[c.severity] +
    charisma * 0.2 -
    c.heat / 400;
  p = clamp(p, 0.05, 0.95);

  press.applyStrategy(instanceId, strategyId);
  const success = chance(p);

  if (success) {
    press.adjustHeat(instanceId, -Math.round(c.heat * 0.7));
    const survived = press.controversies.find(
      (x) => x.instanceId === instanceId
    );
    if (survived && survived.heat <= 12) {
      press.resolveControversy(instanceId, 'survived', week);
      addStat(bundle, 'reputation', 3);
      note(bundle, 'You handled the controversy. The heat is dying down.');
    } else {
      note(bundle, 'Your response landed. The story is cooling.');
    }
    return {
      success: true,
      outcome: 'survived',
      message: 'The public mostly bought it.',
    };
  }

  // Backfire.
  press.adjustHeat(instanceId, strat.backfireHeatGain);
  addStat(bundle, 'reputation', -4);
  addMental(bundle, 'anxiety', 8);
  addMental(bundle, 'paranoia', 5);
  beat(bundle, 'pr-backfire');
  note(bundle, 'It backfired. The internet smells blood.');
  return {
    success: false,
    outcome: 'damaged',
    message: 'It backfired — the story got bigger.',
  };
}

/**
 * Weekly controversy lifecycle: natural cool-off, unmanaged escalation,
 * and resolution. Sustained high heat with no successful response can
 * tip into a full cancellation — the career-threatening moment.
 */
export function weeklyPR(bundle: InfluenceBundle, week: number): void {
  const press = usePressStore.getState();
  const active = press.activeControversies();

  for (const c of active) {
    const def = getControversy(c.defId);
    if (!def) continue;

    const weeksAlive = week - c.startedWeek;

    // Natural decay (slower if the player never responded).
    const decay = c.strategyApplied
      ? def.decayPerWeek
      : Math.round(def.decayPerWeek * 0.4);
    press.adjustHeat(c.instanceId, -decay);

    const refreshed = press.controversies.find(
      (x) => x.instanceId === c.instanceId
    );
    if (!refreshed) continue;

    // Ongoing reputational drag while hot.
    if (refreshed.heat > 30) {
      const h = refreshed.heat / 100;
      addStat(bundle, 'reputation', -Math.round(h * 3));
      addMental(bundle, 'anxiety', Math.round(h * 4));
    }

    // Escalation → cancellation.
    if (
      refreshed.heat >= 75 &&
      !refreshed.strategyApplied &&
      weeksAlive >= 2
    ) {
      press.resolveControversy(c.instanceId, 'cancelled', week);
      const player = usePlayerStore.getState().player;
      addStat(bundle, 'reputation', -18);
      addStat(bundle, 'industryRespect', -12);
      bundle.fansDelta -= Math.round((player?.stats.fans ?? 0) * 0.12);
      addMental(bundle, 'depression', 18);
      addMental(bundle, 'anxiety', 15);
      beat(bundle, 'cancelled');
      note(bundle, 'It happened. You got cancelled. The fallout is brutal.');
      bundle.historyRecords.push({
        kind: 'scandal',
        week,
        summary: `was cancelled over ${def.kind.replace('-', ' ')}`,
        severity: 95,
        tags: ['scandal', 'cancel', ...def.tags],
        artistId: c.instigatorArtistId,
      });
      continue;
    }

    // Cooled off on its own.
    if (refreshed.heat <= 10) {
      press.resolveControversy(
        c.instanceId,
        refreshed.strategyApplied ? 'survived' : 'damaged',
        week
      );
      note(
        bundle,
        `The "${def.kind.replace('-', ' ')}" story finally faded.`
      );
      bundle.historyRecords.push({
        kind: 'scandal',
        week,
        summary: `weathered a ${def.kind.replace('-', ' ')} controversy`,
        severity: refreshed.strategyApplied ? 45 : 60,
        tags: ['scandal', ...def.tags],
        artistId: c.instigatorArtistId,
      });
    }
  }

  press.pruneResolved();
}
