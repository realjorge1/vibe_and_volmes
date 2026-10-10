import type { EraPersona } from '../../types/identity';
import { useIdentityStore } from '../../store/identityStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useCareerStore } from '../../store/careerStore';
import { useLegalStore } from '../../store/legalStore';
import { ERA_MIN_WEEKS, eraRolloutCost, getAesthetic, getPersona } from '../../data/eras/eraStyles';
import { spawnMoment } from '../drama/publish';
import { checkIdentityNow } from './identityTick';
import { awardXp } from '../progression/xpEngine';
import { saveProgress } from '../persistence';
import { uid } from '../../utils/id';

/**
 * Eras: the artist reinvents. A name, a color, an aesthetic and a persona;
 * the persona moves numbers for as long as the era lasts (data/eras), the
 * first releases of a fresh era get a novelty lift, and an era that drags on
 * goes stale (systems/music/releaseHooks). Reinventing too often reads as
 * flailing and costs authenticity.
 */

export interface EraDraft {
  name: string;
  color: string;
  aesthetic: string;
  persona: EraPersona;
}

export type EraCheck = { ok: true; cost: number; tooSoon: boolean } | { ok: false; reason: string };

export function canStartEra(): EraCheck {
  const player = usePlayerStore.getState().player;
  if (!player) return { ok: false, reason: 'No career in progress' };
  if (useLegalStore.getState().activeCase?.stage === 'jailed') return { ok: false, reason: 'Not from in here' };
  const cost = eraRolloutCost(player.stats.fans);
  if (player.money < cost) return { ok: false, reason: `The rollout costs $${cost.toLocaleString('en-US')}` };
  const current = useIdentityStore.getState().currentEra();
  const week = useGameStore.getState().week;
  const tooSoon = !!current && week - current.startedWeek < ERA_MIN_WEEKS;
  return { ok: true, cost, tooSoon };
}

export function startEra(draft: EraDraft): { ok: true; line: string } | { ok: false; reason: string } {
  const check = canStartEra();
  if (!check.ok) return check;
  const name = draft.name.trim().slice(0, 28);
  if (!name) return { ok: false, reason: 'Name your era' };
  const week = useGameStore.getState().week;
  const identity = useIdentityStore.getState();
  const previous = identity.currentEra();
  if (previous) identity.updateEra(previous.id, { endedWeek: week });

  usePlayerStore.getState().addMoney(-check.cost);
  useCareerStore.getState().recordLedger({ week, amount: -check.cost, kind: 'production', note: `${name} era rollout` });
  identity.addEra({
    id: uid('era'),
    name,
    color: draft.color,
    aesthetic: draft.aesthetic,
    persona: draft.persona,
    startedWeek: week,
    endedWeek: null,
    trackIds: [],
    peak: null,
  });

  const persona = getPersona(draft.persona);
  const aesthetic = getAesthetic(draft.aesthetic);
  if (check.tooSoon) {
    usePlayerStore.getState().updateStats([{ stat: 'authenticity', delta: -5 }]);
  } else {
    usePlayerStore.getState().updateStats([{ stat: 'creativity', delta: 2 }]);
  }
  spawnMoment({
    kind: check.tooSoon ? 'meme' : 'best',
    headline: check.tooSoon
      ? `Another new era? {playerName} announces the "${name}" era weeks after the last one`
      : `{playerName} enters their "${name}" era`,
    topic: `the ${name} era`,
    heat: check.tooSoon ? 45 : 60,
    valence: check.tooSoon ? -30 : persona.valence,
    hashtag: `${name.replace(/[^A-Za-z0-9]/g, '')}Era`,
    tags: ['era'],
  });
  awardXp('milestone', 80, `The ${name} era`);
  const line = check.tooSoon
    ? `You announced the ${name} era. Some fans love it. Most are asking what happened to the last one.`
    : `The ${name} era begins: ${aesthetic?.label.toLowerCase() ?? 'a new look'}, ${persona.label.toLowerCase()} energy.`;
  useGameStore.getState().addStoryLine(line, 'career', 'era');
  checkIdentityNow();
  saveProgress();
  return { ok: true, line };
}
