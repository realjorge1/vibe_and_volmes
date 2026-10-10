import type { LawyerTier, LegalCase } from '../../types/legal';
import { useLegalStore } from '../../store/legalStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useCareerStore } from '../../store/careerStore';
import { useTourStore } from '../../store/tourStore';
import { useLabelStore } from '../../store/labelStore';
import { useCalendarStore } from '../../store/calendarStore';
import { useShowStore } from '../../store/showStore';
import { getCharge } from '../../data/legal/charges';
import { getLabel } from '../../data/industry/labels';
import {
  captureChance,
  escapeOdds,
  ESCAPE_STEPS,
  LAWYERS,
  lawyerCost,
  MANHUNT_WEEKS,
  rollVerdict,
} from './legalEngine';
import { spawnMoment } from '../drama/publish';
import { pushNotification } from '../live/notify';
import { uid } from '../../utils/id';

/**
 * The law, applied. A charge opens a case; the artist picks a lawyer (an
 * event card with the choices); the verdict lands at the next week turn;
 * a sentence locks the outside world away until it's served — or until the
 * artist runs.
 */

export const IN_JAIL_TAG = 'in-jail';
export const FUGITIVE_TAG = 'fugitive';
export const JUST_RELEASED_TAG = 'just-released';
export const PAROLE_TAG = 'on-parole';
/** Weeks a fresh charge waits for a lawyer before the court appoints one. */
const LAWYER_DEADLINE = 2;
/** Weeks the "just released" glow lasts (homecoming events read it). */
const HOMECOMING_WEEKS = 3;
/** Weeks of parole after probation or release. */
const PAROLE_WEEKS = 12;

function line(text: string, category: 'drama' | 'personal' | 'career' = 'drama'): void {
  useGameStore.getState().addStoryLine(text, category, 'legal');
}

function history(summary: string, severity: number, tags: string[]): void {
  useCareerStore.getState().addHistory({
    id: uid('hist'),
    kind: 'legal',
    week: useGameStore.getState().week,
    summary,
    severity,
    tags: ['legal', ...tags],
    artistId: null,
    resurfacedCount: 0,
    buried: false,
  });
}

/** Charged with something. Inside already? It just adds time. */
export function chargeArtist(chargeId: string): void {
  const charge = getCharge(chargeId);
  const legal = useLegalStore.getState();
  if (!charge) return;
  const week = useGameStore.getState().week;
  const current = legal.activeCase;

  if (current?.stage === 'jailed') {
    const extra = Math.max(1, Math.round((charge.sentence[0] + charge.sentence[1]) / 2));
    legal.patchCase({ releaseWeek: (current.releaseWeek ?? week) + extra, sentenceWeeks: current.sentenceWeeks + extra });
    line(`${charge.label} on the inside. The board added ${extra} more months.`);
    legal.save();
    return;
  }
  if (current?.stage === 'fugitive') {
    // Turned in (or picked up) while running: the rest of the time, plus some.
    const left = Math.max(2, (current.releaseWeek ?? week) - (current.escapedWeek ?? week));
    useGameStore.getState().removeTag(FUGITIVE_TAG);
    line(`Back in custody. ${left + 2} months, and nobody is calling it a misunderstanding.`);
    lockUp(left + 2, week);
    legal.save();
    return;
  }
  if (current) return; // one case at a time; this one rides on the first

  const c: LegalCase = {
    id: uid('case'),
    chargeId,
    chargedWeek: week,
    stage: 'charged',
    lawyer: null,
    verdictWeek: null,
    sentenceWeeks: 0,
    jailStartWeek: null,
    releaseWeek: null,
    escapedWeek: null,
    escapes: 0,
  };
  legal.setCase(c);
  useGameStore.getState().addTag('legal-trouble');
  spawnMoment({
    kind: 'scandal',
    headline: charge.headline,
    topic: `the ${charge.label.toLowerCase()} charge`,
    heat: charge.severity === 'major' ? 80 : charge.severity === 'serious' ? 65 : 45,
    valence: -55,
    hashtag: '{playerName}Arrested',
    tags: ['legal'],
  });
  history(`was charged with ${charge.label.toLowerCase()}`, charge.severity === 'major' ? 75 : 55, [chargeId]);
  pushNotification({ kind: 'info', title: `Charged: ${charge.label}`, body: charge.blurb, color: '#FF5470' });
  legal.save();
}

export type LawyerResult = { ok: true; line: string } | { ok: false; reason: string };

/** Pick how to fight the case. Too broke for the lawyer you wanted: public defender. */
export function hireLawyer(tier: LawyerTier): LawyerResult {
  const legal = useLegalStore.getState();
  const c = legal.activeCase;
  const player = usePlayerStore.getState().player;
  if (!c || c.stage !== 'charged' || !player) return { ok: false, reason: 'No case waiting' };
  const charge = getCharge(c.chargeId);
  if (!charge) return { ok: false, reason: 'Unknown charge' };
  const week = useGameStore.getState().week;
  let chosen = tier;
  const cost = lawyerCost(tier, charge, player.stats.fans);
  if (cost > player.money) chosen = 'public';
  const paid = chosen === tier ? cost : 0;
  if (paid > 0) {
    usePlayerStore.getState().addMoney(-paid);
    useCareerStore.getState().recordLedger({ week, amount: -paid, kind: 'legal', note: `${LAWYERS[chosen].label}` });
  }
  legal.patchCase({ lawyer: chosen, stage: 'trial', verdictWeek: week + 1 });
  legal.save();
  const text =
    chosen !== tier
      ? `You couldn't cover ${LAWYERS[tier].label.toLowerCase()}. The public defender has your file now.`
      : tier === 'plea'
        ? 'You took the plea. Guilty, on the record, for less time.'
        : `${LAWYERS[chosen].label}: hired. Court is next week.`;
  return { ok: true, line: text };
}

function cancelTheOutside(): void {
  const tour = useTourStore.getState();
  if (tour.activeTour) {
    tour.cancelTour();
    line('The tour was cancelled. Refunds for every city.', 'career');
  }
  const cal = useCalendarStore.getState();
  if (cal.festival && cal.festival.accepted && !cal.festival.played) {
    cal.patchFestival({ accepted: false });
    line(`${cal.festival.name} pulled your slot.`, 'career');
  }
  const shows = useShowStore.getState();
  if (shows.gig && !shows.gig.played) shows.setGig(null);

  const label = useLabelStore.getState();
  const contract = label.contract;
  if (contract && contract.status === 'active') {
    const profile = getLabel(contract.labelId);
    if ((profile?.exploitation ?? 0) >= 50) {
      label.endContract('dropped');
      line(`${profile?.name ?? 'Your label'} dropped you the day the sentence was read.`, 'career');
    }
  }
}

function lockUp(weeks: number, week: number): void {
  useLegalStore.getState().patchCase({
    stage: 'jailed',
    sentenceWeeks: weeks,
    jailStartWeek: week,
    releaseWeek: week + weeks,
  });
  const game = useGameStore.getState();
  game.addTag(IN_JAIL_TAG);
  game.removeTag(PAROLE_TAG);
  cancelTheOutside();
  useCareerStore.getState().adjustMental({ depression: 12, isolation: 15, anxiety: 8 });
  spawnMoment({
    kind: 'scandal',
    headline: '{playerName} sentenced: ' + `${weeks} months`,
    topic: 'the sentence',
    heat: 75,
    valence: -40,
    hashtag: 'Free{playerName}',
    tags: ['legal', 'jail'],
  });
  pushNotification({ kind: 'info', title: 'Sentenced', body: `${weeks} months inside.`, color: '#FF5470' });
}

function release(c: LegalCase, week: number): void {
  const legal = useLegalStore.getState();
  const charge = getCharge(c.chargeId);
  legal.addRecord({
    chargeId: c.chargeId,
    label: charge?.label ?? c.chargeId,
    week,
    outcome: 'served',
    weeks: c.sentenceWeeks,
  });
  legal.setCase(null);
  const game = useGameStore.getState();
  game.removeTag(IN_JAIL_TAG);
  game.removeTag('legal-trouble');
  game.addTag(JUST_RELEASED_TAG);
  game.addTag(PAROLE_TAG);
  history(`walked out after ${c.sentenceWeeks} months inside`, 65, ['released']);
  spawnMoment({
    kind: 'best',
    headline: '{playerName} is home',
    topic: 'the homecoming',
    heat: 65,
    valence: 60,
    hashtag: 'Welcome Home{playerName}',
    tags: ['legal', 'released'],
  });
  line(`You walked out after ${c.sentenceWeeks} months. The air tastes different.`, 'personal');
  pushNotification({ kind: 'info', title: 'Released', body: 'You are home.', color: '#3BE8A6' });
}

/**
 * Week transition (after the clock moves, before events are slated): the
 * court rules, sentences end, fugitives run or get caught, tags age.
 */
export function runLegalWeek(week: number, rng: () => number = Math.random): void {
  const legal = useLegalStore.getState();
  const game = useGameStore.getState();
  const c = legal.activeCase;

  // Tags that only last a while.
  const record = legal.record[0];
  if (game.playerTags.includes(JUST_RELEASED_TAG) && record && week - record.week >= HOMECOMING_WEEKS) {
    game.removeTag(JUST_RELEASED_TAG);
  }
  if (game.playerTags.includes(PAROLE_TAG) && record && week - record.week >= PAROLE_WEEKS) {
    game.removeTag(PAROLE_TAG);
    line('Your parole ended. Nobody is checking on you anymore.', 'personal');
  }

  if (!c) return;
  const charge = getCharge(c.chargeId);
  const player = usePlayerStore.getState().player;
  if (!charge || !player) return;

  if (c.stage === 'charged' && week - c.chargedWeek >= LAWYER_DEADLINE) {
    legal.patchCase({ lawyer: 'public', stage: 'trial', verdictWeek: week });
    line('You never picked a lawyer. The court picked one for you.');
  }

  const now = useLegalStore.getState().activeCase!;
  if (now.stage === 'trial' && now.verdictWeek !== null && week >= now.verdictWeek) {
    const priors = legal.record.filter((r) => r.outcome !== 'acquitted').length;
    const verdict = rollVerdict(charge, now.lawyer ?? 'public', player.stats.reputation, priors, rng);
    if (!verdict.convicted) {
      legal.addRecord({ chargeId: charge.id, label: charge.label, week, outcome: 'acquitted', weeks: 0 });
      legal.setCase(null);
      game.removeTag('legal-trouble');
      usePlayerStore.getState().updateStats([{ stat: 'reputation', delta: 3 }]);
      line(`Not guilty. The ${charge.label.toLowerCase()} charge is gone.`, 'personal');
      spawnMoment({
        kind: 'best',
        headline: '{playerName} found not guilty',
        topic: 'the verdict',
        heat: 55,
        valence: 45,
        hashtag: '{playerName}Cleared',
        tags: ['legal'],
      });
      pushNotification({ kind: 'info', title: 'Not guilty', body: charge.label, color: '#3BE8A6' });
    } else {
      if (charge.fine > 0) {
        usePlayerStore.getState().addMoney(-charge.fine);
        useCareerStore.getState().recordLedger({ week, amount: -charge.fine, kind: 'fines', note: `${charge.label} fine` });
      }
      if (verdict.weeks === 0) {
        legal.addRecord({ chargeId: charge.id, label: charge.label, week, outcome: 'probation', weeks: 0 });
        legal.setCase(null);
        game.removeTag('legal-trouble');
        game.addTag(PAROLE_TAG);
        line(`Guilty, but no time: probation and a $${charge.fine.toLocaleString('en-US')} fine.`);
        history(`got probation for ${charge.label.toLowerCase()}`, 45, [charge.id]);
      } else {
        line(`Guilty. ${verdict.weeks} months.`);
        history(`was sentenced to ${verdict.weeks} months for ${charge.label.toLowerCase()}`, 80, [charge.id]);
        lockUp(verdict.weeks, week);
      }
    }
    legal.save();
    return;
  }

  if (now.stage === 'jailed' && now.releaseWeek !== null && week >= now.releaseWeek) {
    release(now, week);
    legal.save();
    return;
  }

  if (now.stage === 'fugitive' && now.escapedWeek !== null) {
    const run = week - now.escapedWeek;
    if (rng() < captureChance(run)) {
      const left = Math.max(2, (now.releaseWeek ?? week) - (now.escapedWeek ?? week));
      const weeks = Math.round(left * 1.5) + 4;
      game.removeTag(FUGITIVE_TAG);
      line(`They found you after ${run} months on the run. ${weeks} months, no parole this time.`);
      history('was caught after escaping custody', 80, ['escape', 'caught']);
      lockUp(weeks, week);
    } else if (run >= MANHUNT_WEEKS) {
      legal.addRecord({ chargeId: charge.id, label: charge.label, week, outcome: 'escaped', weeks: run });
      legal.setCase(null);
      game.removeTag(FUGITIVE_TAG);
      game.removeTag('legal-trouble');
      line('The manhunt went cold. Nobody is looking for you anymore. Nobody official.');
      history('escaped and was never caught', 85, ['escape']);
    } else {
      line('Another week running. Every siren is for you.');
      useCareerStore.getState().adjustMental({ paranoia: 8, anxiety: 6 });
    }
    legal.save();
  }
}

// ─── The escape ───────────────────────────────────────────────────────────────

export interface EscapeOutcome {
  ok: boolean;
  /** One line per step taken. */
  steps: { prompt: string; choice: string; worked: boolean }[];
  line: string;
}

/**
 * Try it. `picks` is one option id per step; every step has to work. A
 * failure adds time; success makes the artist a fugitive.
 */
export function attemptEscape(picks: string[], rng: () => number = Math.random): EscapeOutcome | null {
  const legal = useLegalStore.getState();
  const c = legal.activeCase;
  const player = usePlayerStore.getState().player;
  if (!c || c.stage !== 'jailed' || !player) return null;
  const week = useGameStore.getState().week;
  const steps: EscapeOutcome['steps'] = [];
  let worked = true;
  for (let i = 0; i < ESCAPE_STEPS.length && worked; i++) {
    const step = ESCAPE_STEPS[i];
    const option = step.options.find((o) => o.id === picks[i]) ?? step.options[0];
    const odds = escapeOdds(option.base, player.stats[option.stat] as number);
    worked = rng() < odds;
    steps.push({ prompt: step.prompt, choice: option.label, worked });
  }
  const game = useGameStore.getState();
  if (worked) {
    legal.patchCase({ stage: 'fugitive', escapedWeek: week, escapes: c.escapes + 1 });
    game.removeTag(IN_JAIL_TAG);
    game.addTag(FUGITIVE_TAG);
    spawnMoment({
      kind: 'scandal',
      headline: '{playerName} escaped from prison',
      topic: 'the escape',
      heat: 95,
      valence: -20,
      hashtag: 'Where Is{playerName}',
      tags: ['legal', 'escape'],
    });
    history('escaped from prison', 90, ['escape']);
    const text = 'You made it over the fence. You are free, and every cop in the state has your face.';
    line(text);
    legal.save();
    return { ok: true, steps, line: text };
  }
  const extra = 4 + Math.round(rng() * 4);
  legal.patchCase({ releaseWeek: (c.releaseWeek ?? week) + extra, sentenceWeeks: c.sentenceWeeks + extra, escapes: c.escapes + 1 });
  usePlayerStore.getState().updateStats([{ stat: 'reputation', delta: -2 }]);
  const text = `They caught you before the fence. ${extra} more months, and solitary for a week.`;
  line(text);
  legal.save();
  return { ok: false, steps, line: text };
}
