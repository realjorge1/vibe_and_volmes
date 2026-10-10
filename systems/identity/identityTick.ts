import type { InfluenceBundle } from '../../types/industry';
import type { DreamDef, IdentitySnapshot, SeedPlant, WantReward } from '../../types/identity';
import type { LifeStageId } from '../../types/life';
import type { PlayerStats } from '../../types/player';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useCareerStore } from '../../store/careerStore';
import { usePeopleStore } from '../../store/peopleStore';
import { useIdentityStore } from '../../store/identityStore';
import { useMetaStore } from '../../store/metaStore';
import { buildIdentitySnapshot } from './snapshot';
import { judgeWants, rollWants, type Judged, type WantNames } from './wantsEngine';
import { liveSeeds, makeSeed } from './seedEngine';
import { grantTrait, traitEffects } from './traits';
import { getWant } from '../../data/identity/wants';
import { DREAMS, getDream } from '../../data/identity/dreams';
import { TRAIT_RULES, getTrait } from '../../data/identity/traits';
import { getPersona } from '../../data/eras/eraStyles';
import { getChallenge } from '../../data/meta/challenges';
import { advanceRun } from '../meta/challengeEngine';
import { addMental } from '../simulation/influenceGraph';
import { awardXp } from '../progression/xpEngine';
import { pushNotification } from '../live/notify';
import { hottestRival } from '../drama/publish';
import { activePeople, partnerOf } from '../life/peopleEngine';
import { uid } from '../../utils/id';
import { shuffle } from '../../utils/random';

/**
 * Identity glue: everything that reads the IdentitySnapshot and writes the
 * stores. Two entry points on the two clocks the game already has:
 *
 *  - `checkIdentityNow()` after anything the player does mid-week, so a want
 *    fulfilled by an activity or a release pays out on the spot;
 *  - `runIdentityWeek()` in the week transition: wants settle and refill,
 *    traits are earned, the dream is checked or offered, seeds age, the
 *    challenge advances, the comeback hype builds.
 *
 * Plus `weeklyIdentity(bundle)` inside the Phase 3 tick, where traits and the
 * era's persona press on the artist's mind and stats.
 */

const GOLD = '#FFCE5C';

// ─── Rewards ──────────────────────────────────────────────────────────────────

function applyReward(r: WantReward | undefined, label: string): void {
  if (!r) return;
  if (r.stats) {
    usePlayerStore.getState().updateStats(
      (Object.entries(r.stats) as [keyof PlayerStats, number][]).map(([stat, delta]) => ({ stat, delta }))
    );
  }
  if (r.mental) useCareerStore.getState().adjustMental(r.mental);
  if (r.xp) awardXp('milestone', r.xp, label);
}

function wantNames(): WantNames {
  const people = activePeople(usePeopleStore.getState().people);
  const parent = people
    .filter((p) => p.role === 'parent')
    .sort((a, b) => b.affinity - a.affinity)[0];
  return {
    rival: hottestRival()?.name ?? null,
    parent: parent?.name ?? null,
    partner: partnerOf(people)?.name ?? null,
  };
}

function lower(text: string): string {
  return text.length > 0 ? text[0].toLowerCase() + text.slice(1) : text;
}

function settle(judged: Judged[], week: number): void {
  const identity = useIdentityStore.getState();
  const game = useGameStore.getState();
  for (const { want, outcome } of judged) {
    const def = getWant(want.defId);
    identity.logWant({ week, defId: want.defId, text: want.text, kind: want.kind, outcome });
    switch (outcome) {
      // Wants live in the Deck and the strip; the phone stays for big moments
      // (the notification budget is a few pings a week).
      case 'met':
        applyReward(def?.payoff, want.text);
        game.addStoryLine(`✦ Want fulfilled: ${lower(want.text)}.`, 'opportunity', 'identity:want');
        break;
      case 'missed':
        game.addStoryLine(`It slipped away: you never got to ${lower(want.text)}.`, 'personal', 'identity:want');
        break;
      case 'came-true':
        applyReward(def?.payoff, want.text);
        game.addStoryLine(`Your fear came true: ${lower(want.text)}.`, 'drama', 'identity:fear');
        break;
      case 'faced':
        applyReward(def?.relief, want.text);
        game.addStoryLine(`You stared down a fear and it never came: ${lower(want.text)}.`, 'personal', 'identity:fear');
        break;
    }
  }
}

// ─── Traits ───────────────────────────────────────────────────────────────────

/** Give a trait (from an event, a scenario, a rule). Announces it once. */
export function gainTrait(id: string, line?: string): boolean {
  if (!grantTrait(id)) return false;
  const def = getTrait(id);
  const week = useGameStore.getState().week;
  useIdentityStore.getState().logTrait(week, id, line ?? `You are ${def?.label ?? id} now.`);
  if (line) useGameStore.getState().addStoryLine(line, 'personal', 'identity:trait');
  pushNotification({
    kind: 'info',
    title: `New trait: ${def?.label ?? id}`,
    body: def?.blurb ?? '',
    color: def?.color ?? GOLD,
  });
  return true;
}

function earnTraits(s: IdentitySnapshot): void {
  for (const rule of TRAIT_RULES) {
    if (s.traits.includes(rule.trait)) continue;
    if (rule.test(s)) gainTrait(rule.trait, rule.line);
  }
}

// ─── Dreams ───────────────────────────────────────────────────────────────────

function fulfilledIds(): Set<string> {
  return new Set(useIdentityStore.getState().dreamLog.filter((d) => d.fulfilled).map((d) => d.defId));
}

/** Three dreams for this stage the artist hasn't lived yet (fewer if that's all there is). */
export function dreamOptions(stage: LifeStageId, s: IdentitySnapshot): string[] {
  const done = fulfilledIds();
  const pool = DREAMS.filter(
    (d) => d.stages.includes(stage) && !done.has(d.id) && (d.eligible?.(s) ?? true) && !d.met(s)
  );
  return shuffle(pool)
    .slice(0, 3)
    .map((d) => d.id);
}

function offerDream(stage: LifeStageId, s: IdentitySnapshot): void {
  const options = dreamOptions(stage, s);
  useIdentityStore.getState().setDreamOffer(options.length > 0 ? { stage, options } : null);
}

/** The artist picks the dream for this stretch of life. */
export function chooseDream(defId: string): boolean {
  const identity = useIdentityStore.getState();
  const offer = identity.dreamOffer;
  const def = getDream(defId);
  if (!offer || !def || !offer.options.includes(defId)) return false;
  identity.setDream({ defId, chosenWeek: useGameStore.getState().week, stage: offer.stage });
  identity.setDreamOffer(null);
  useGameStore.getState().addStoryLine(`You set your heart on something big: ${lower(def.label)}.`, 'personal', 'identity:dream');
  return true;
}

function fulfillDream(def: DreamDef, s: IdentitySnapshot): void {
  const identity = useIdentityStore.getState();
  identity.logDream({ defId: def.id, label: def.label, week: s.week, age: s.age, fulfilled: true });
  identity.setDream(null);
  useCareerStore.getState().addHistory({
    id: uid('hist'),
    kind: 'dream',
    week: s.week,
    summary: `made a dream come true: ${lower(def.label)}`,
    severity: 75,
    tags: ['dream', def.id],
    artistId: null,
    resurfacedCount: 0,
    buried: false,
  });
  useMetaStore.getState().recordDream(def.id);
  awardXp('milestone', def.xp, def.label);
  useGameStore.getState().addStoryLine(`✦ A dream came true: ${lower(def.label)}.`, 'opportunity', 'identity:dream');
  pushNotification({ kind: 'info', title: 'A dream came true', body: def.label, color: GOLD });
  // Life goes on: the next dream for this stretch.
  offerDream(s.lifeStage, buildIdentitySnapshot() ?? s);
}

function checkDream(s: IdentitySnapshot, final: boolean): void {
  const identity = useIdentityStore.getState();
  const dream = identity.dream;
  if (dream) {
    const def = getDream(dream.defId);
    if (!def) {
      identity.setDream(null);
    } else if (def.met(s)) {
      fulfillDream(def, s);
      return;
    } else if (final && dream.stage !== s.lifeStage) {
      // A new stretch of life: the old dream fades.
      identity.logDream({ defId: def.id, label: def.label, week: s.week, age: s.age, fulfilled: false });
      identity.setDream(null);
      useGameStore
        .getState()
        .addStoryLine(`The dream of ${lower(def.label)} faded with the years.`, 'personal', 'identity:dream');
    }
  }
  const after = useIdentityStore.getState();
  if (final && !after.dream && (!after.dreamOffer || after.dreamOffer.stage !== s.lifeStage)) {
    offerDream(s.lifeStage, s);
  }
}

// ─── Challenge ────────────────────────────────────────────────────────────────

function checkChallenge(s: IdentitySnapshot): void {
  const identity = useIdentityStore.getState();
  const run = identity.challenge;
  if (!run || run.completedWeek !== null) return;
  const def = getChallenge(run.id);
  if (!def) return;
  const { run: next, newlyDone, completed } = advanceRun(run, def, s);
  if (newlyDone.length === 0) return;
  identity.setChallenge(next);
  const game = useGameStore.getState();
  for (const i of newlyDone) {
    if (completed && i === newlyDone[newlyDone.length - 1]) break;
    game.addStoryLine(`Challenge · ${def.title}: ${def.steps[i].label}. ✓`, 'opportunity', 'identity:challenge');
  }
  if (completed) {
    const name = usePlayerStore.getState().player?.artistName ?? '';
    useMetaStore.getState().recordChallenge(def.id, name, def.legacy);
    game.addStoryLine(
      `✦ Challenge complete: ${def.title}. +${def.legacy} lifetime legacy, forever.`,
      'opportunity',
      'identity:challenge'
    );
    pushNotification({ kind: 'achievement', title: `Challenge complete: ${def.title}`, body: def.blurb, color: def.color });
  }
}

// ─── Seeds ────────────────────────────────────────────────────────────────────

/** Plant a seed from a resolved outcome. */
export function plantSeed(plant: SeedPlant, week: number): void {
  useIdentityStore.getState().addSeed(makeSeed(plant, week));
}

/** A callback event resolved: its seed has paid off. */
export function consumeSeed(seedId: string): void {
  useIdentityStore.getState().removeSeed(seedId, true);
}

// ─── Entry points ─────────────────────────────────────────────────────────────

/** After a mid-week action: pay out what just happened. Never rolls new goals. */
export function checkIdentityNow(): void {
  const s = buildIdentitySnapshot();
  if (!s) return;
  const identity = useIdentityStore.getState();
  const { kept, resolved } = judgeWants(identity.wants, s, false);
  if (resolved.length > 0) {
    identity.setWants(kept);
    settle(resolved, s.week);
  }
  checkDream(s, false);
  checkChallenge(s);
}

/** Wants roll fresh at most this often per slot (avoids an instant refill loop). */
const RECENT_WANTS = 4;

/** Week transition: settle, refill, earn, offer, age. Call after the clock moves. */
export function runIdentityWeek(): void {
  const first = buildIdentitySnapshot();
  if (!first) return;
  const identity = useIdentityStore.getState();
  const week = first.week;

  // Trait and persona drift on stats (the mental side goes through the bundle).
  driftStats();

  const judged = judgeWants(identity.wants, first, true);
  identity.setWants(judged.kept);
  settle(judged.resolved, week);

  const s = buildIdentitySnapshot() ?? first;
  earnTraits(s);
  checkDream(s, true);
  checkChallenge(s);

  const recent = useIdentityStore
    .getState()
    .wantLog.slice(0, RECENT_WANTS)
    .map((w) => w.defId)
    .filter((id): id is string => !!id);
  const fresh = rollWants(useIdentityStore.getState().wants, s, wantNames(), recent);
  if (fresh.length > 0) useIdentityStore.getState().setWants([...useIdentityStore.getState().wants, ...fresh]);

  useIdentityStore.getState().setSeeds(liveSeeds(useIdentityStore.getState().seeds, week));
  tickComeback(week);
}

/** Fill the first week's goals and dream offer (a fresh life). */
export function startIdentity(): void {
  const s = buildIdentitySnapshot();
  if (!s) return;
  if (useIdentityStore.getState().wants.length === 0) {
    useIdentityStore.getState().setWants(rollWants([], s, wantNames(), []));
  }
  if (!useIdentityStore.getState().dream && !useIdentityStore.getState().dreamOffer) {
    offerDream(s.lifeStage, s);
  }
}

function driftStats(): void {
  const fx = traitEffects();
  const drift: Partial<Record<keyof PlayerStats, number>> = { ...fx.weeklyStats };
  const era = useIdentityStore.getState().currentEra();
  if (era) {
    for (const [k, v] of Object.entries(getPersona(era.persona).weekly)) {
      const key = k as keyof PlayerStats;
      drift[key] = (drift[key] ?? 0) + (v ?? 0);
    }
  }
  const changes = (Object.entries(drift) as [keyof PlayerStats, number][])
    .filter(([stat, delta]) => stat !== 'fans' && delta !== 0)
    .map(([stat, delta]) => ({ stat, delta }));
  if (changes.length > 0) usePlayerStore.getState().updateStats(changes);
}

/** Phase 3: traits press on the artist's mind (before the mental model runs). */
export function weeklyIdentity(bundle: InfluenceBundle): void {
  const fx = traitEffects();
  for (const [axis, delta] of Object.entries(fx.weeklyMental)) {
    if (delta) addMental(bundle, axis as keyof typeof fx.weeklyMental, delta);
  }
}

// ─── Comeback hype ────────────────────────────────────────────────────────────

/** Weeks a promised comeback can hang before people stop believing it. */
export const COMEBACK_PATIENCE = 12;

function tickComeback(week: number): void {
  const identity = useIdentityStore.getState();
  const cb = identity.comeback;
  if (!cb) return;
  const waited = week - cb.announcedWeek;
  if (waited > COMEBACK_PATIENCE) {
    identity.setComeback(null);
    useGameStore.getState().removeTag('comeback-declared');
    usePlayerStore.getState().updateStats([
      { stat: 'reputation', delta: -3 },
      { stat: 'fanLoyalty', delta: -3 },
    ]);
    useGameStore
      .getState()
      .addStoryLine('The comeback you promised never came. People stopped asking.', 'drama', 'identity:comeback');
    return;
  }
  const hype = Math.min(100, cb.hype + 7);
  identity.setComeback({ ...cb, hype });
  if (waited > 0 && waited % 3 === 0) {
    useGameStore
      .getState()
      .addStoryLine(
        hype >= 60
          ? 'The comeback talk is everywhere. Whatever you drop next, everyone is listening.'
          : 'People are starting to ask when the comeback record is coming.',
        'career',
        'identity:comeback'
      );
  }
}
