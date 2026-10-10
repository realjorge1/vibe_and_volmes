import type { InfluenceBundle } from '../../types/industry';
import type { Npc } from '../../types/world';
import { useMogulStore } from '../../store/mogulStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useCareerStore } from '../../store/careerStore';
import { useWorldStore } from '../../store/worldStore';
import { useProgressionStore } from '../../store/progressionStore';
import { getVenture, MAX_VENTURES } from '../../data/mogul/ventures';
import {
  canStartLabel,
  DEFAULT_SHARE,
  FOLD_WEEKS,
  LABEL_COST,
  loyaltyDrift,
  MAX_ROSTER,
  PUSH_COOLDOWN,
  pushCost,
  SCOUT_SIZE,
  SCOUT_WEEKS,
  scoutPool,
  signeeIncome,
  signingCost,
  ventureSaleValue,
  ventureWeek,
  wantsOut,
} from './mogulEngine';
import { note } from '../simulation/influenceGraph';
import { traitEffects } from '../identity/traits';
import { checkIdentityNow } from '../identity/identityTick';
import { awardXp } from '../progression/xpEngine';
import { pushNotification } from '../live/notify';
import { spawnMoment } from '../drama/publish';
import { saveProgress } from '../persistence';
import { uid } from '../../utils/id';
import { shuffle } from '../../utils/random';

/**
 * The mogul, applied: start a label, sign artists from the living world,
 * push their records, run businesses. Weekly, the roster and the businesses
 * pay into the one economy through the Phase 3 bundle.
 */

export type ActionResult = { ok: true; line: string } | { ok: false; reason: string };

const STAGE_RANK: Record<string, number> = {
  undiscovered: 0,
  rising: 1,
  established: 2,
  star: 3,
  legend: 4,
  declining: 1,
  retired: 0,
};

function line(text: string, category: 'career' | 'opportunity' | 'drama' = 'career'): void {
  useGameStore.getState().addStoryLine(text, category, 'mogul');
}

function history(summary: string, severity: number): void {
  useCareerStore.getState().addHistory({
    id: uid('hist'),
    kind: 'business',
    week: useGameStore.getState().week,
    summary,
    severity,
    tags: ['mogul'],
    artistId: null,
    resurfacedCount: 0,
    buried: false,
  });
}

// ─── The label ────────────────────────────────────────────────────────────────

export function startLabel(name: string, color: string): ActionResult {
  const player = usePlayerStore.getState().player;
  const mogul = useMogulStore.getState();
  if (!player) return { ok: false, reason: 'No career in progress' };
  const check = canStartLabel(player.stats.fans, useProgressionStore.getState().level, player.money, !!mogul.label);
  if (!check.ok) return check;
  const clean = name.trim().slice(0, 32);
  if (!clean) return { ok: false, reason: 'Give it a name' };
  const week = useGameStore.getState().week;
  usePlayerStore.getState().addMoney(-LABEL_COST);
  useCareerStore.getState().recordLedger({ week, amount: -LABEL_COST, kind: 'signing', note: `Founded ${clean}` });
  mogul.setLabel({ name: clean, color, foundedWeek: week, reputation: 40, earned: 0 });
  history(`founded their own label, ${clean}`, 70);
  spawnMoment({
    kind: 'best',
    headline: '{playerName} launches their own label, ' + clean,
    topic: 'the new label',
    heat: 55,
    valence: 50,
    hashtag: clean.replace(/\s+/g, ''),
    tags: ['mogul'],
  });
  awardXp('milestone', 250, `Founded ${clean}`);
  const text = `You founded ${clean}. Your name on the spine of someone else's record now.`;
  line(text, 'opportunity');
  refreshScouting(true);
  checkIdentityNow();
  saveProgress();
  return { ok: true, line: text };
}

/** Who's worth signing this month (refreshes every few weeks). */
export function refreshScouting(force = false): string[] {
  const mogul = useMogulStore.getState();
  const world = useWorldStore.getState().world;
  const week = useGameStore.getState().week;
  if (!world || !mogul.label) return [];
  if (!force && mogul.scouting && week - mogul.scouting.week < SCOUT_WEEKS) return mogul.scouting.npcIds;
  const signed = new Set(mogul.roster.map((r) => r.npcId));
  const npcs = world.npcIds.map((id) => world.npcs[id]).filter(Boolean);
  const top = scoutPool(npcs, signed).slice(0, SCOUT_SIZE * 3);
  const ids = shuffle(top)
    .slice(0, SCOUT_SIZE)
    .map((n) => n.id);
  mogul.setScouting({ week, npcIds: ids });
  return ids;
}

export function scoutedNpcs(): Npc[] {
  const world = useWorldStore.getState().world;
  const ids = useMogulStore.getState().scouting?.npcIds ?? [];
  const signed = new Set(useMogulStore.getState().roster.map((r) => r.npcId));
  return ids.map((id) => world?.npcs[id]).filter((n): n is Npc => !!n && n.active && !signed.has(n.id));
}

export function signArtist(npcId: string): ActionResult {
  const mogul = useMogulStore.getState();
  const player = usePlayerStore.getState().player;
  const npc = useWorldStore.getState().getNpc(npcId);
  if (!player || !mogul.label || !npc) return { ok: false, reason: 'Nothing to sign' };
  if (mogul.activeRoster().length >= MAX_ROSTER) return { ok: false, reason: `Roster is full (${MAX_ROSTER})` };
  const cost = signingCost(npc);
  if (player.money < cost) return { ok: false, reason: `Needs $${cost.toLocaleString('en-US')}` };
  const week = useGameStore.getState().week;
  usePlayerStore.getState().addMoney(-cost);
  useCareerStore.getState().recordLedger({ week, amount: -cost, kind: 'signing', note: `Signed ${npc.name}` });
  mogul.addSignee({
    npcId,
    name: npc.name,
    genre: npc.genre,
    signedWeek: week,
    advance: cost,
    share: DEFAULT_SHARE,
    loyalty: 20 + Math.round((npc.personality.loyalty - 50) / 2),
    status: 'active',
    startFollowers: npc.social.followers,
    earned: 0,
    lastPushWeek: null,
    lastStage: npc.stage,
  });
  const text = `You signed ${npc.name} to ${mogul.label.name}. $${cost.toLocaleString('en-US')} says you believe it.`;
  line(text, 'opportunity');
  awardXp('milestone', 120, `Signed ${npc.name}`);
  checkIdentityNow();
  saveProgress();
  return { ok: true, line: text };
}

/** Put money behind their next record: followers and momentum in the world. */
export function pushSignee(npcId: string): ActionResult {
  const mogul = useMogulStore.getState();
  const signee = mogul.roster.find((r) => r.npcId === npcId && r.status === 'active');
  const npc = useWorldStore.getState().getNpc(npcId);
  const player = usePlayerStore.getState().player;
  if (!signee || !npc || !player) return { ok: false, reason: 'Not on your roster' };
  const week = useGameStore.getState().week;
  if (signee.lastPushWeek !== null && week - signee.lastPushWeek < PUSH_COOLDOWN) {
    return { ok: false, reason: `Again in ${PUSH_COOLDOWN - (week - signee.lastPushWeek)} weeks` };
  }
  const cost = pushCost(npc);
  if (player.money < cost) return { ok: false, reason: `Needs $${cost.toLocaleString('en-US')}` };
  usePlayerStore.getState().addMoney(-cost);
  useCareerStore.getState().recordLedger({ week, amount: -cost, kind: 'production', note: `Pushed ${npc.name}` });
  // Your reach is their reach: a famous label head's push goes further.
  const reach = Math.min(0.6, 0.12 + Math.log10(Math.max(10, player.stats.fans)) / 25);
  useWorldStore.getState().updateNpc(npcId, (n) => ({
    ...n,
    social: { ...n.social, followers: Math.round(n.social.followers * (1 + reach)) },
    roleData: { ...n.roleData, fans: Math.round((n.roleData.fans ?? n.social.followers) * (1 + reach)) },
    momentum: Math.min(100, n.momentum + 25),
  }));
  mogul.patchSignee(npcId, { lastPushWeek: week, loyalty: Math.min(100, signee.loyalty + 10) });
  const text = `You put $${cost.toLocaleString('en-US')} behind ${npc.name}'s new single. Their numbers jumped.`;
  line(text);
  saveProgress();
  return { ok: true, line: text };
}

export function dropSignee(npcId: string): ActionResult {
  const mogul = useMogulStore.getState();
  const signee = mogul.roster.find((r) => r.npcId === npcId && r.status === 'active');
  if (!signee) return { ok: false, reason: 'Not on your roster' };
  mogul.patchSignee(npcId, { status: 'dropped' });
  const text = `You dropped ${signee.name} from ${mogul.label?.name ?? 'the label'}. They will remember that.`;
  line(text, 'drama');
  saveProgress();
  return { ok: true, line: text };
}

/** From an event: the signee at its center walks, renegotiates, or swears loyalty. */
export function applySigneeAction(action: 'leave' | 'renegotiate' | 'loyal', npcId?: string): void {
  const mogul = useMogulStore.getState();
  const signee = mogul.roster.find((r) => r.status === 'active' && (!npcId || r.npcId === npcId));
  if (!signee) return;
  if (action === 'leave') mogul.patchSignee(signee.npcId, { status: 'left' });
  if (action === 'renegotiate') {
    mogul.patchSignee(signee.npcId, { share: Math.max(0.15, signee.share - 0.2), loyalty: Math.min(100, signee.loyalty + 35) });
  }
  if (action === 'loyal') mogul.patchSignee(signee.npcId, { loyalty: Math.min(100, signee.loyalty + 25) });
}

// ─── Businesses ───────────────────────────────────────────────────────────────

export function startVenture(defId: string): ActionResult {
  const def = getVenture(defId);
  const player = usePlayerStore.getState().player;
  const mogul = useMogulStore.getState();
  if (!def || !player) return { ok: false, reason: 'Unknown business' };
  if (mogul.runningVentures().length >= MAX_VENTURES) return { ok: false, reason: `${MAX_VENTURES} businesses at most` };
  if (mogul.runningVentures().some((v) => v.defId === defId)) return { ok: false, reason: 'You already run one' };
  if (player.stats.fans < def.minFans) return { ok: false, reason: `${def.minFans.toLocaleString('en-US')} fans` };
  if (useProgressionStore.getState().level < def.minLevel) return { ok: false, reason: `Level ${def.minLevel}` };
  if (player.money < def.cost) return { ok: false, reason: `Needs $${def.cost.toLocaleString('en-US')}` };
  const week = useGameStore.getState().week;
  usePlayerStore.getState().addMoney(-def.cost);
  useCareerStore.getState().recordLedger({ week, amount: -def.cost, kind: 'upkeep', note: `Started ${def.label.toLowerCase()}` });
  mogul.addVenture({
    id: uid('venture'),
    defId,
    startedWeek: week,
    invested: def.cost,
    health: 55,
    lifetimeNet: 0,
    lastNet: 0,
    status: 'running',
    badWeeks: 0,
  });
  history(`launched ${def.label.toLowerCase()}`, 50);
  const text = `You launched ${def.label.toLowerCase()}. ${def.blurb}`;
  line(text, 'opportunity');
  checkIdentityNow();
  saveProgress();
  return { ok: true, line: text };
}

export function sellVenture(id: string): ActionResult {
  const mogul = useMogulStore.getState();
  const v = mogul.ventures.find((x) => x.id === id && x.status === 'running');
  const def = v ? getVenture(v.defId) : undefined;
  if (!v || !def) return { ok: false, reason: 'Not running' };
  const value = ventureSaleValue(v);
  usePlayerStore.getState().addMoney(value);
  useCareerStore.getState().recordLedger({
    week: useGameStore.getState().week,
    amount: value,
    kind: 'venture',
    note: `Sold ${def.label.toLowerCase()}`,
  });
  mogul.patchVenture(id, { status: 'closed' });
  const text = `You sold ${def.label.toLowerCase()} for $${value.toLocaleString('en-US')}.`;
  line(text);
  saveProgress();
  return { ok: true, line: text };
}

// ─── Weekly ───────────────────────────────────────────────────────────────────

/** Phase 3: the roster and the businesses pay (or bleed) into the bundle. */
export function weeklyMogul(bundle: InfluenceBundle, week: number): void {
  const mogul = useMogulStore.getState();
  const player = usePlayerStore.getState().player;
  if (!player) return;
  const world = useWorldStore.getState().world;
  const career = useCareerStore.getState();

  if (mogul.label && world) {
    let income = 0;
    for (const signee of mogul.activeRoster()) {
      const npc = world.npcs[signee.npcId];
      if (!npc || !npc.active) {
        mogul.patchSignee(signee.npcId, { status: 'left' });
        note(bundle, `${signee.name} walked away from music. ${mogul.label.name} lost an artist.`);
        continue;
      }
      const climbed = (STAGE_RANK[npc.stage] ?? 0) > (STAGE_RANK[signee.lastStage] ?? 0);
      const earned = signeeIncome(signee, npc);
      income += earned;
      const loyalty = loyaltyDrift(signee, npc, week, climbed);
      mogul.patchSignee(signee.npcId, {
        earned: signee.earned + earned,
        loyalty,
        lastStage: npc.stage,
      });
      if (climbed) {
        note(bundle, `${npc.name} just went ${npc.stage} on ${mogul.label.name}. You called it.`);
        mogul.patchLabel({ reputation: Math.min(100, mogul.label.reputation + 6) });
        awardXp('milestone', 150, `${npc.name} broke through`);
      }
      if (wantsOut({ ...signee, loyalty }, npc)) {
        mogul.patchSignee(signee.npcId, { status: 'left' });
        note(bundle, `${npc.name} left ${mogul.label.name} for a bigger deal. They didn't call first.`);
        bundle.historyRecords.push({
          kind: 'betrayal',
          week,
          summary: `lost ${npc.name} to a bigger label`,
          severity: 55,
          tags: ['mogul', 'betrayal'],
          artistId: null,
        });
      }
    }
    if (income > 0) {
      bundle.moneyDelta += income;
      mogul.patchLabel({ earned: (useMogulStore.getState().label?.earned ?? 0) + income });
      career.recordLedger({ week, amount: income, kind: 'label', note: `${mogul.label.name} roster` });
    }
  }

  const tilt = traitEffects().activityTilt.money ?? 0;
  for (const v of mogul.runningVentures()) {
    const def = getVenture(v.defId);
    if (!def) continue;
    const r = ventureWeek(v, def, {
      fans: player.stats.fans,
      statValue: player.stats[def.stat] as number,
      tilt,
    });
    bundle.moneyDelta += r.net;
    career.recordLedger({ week, amount: r.net, kind: 'venture', note: def.label });
    if (r.badWeeks >= FOLD_WEEKS) {
      mogul.patchVenture(v.id, { status: 'closed', health: r.health, lastNet: r.net, lifetimeNet: v.lifetimeNet + r.net, badWeeks: r.badWeeks });
      note(bundle, `${def.label} folded. The sign came down this week.`);
      bundle.historyRecords.push({
        kind: 'flop',
        week,
        summary: `watched ${def.label.toLowerCase()} fold`,
        severity: 45,
        tags: ['mogul'],
        artistId: null,
      });
      pushNotification({ kind: 'info', title: 'A business folded', body: def.label, color: '#FF5470' });
    } else {
      mogul.patchVenture(v.id, { health: r.health, lastNet: r.net, lifetimeNet: v.lifetimeNet + r.net, badWeeks: r.badWeeks });
    }
  }
}
