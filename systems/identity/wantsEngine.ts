import type {
  ActiveWant,
  IdentitySnapshot,
  WantDef,
  WantOutcome,
} from '../../types/identity';
import { WANTS, getWant, MAX_FEARS, WANT_SLOTS } from '../../data/identity/wants';
import { formatFanCount, formatMoney } from '../../utils/statHelpers';

/**
 * Wants & fears engine. Pure: it rolls new goals from a snapshot, and judges
 * live ones against a snapshot. Applying rewards, writing the Deck and
 * notifying is the glue's job (systems/identity/identityTick).
 */

export interface WantNames {
  rival?: string | null;
  parent?: string | null;
  partner?: string | null;
}

function formatTarget(def: WantDef, target: number): string {
  switch (def.format) {
    case 'fans':
      return formatFanCount(target);
    case 'money':
      return formatMoney(target);
    case 'position':
      return `#${target}`;
    default:
      return target.toLocaleString('en-US');
  }
}

/** The goal's text with its tokens filled, or null if a token has no value. */
export function fillWantText(def: WantDef, target: number, names: WantNames): string | null {
  let text = def.text.split('{n}').join(formatTarget(def, target));
  const tokens: [string, string | null | undefined][] = [
    ['{rival}', names.rival],
    ['{parent}', names.parent],
    ['{partner}', names.partner],
  ];
  for (const [token, value] of tokens) {
    if (!text.includes(token)) continue;
    if (!value) return null;
    text = text.split(token).join(value);
  }
  return text;
}

/** Base weight, doubled for every held trait that leans toward it. */
export function wantWeight(def: WantDef, traits: readonly string[]): number {
  const matches = (def.traits ?? []).filter((t) => traits.includes(t)).length;
  return def.weight * Math.pow(2, matches);
}

function weightedPick<T>(items: T[], weights: number[], rng: () => number): T | null {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1] ?? null;
}

let wantCounter = 0;
function wantUid(week: number): string {
  wantCounter = (wantCounter + 1) % 1_000_000;
  return `want-${week}-${Date.now().toString(36)}-${wantCounter}`;
}

/**
 * Fill the free slots. `recent` are def ids resolved lately, kept out so the
 * same goal doesn't come straight back. A fear is rolled only sometimes, and
 * never more than MAX_FEARS at once.
 */
export function rollWants(
  active: ActiveWant[],
  s: IdentitySnapshot,
  names: WantNames,
  recent: string[],
  rng: () => number = Math.random,
  pool: WantDef[] = WANTS
): ActiveWant[] {
  const out: ActiveWant[] = [];
  const taken = new Set([...active.map((w) => w.defId), ...recent]);
  let fears = active.filter((w) => w.kind === 'fear').length;
  let free = WANT_SLOTS - active.length;

  while (free > 0) {
    const wantFear = fears < MAX_FEARS && rng() < 0.45;
    const candidates = pool.filter((def) => {
      if (taken.has(def.id)) return false;
      if ((def.kind === 'fear') !== wantFear) return false;
      if (!def.eligible(s)) return false;
      const target = def.target ? def.target(s) : 0;
      // Already true: it would resolve the moment it appeared.
      if (!def.atDeadline && def.met(s, target, s.week)) return false;
      return fillWantText(def, target, names) !== null;
    });
    if (candidates.length === 0) {
      // No fear fits right now: try a want instead (and vice versa) once.
      if (wantFear) {
        fears = MAX_FEARS;
        continue;
      }
      break;
    }
    const def = weightedPick(candidates, candidates.map((d) => wantWeight(d, s.traits)), rng);
    if (!def) break;
    const target = def.target ? def.target(s) : 0;
    out.push({
      uid: wantUid(s.week),
      defId: def.id,
      kind: def.kind,
      text: fillWantText(def, target, names) ?? def.text,
      icon: def.icon,
      rolledWeek: s.week,
      dueWeek: s.week + def.weeks,
      target,
    });
    taken.add(def.id);
    if (def.kind === 'fear') fears += 1;
    free -= 1;
  }
  return out;
}

export interface Judged {
  want: ActiveWant;
  outcome: WantOutcome;
}

/**
 * Judge live goals. `final` (the week transition) also settles the ones
 * whose time is up; mid-week checks only catch what just happened.
 */
export function judgeWants(
  active: ActiveWant[],
  s: IdentitySnapshot,
  final: boolean
): { kept: ActiveWant[]; resolved: Judged[] } {
  const kept: ActiveWant[] = [];
  const resolved: Judged[] = [];
  for (const want of active) {
    const def = getWant(want.defId);
    if (!def) continue; // removed from the data: drop it quietly
    const due = s.week >= want.dueWeek;
    if (def.kind === 'want') {
      if (def.met(s, want.target, want.rolledWeek)) resolved.push({ want, outcome: 'met' });
      else if (final && due) resolved.push({ want, outcome: 'missed' });
      else kept.push(want);
      continue;
    }
    // A fear.
    if (def.atDeadline) {
      if (final && due) {
        resolved.push({ want, outcome: def.met(s, want.target, want.rolledWeek) ? 'came-true' : 'faced' });
      } else kept.push(want);
      continue;
    }
    if (def.met(s, want.target, want.rolledWeek)) resolved.push({ want, outcome: 'came-true' });
    else if (final && due) resolved.push({ want, outcome: 'faced' });
    else kept.push(want);
  }
  return { kept, resolved };
}

/** Weeks left on a goal, for the UI. */
export function weeksLeft(want: ActiveWant, week: number): number {
  return Math.max(0, want.dueWeek - week);
}
