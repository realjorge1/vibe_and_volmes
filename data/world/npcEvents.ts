import type {
  GoalKind,
  Npc,
  NpcRelationship,
  NpcRole,
  WorldEventType,
  WorldState,
} from '../../types/world';
import type { Rng } from '../../systems/world/rng';
import { clamp } from '../../systems/world/rng';
import { applyReputationDelta, fameLevel, opportunityScore, reach } from '../../systems/world/reputation';
import { adjustRelationship, setStatus } from '../../systems/world/relationships';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  WEIGHTED EVENT CATALOG
 * ─────────────────────────────────────────────────────────────────────────
 *
 * The catalog is the emergent-storytelling engine. Each definition is pure
 * DATA + three pure functions:
 *
 *   condition(ctx) -> can this even happen to this NPC right now?
 *   weight(ctx)    -> how likely, given the NPC's *current state*?  (the
 *                     "organic" part — a petty, big-ego rapper sitting on an
 *                     active rivalry is far more likely to roll a diss track
 *                     than a warm, collaborative pop star)
 *   apply(ctx)     -> mutate the world and emit one or more WorldEvents.
 *
 * Nothing here calls Math.random; all chance comes from `ctx.rng`, which the
 * engine derives deterministically from (seed, week, npc).
 */

// ─── Context the engine hands to each event ─────────────────────────────────

export interface TargetFilter {
  roles?: NpcRole[];
  sameGenre?: boolean;
  /** 'known' = an existing relationship, 'stranger' = someone new, 'any' = either. */
  relation?: 'known' | 'stranger' | 'any';
  minReach?: number;
  excludeSelf?: boolean;
}

export interface EventDraft {
  type: WorldEventType;
  secondary?: Npc | null;
  headline: string;
  magnitude: number;
  tags?: string[];
}

export interface WorldEventContext {
  world: WorldState;
  npc: Npc;
  rng: Rng;
  week: number;
  /** Find a counterpart NPC matching a filter (deterministic). */
  findTarget(filter?: TargetFilter): Npc | null;
  /** Find a known counterpart whose edge matches a predicate. */
  findKnown(pred: (rel: NpcRelationship, other: Npc) => boolean): Npc | null;
  /** Get-or-create the actor -> target edge. */
  rel(target: Npc): NpcRelationship;
  /** Get-or-create the target -> actor edge. */
  relBack(target: Npc): NpcRelationship;
  /** Record a world event. */
  emit(draft: EventDraft): void;
}

export interface NpcEventDef {
  id: string;
  type: WorldEventType;
  roles: NpcRole[];
  cooldownWeeks: number;
  condition: (ctx: WorldEventContext) => boolean;
  weight: (ctx: WorldEventContext) => number;
  apply: (ctx: WorldEventContext) => void;
}

// ─── Small mutation helpers (kept local; all pure given their inputs) ────────

function changeReach(npc: Npc, mult: number, flat = 0): void {
  if (npc.roleData.fans !== undefined) {
    npc.roleData.fans = Math.max(0, Math.round(npc.roleData.fans * mult + flat));
    if (npc.social.followers < npc.roleData.fans) npc.social.followers = npc.roleData.fans;
  } else {
    npc.social.followers = Math.max(0, Math.round(npc.social.followers * mult + flat));
  }
}

function bumpMomentum(npc: Npc, d: number): void {
  npc.momentum = clamp(npc.momentum + d, -100, 100);
}

function addTag(npc: Npc, tag: string): void {
  if (!npc.tags.includes(tag)) npc.tags.push(tag);
}

function removeTag(npc: Npc, tag: string): void {
  const i = npc.tags.indexOf(tag);
  if (i >= 0) npc.tags.splice(i, 1);
}

function progressGoal(npc: Npc, kind: GoalKind, amount: number): void {
  const g = npc.goals.find((x) => x.kind === kind);
  if (g) g.progress = clamp(g.progress + amount, 0, 100);
}

function hasGoal(npc: Npc, kind: GoalKind): boolean {
  return npc.goals.some((g) => g.kind === kind);
}

function line(rng: Rng, arr: string[]): string {
  return arr[Math.floor(rng.next() * arr.length)];
}

function magFromReach(npc: Npc, other: Npc | null, base: number): number {
  const a = fameLevel(reach(npc));
  const b = other ? fameLevel(reach(other)) : 0;
  return clamp(base + a * 0.5 + b * 0.3, 1, 100);
}

// ─── The catalog ─────────────────────────────────────────────────────────────

export const NPC_EVENTS: NpcEventDef[] = [
  // ── Music releases ────────────────────────────────────────────────────────
  {
    id: 'release-music',
    type: 'release',
    roles: ['artist', 'producer'],
    cooldownWeeks: 2,
    condition: (c) => c.npc.active,
    weight: (c) => {
      const sinceRelease = c.week - (c.npc.roleData.lastReleaseWeek ?? c.week - 8);
      return 4 + c.npc.personality.workEthic * 0.08 + c.npc.personality.ambition * 0.04 + Math.min(sinceRelease, 12) * 0.6;
    },
    apply: (c) => {
      const { npc, rng } = c;
      npc.roleData.lastReleaseWeek = c.week;
      npc.roleData.catalogSize = (npc.roleData.catalogSize ?? 0) + 1;
      // Quality is driven by talent + a roll; flops and hits both happen.
      const quality = clamp(npc.reputation.talent * 0.6 + rng.gauss(20, 18), 0, 100);
      const hit = quality > 62;
      const flop = quality < 32;
      if (hit) {
        changeReach(npc, 1 + rng.float(0.05, 0.22));
        bumpMomentum(npc, rng.int(8, 20));
        applyReputationDelta(npc, { talent: rng.int(1, 4), marketability: rng.int(1, 5) });
        progressGoal(npc, 'top-charts', rng.int(10, 30));
      } else if (flop) {
        bumpMomentum(npc, -rng.int(5, 14));
        applyReputationDelta(npc, { marketability: -rng.int(1, 4) });
      } else {
        changeReach(npc, 1 + rng.float(0.0, 0.05));
        bumpMomentum(npc, rng.int(0, 6));
      }
      npc.social.lastPostWeek = c.week;
      const title = line(rng, ['the new single', 'a surprise drop', 'the EP', 'a late-night release', 'the comeback track']);
      const verb = hit ? line(rng, ['is blowing up', 'is everywhere', 'just went off']) : flop ? line(rng, ['lands with a thud', 'flops', 'gets a lukewarm reception']) : 'drops';
      c.emit({
        type: 'release',
        headline: `${npc.name} ${verb} with ${title}`,
        magnitude: magFromReach(npc, null, hit ? 25 : 8),
        tags: hit ? ['hit'] : flop ? ['flop'] : [],
      });
      // A real hit can snowball into a viral moment.
      if (hit && rng.chance(0.25)) {
        changeReach(npc, 1, Math.round(reach(npc) * rng.float(0.1, 0.4)));
        c.emit({ type: 'viral-moment', headline: `${npc.name} is the sound of the week`, magnitude: magFromReach(npc, null, 30), tags: ['viral'] });
      }
    },
  },

  // ── Viral moment ───────────────────────────────────────────────────────────
  {
    id: 'viral-moment',
    type: 'viral-moment',
    roles: ['artist', 'influencer'],
    cooldownWeeks: 4,
    condition: (c) => c.npc.active && opportunityScore(c.npc, 'viral-potential') > 25,
    weight: (c) => opportunityScore(c.npc, 'viral-potential') * 0.05 + c.npc.personality.volatility * 0.02,
    apply: (c) => {
      const { npc, rng } = c;
      const spike = Math.round(reach(npc) * rng.float(0.15, 0.6)) + rng.int(500, 5000);
      changeReach(npc, 1, spike);
      bumpMomentum(npc, rng.int(10, 25));
      applyReputationDelta(npc, { influence: rng.int(2, 6), marketability: rng.int(1, 4) });
      progressGoal(npc, 'go-viral', rng.int(25, 60));
      c.emit({
        type: 'viral-moment',
        headline: `${npc.name} ${line(rng, ['goes viral overnight', 'breaks the internet', 'is all over everyone\'s feed', 'starts a trend'])}`,
        magnitude: magFromReach(npc, null, 28),
        tags: ['viral'],
      });
    },
  },

  // ── Collaboration ───────────────────────────────────────────────────────────
  {
    id: 'collaboration',
    type: 'collaboration',
    roles: ['artist', 'producer'],
    cooldownWeeks: 3,
    condition: (c) => c.npc.active,
    weight: (c) => 1 + c.npc.personality.openness * 0.04 + c.npc.personality.warmth * 0.02 + (hasGoal(c.npc, 'collaborate') ? 3 : 0),
    apply: (c) => {
      const { npc, rng } = c;
      const partner = c.findTarget({ roles: ['artist', 'producer'], relation: 'any', excludeSelf: true });
      if (!partner) return;
      const relA = c.rel(partner);
      const relB = c.relBack(partner);
      // Collaborations don't happen with active enemies.
      if (relA.dims.rivalry > 55 || relA.dims.resentment > 55) return;
      const lift = rng.int(3, 10);
      adjustRelationship(relA, { friendship: lift, respect: rng.int(2, 8), trust: rng.int(1, 6) }, c.week, `worked with ${partner.name}`);
      adjustRelationship(relB, { friendship: lift, respect: rng.int(2, 8), trust: rng.int(1, 6) }, c.week, `worked with ${npc.name}`);
      if (rng.chance(0.4)) {
        setStatus(relA, 'collaborator', c.week);
        setStatus(relB, 'collaborator', c.week);
      }
      const boost = rng.float(0.02, 0.08);
      changeReach(npc, 1 + boost);
      changeReach(partner, 1 + boost * 0.8);
      bumpMomentum(npc, rng.int(3, 9));
      bumpMomentum(partner, rng.int(2, 7));
      progressGoal(npc, 'collaborate', rng.int(20, 50));
      c.emit({
        type: 'collaboration',
        secondary: partner,
        headline: `${npc.name} & ${partner.name} ${line(rng, ['team up', 'drop a joint track', 'announce a collab', 'link up in the studio'])}`,
        magnitude: magFromReach(npc, partner, 18),
        tags: ['collab'],
      });
    },
  },

  // ── Feud starts ──────────────────────────────────────────────────────────────
  {
    id: 'feud-started',
    type: 'feud-started',
    roles: ['artist', 'influencer'],
    cooldownWeeks: 6,
    condition: (c) => c.npc.active,
    weight: (c) => {
      const p = c.npc.personality;
      return 0.3 + p.ego * 0.03 + p.pettiness * 0.03 + (hasGoal(c.npc, 'start-beef') ? 4 : 0) + (c.npc.momentum < -10 ? 2 : 0);
    },
    apply: (c) => {
      const { npc, rng } = c;
      const target = c.findTarget({ roles: ['artist', 'influencer'], sameGenre: rng.chance(0.6), relation: 'any', excludeSelf: true });
      if (!target) return;
      const relA = c.rel(target);
      const relB = c.relBack(target);
      adjustRelationship(relA, { rivalry: rng.int(20, 40), resentment: rng.int(10, 30), friendship: -rng.int(5, 20) }, c.week, `called out ${target.name}`);
      adjustRelationship(relB, { rivalry: rng.int(15, 35), resentment: rng.int(15, 35) }, c.week, `was called out by ${npc.name}`);
      // Beef is attention: both sides get a momentum/heat bump.
      bumpMomentum(npc, rng.int(2, 8));
      bumpMomentum(target, rng.int(1, 6));
      npc.social.controversyHeat = clamp(npc.social.controversyHeat + rng.int(10, 25), 0, 100);
      target.social.controversyHeat = clamp(target.social.controversyHeat + rng.int(10, 25), 0, 100);
      progressGoal(npc, 'start-beef', 40);
      c.emit({
        type: 'feud-started',
        secondary: target,
        headline: `${npc.name} ${line(rng, ['takes shots at', 'calls out', 'starts beef with', 'subtweets'])} ${target.name}`,
        magnitude: magFromReach(npc, target, 16),
        tags: ['drama', 'feud'],
      });
    },
  },

  // ── Diss track (escalation of an existing rivalry) ────────────────────────────
  {
    id: 'diss-track',
    type: 'diss-track',
    roles: ['artist'],
    cooldownWeeks: 5,
    condition: (c) => c.findKnown((r) => r.dims.rivalry > 40) !== null,
    weight: (c) => 1 + c.npc.personality.pettiness * 0.05 + c.npc.personality.ego * 0.03,
    apply: (c) => {
      const { npc, rng } = c;
      const rival = c.findKnown((r) => r.dims.rivalry > 40);
      if (!rival) return;
      const relA = c.rel(rival);
      const relB = c.relBack(rival);
      const landed = npc.reputation.talent + rng.int(-20, 20) > rival.reputation.talent;
      adjustRelationship(relA, { rivalry: rng.int(10, 25), resentment: rng.int(10, 20) }, c.week, `dissed ${rival.name}`);
      adjustRelationship(relB, { rivalry: rng.int(10, 25), resentment: rng.int(15, 30) }, c.week, `was dissed by ${npc.name}`);
      if (landed) {
        bumpMomentum(npc, rng.int(6, 14));
        bumpMomentum(rival, -rng.int(3, 10));
        applyReputationDelta(npc, { influence: rng.int(1, 5) });
      } else {
        bumpMomentum(npc, -rng.int(2, 8));
      }
      npc.social.controversyHeat = clamp(npc.social.controversyHeat + 20, 0, 100);
      rival.social.controversyHeat = clamp(rival.social.controversyHeat + 20, 0, 100);
      c.emit({
        type: 'diss-track',
        secondary: rival,
        headline: `${npc.name} drops a diss track aimed at ${rival.name}${landed ? ' — and it lands' : ', but it falls flat'}`,
        magnitude: magFromReach(npc, rival, 22),
        tags: ['drama', 'feud', landed ? 'hit' : 'flop'],
      });
    },
  },

  // ── Reconciliation ────────────────────────────────────────────────────────────
  {
    id: 'reconciliation',
    type: 'reconciliation',
    roles: ['artist', 'influencer', 'producer'],
    cooldownWeeks: 6,
    condition: (c) => c.findKnown((r) => r.dims.rivalry > 30 || r.status === 'enemy') !== null,
    weight: (c) => 0.5 + c.npc.personality.warmth * 0.03 + c.npc.personality.loyalty * 0.02 - c.npc.personality.pettiness * 0.02,
    apply: (c) => {
      const { npc, rng } = c;
      const other = c.findKnown((r) => r.dims.rivalry > 30 || r.status === 'enemy');
      if (!other) return;
      const relA = c.rel(other);
      const relB = c.relBack(other);
      adjustRelationship(relA, { rivalry: -rng.int(20, 40), resentment: -rng.int(15, 30), respect: rng.int(5, 15), friendship: rng.int(5, 15) }, c.week, `made peace with ${other.name}`);
      adjustRelationship(relB, { rivalry: -rng.int(20, 40), resentment: -rng.int(15, 30), respect: rng.int(5, 15), friendship: rng.int(5, 15) }, c.week, `made peace with ${npc.name}`);
      c.emit({
        type: 'reconciliation',
        secondary: other,
        headline: `${npc.name} & ${other.name} ${line(rng, ['squash their beef', 'are seen together', 'put their feud to rest', 'shock fans by reconciling'])}`,
        magnitude: magFromReach(npc, other, 12),
        tags: ['drama'],
      });
    },
  },

  // ── Romance ──────────────────────────────────────────────────────────────────
  {
    id: 'romance-started',
    type: 'romance-started',
    roles: ['artist', 'influencer'],
    cooldownWeeks: 8,
    condition: (c) => c.findKnown((r) => r.status === 'dating') === null,
    weight: (c) => 0.4 + c.npc.personality.warmth * 0.03 + (hasGoal(c.npc, 'find-love') ? 3 : 0),
    apply: (c) => {
      const { npc, rng } = c;
      const target = c.findTarget({ roles: ['artist', 'influencer'], relation: 'any', excludeSelf: true });
      if (!target) return;
      const relA = c.rel(target);
      const relB = c.relBack(target);
      if (relA.dims.resentment > 40) return; // no enemies-to-lovers... usually
      adjustRelationship(relA, { attraction: rng.int(30, 55), friendship: rng.int(10, 25), trust: rng.int(10, 25) }, c.week, `started seeing ${target.name}`);
      adjustRelationship(relB, { attraction: rng.int(30, 55), friendship: rng.int(10, 25), trust: rng.int(10, 25) }, c.week, `started seeing ${npc.name}`);
      setStatus(relA, 'dating', c.week, 'together');
      setStatus(relB, 'dating', c.week, 'together');
      bumpMomentum(npc, rng.int(2, 8));
      progressGoal(npc, 'find-love', 60);
      c.emit({
        type: 'romance-started',
        secondary: target,
        headline: `${npc.name} & ${target.name} are reportedly ${line(rng, ['dating', 'an item', 'together', 'the industry\'s new power couple'])}`,
        magnitude: magFromReach(npc, target, 14),
        tags: ['romance'],
      });
    },
  },

  // ── Breakup ──────────────────────────────────────────────────────────────────
  {
    id: 'breakup',
    type: 'breakup',
    roles: ['artist', 'influencer'],
    cooldownWeeks: 4,
    condition: (c) => c.findKnown((r) => r.status === 'dating') !== null,
    weight: (c) => 0.4 + c.npc.personality.volatility * 0.03,
    apply: (c) => {
      const { npc, rng } = c;
      const partner = c.findKnown((r) => r.status === 'dating');
      if (!partner) return;
      const relA = c.rel(partner);
      const relB = c.relBack(partner);
      const messy = npc.personality.volatility > 55 || rng.chance(0.3);
      const resent = messy ? rng.int(30, 55) : rng.int(5, 20);
      adjustRelationship(relA, { attraction: -rng.int(40, 70), trust: -rng.int(20, 40), resentment: resent }, c.week, `broke up with ${partner.name}`);
      adjustRelationship(relB, { attraction: -rng.int(40, 70), trust: -rng.int(20, 40), resentment: resent }, c.week, `broke up with ${npc.name}`);
      setStatus(relA, 'ex', c.week, 'it ended');
      setStatus(relB, 'ex', c.week, 'it ended');
      npc.health.mental = clamp(npc.health.mental - rng.int(5, 15), 0, 100);
      partner.health.mental = clamp(partner.health.mental - rng.int(5, 15), 0, 100);
      bumpMomentum(npc, -rng.int(2, 8));
      if (messy) {
        npc.social.controversyHeat = clamp(npc.social.controversyHeat + rng.int(15, 30), 0, 100);
      }
      c.emit({
        type: 'breakup',
        secondary: partner,
        headline: `${npc.name} & ${partner.name} ${messy ? line(rng, ['split in a messy public breakup', 'unfollow each other amid breakup rumors', 'are over — and it\'s ugly']) : line(rng, ['quietly split', 'go their separate ways', 'call it quits'])}`,
        magnitude: magFromReach(npc, partner, messy ? 18 : 10),
        tags: messy ? ['romance', 'drama'] : ['romance'],
      });
    },
  },

  // ── Label signs an artist ──────────────────────────────────────────────────────
  {
    id: 'deal-signed',
    type: 'deal-signed',
    roles: ['label'],
    cooldownWeeks: 2,
    condition: (c) => (c.npc.roleData.signingAppetite ?? 0) > 30 && (c.npc.roleData.budget ?? 0) > 50_000,
    weight: (c) => 1 + (c.npc.roleData.signingAppetite ?? 0) * 0.04,
    apply: (c) => {
      const { npc: label, rng } = c;
      const artist = c.findTarget({ roles: ['artist'], relation: 'any', excludeSelf: true, minReach: 1000 });
      if (!artist || artist.tags.includes('signed')) return;
      if (opportunityScore(artist, 'label-interest') < 35) return;
      const advance = Math.round((label.roleData.budget ?? 0) * rng.float(0.05, 0.2));
      label.roleData.budget = Math.max(0, (label.roleData.budget ?? 0) - advance);
      label.roleData.roster = [...(label.roleData.roster ?? []), artist.id];
      artist.finances.netWorth += advance;
      artist.finances.weeklyIncome += Math.round(advance * 0.01);
      addTag(artist, 'signed');
      artist.tags.push(`label:${label.id}`);
      applyReputationDelta(artist, { professionalism: rng.int(2, 6), marketability: rng.int(2, 8) });
      bumpMomentum(artist, rng.int(5, 15));
      progressGoal(artist, 'sign-deal', 100);
      const relA = c.rel(artist);
      const relB = c.relBack(artist);
      adjustRelationship(relA, { trust: rng.int(5, 15), respect: rng.int(5, 15) }, c.week, `signed ${artist.name}`);
      adjustRelationship(relB, { trust: rng.int(5, 20), respect: rng.int(5, 15) }, c.week, `signed to ${label.name}`);
      c.emit({
        type: 'deal-signed',
        secondary: artist,
        headline: `${artist.name} signs with ${label.name}${advance > 500_000 ? ' in a major deal' : ''}`,
        magnitude: magFromReach(artist, label, 16),
        tags: ['business'],
      });
    },
  },

  // ── Label drops an artist ───────────────────────────────────────────────────────
  {
    id: 'deal-dropped',
    type: 'deal-dropped',
    roles: ['label'],
    cooldownWeeks: 4,
    condition: (c) => (c.npc.roleData.roster?.length ?? 0) > 0,
    weight: (c) => 0.6,
    apply: (c) => {
      const { npc: label, rng, world } = c;
      const roster = label.roleData.roster ?? [];
      // Drop the worst-performing signee (low momentum / professionalism).
      let worst: Npc | null = null;
      let worstScore = Infinity;
      for (const id of roster) {
        const a = world.npcs[id];
        if (!a) continue;
        const score = a.momentum + a.reputation.professionalism;
        if (score < worstScore) { worstScore = score; worst = a; }
      }
      if (!worst || worstScore > 60) return; // only drop genuine underperformers
      label.roleData.roster = roster.filter((id) => id !== worst!.id);
      removeTag(worst, 'signed');
      worst.tags = worst.tags.filter((t) => t !== `label:${label.id}`);
      bumpMomentum(worst, -rng.int(8, 18));
      applyReputationDelta(worst, { marketability: -rng.int(2, 6) });
      const relA = c.rel(worst);
      const relB = c.relBack(worst);
      adjustRelationship(relA, { trust: -rng.int(10, 20) }, c.week, `dropped ${worst.name}`);
      adjustRelationship(relB, { trust: -rng.int(15, 30), resentment: rng.int(15, 35) }, c.week, `was dropped by ${label.name}`);
      c.emit({
        type: 'deal-dropped',
        secondary: worst,
        headline: `${label.name} ${line(rng, ['drops', 'parts ways with', 'quietly releases'])} ${worst.name}`,
        magnitude: magFromReach(worst, label, 12),
        tags: ['business', 'drama'],
      });
    },
  },

  // ── Tour ───────────────────────────────────────────────────────────────────────
  {
    id: 'tour-announced',
    type: 'tour-announced',
    roles: ['artist'],
    cooldownWeeks: 20,
    condition: (c) => c.npc.active && reach(c.npc) > 40_000 && !c.npc.tags.includes('on-tour'),
    weight: (c) => 0.5 + c.npc.personality.ambition * 0.03 + fameLevel(reach(c.npc)) * 0.02,
    apply: (c) => {
      const { npc, rng } = c;
      addTag(npc, 'on-tour');
      const gross = Math.round(reach(npc) * rng.float(0.5, 3));
      npc.finances.netWorth += gross;
      changeReach(npc, 1 + rng.float(0.03, 0.1));
      bumpMomentum(npc, rng.int(5, 15));
      npc.health.burnout = clamp(npc.health.burnout + rng.int(10, 25), 0, 100);
      progressGoal(npc, 'go-on-tour', 100);
      c.emit({
        type: 'tour-announced',
        headline: `${npc.name} announces ${line(rng, ['a world tour', 'a sold-out run', 'an arena tour', 'a string of dates'])}`,
        magnitude: magFromReach(npc, null, 20),
        tags: ['business'],
      });
    },
  },

  // ── Scandal ───────────────────────────────────────────────────────────────────
  {
    id: 'scandal',
    type: 'scandal',
    roles: ['artist', 'influencer'],
    cooldownWeeks: 6,
    condition: (c) => c.npc.active,
    weight: (c) => {
      const p = c.npc.personality;
      const h = c.npc.health;
      return 0.3 + p.volatility * 0.03 + h.addiction * 0.02 + (100 - c.npc.reputation.professionalism) * 0.01 + p.ego * 0.01;
    },
    apply: (c) => {
      const { npc, rng } = c;
      const severity = rng.next();
      const heat = severity > 0.8 ? rng.int(55, 85) : severity > 0.5 ? rng.int(30, 55) : rng.int(15, 30);
      npc.social.controversyHeat = clamp(npc.social.controversyHeat + heat, 0, 100);
      applyReputationDelta(npc, { authenticity: -rng.int(3, 10), professionalism: -rng.int(2, 8) });
      npc.health.mental = clamp(npc.health.mental - rng.int(3, 12), 0, 100);
      // Notoriety is a double-edged sword — some scandals grow the audience.
      if (rng.chance(0.4)) changeReach(npc, 1 + rng.float(0.01, 0.06));
      else changeReach(npc, 1 - rng.float(0.01, 0.05));
      bumpMomentum(npc, -rng.int(2, 12));
      const kind = line(rng, [
        'is caught in a leaked-audio scandal',
        'faces backlash over old posts',
        'is at the center of a cheating rumor',
        'is accused of faking it',
        'goes on an unhinged late-night rant',
        'is dragged for a tone-deaf interview',
      ]);
      c.emit({
        type: 'scandal',
        headline: `${npc.name} ${kind}`,
        magnitude: magFromReach(npc, null, 10 + heat * 0.3),
        tags: ['drama', 'scandal'],
      });
    },
  },

  // ── Award ───────────────────────────────────────────────────────────────────────
  {
    id: 'award',
    type: 'award',
    roles: ['artist', 'producer'],
    cooldownWeeks: 10,
    condition: (c) => opportunityScore(c.npc, 'award-worthiness') > 55,
    weight: (c) => (opportunityScore(c.npc, 'award-worthiness') - 50) * 0.06 + (hasGoal(c.npc, 'win-award') ? 2 : 0),
    apply: (c) => {
      const { npc, rng } = c;
      applyReputationDelta(npc, { talent: rng.int(2, 6), influence: rng.int(2, 6), professionalism: rng.int(1, 4) });
      bumpMomentum(npc, rng.int(5, 14));
      changeReach(npc, 1 + rng.float(0.02, 0.08));
      progressGoal(npc, 'win-award', 100);
      c.emit({
        type: 'award',
        headline: `${npc.name} ${line(rng, ['wins big at the awards', 'takes home Artist of the Year', 'sweeps the ceremony', 'earns a major award'])}`,
        magnitude: magFromReach(npc, null, 26),
        tags: ['triumph'],
      });
    },
  },

  // ── Lawsuit ───────────────────────────────────────────────────────────────────────
  {
    id: 'lawsuit',
    type: 'lawsuit',
    roles: ['artist', 'label', 'producer'],
    cooldownWeeks: 12,
    condition: (c) => c.findKnown((r) => r.dims.resentment > 45 || r.status === 'enemy') !== null,
    weight: (c) => 0.3 + c.npc.personality.pettiness * 0.02,
    apply: (c) => {
      const { npc, rng } = c;
      const target = c.findKnown((r) => r.dims.resentment > 45 || r.status === 'enemy');
      if (!target) return;
      const cost = rng.int(20_000, 400_000);
      npc.finances.netWorth -= Math.round(cost * 0.4);
      target.finances.netWorth -= cost;
      const relA = c.rel(target);
      const relB = c.relBack(target);
      adjustRelationship(relA, { resentment: rng.int(5, 15) }, c.week, `sued ${target.name}`);
      adjustRelationship(relB, { resentment: rng.int(15, 30), trust: -rng.int(10, 20) }, c.week, `was sued by ${npc.name}`);
      applyReputationDelta(target, { professionalism: -rng.int(2, 6) });
      c.emit({
        type: 'lawsuit',
        secondary: target,
        headline: `${npc.name} ${line(rng, ['files a lawsuit against', 'takes legal action against', 'sues'])} ${target.name}`,
        magnitude: magFromReach(npc, target, 14),
        tags: ['business', 'drama'],
      });
    },
  },

  // ── Mental health crisis ─────────────────────────────────────────────────────────
  {
    id: 'mental-crisis',
    type: 'mental-crisis',
    roles: ['artist', 'influencer', 'producer'],
    cooldownWeeks: 8,
    condition: (c) => c.npc.health.burnout > 60 || c.npc.health.mental < 35 || c.npc.health.addiction > 55,
    weight: (c) => {
      const h = c.npc.health;
      return 0.5 + Math.max(0, h.burnout - 50) * 0.04 + Math.max(0, 40 - h.mental) * 0.05 + Math.max(0, h.addiction - 40) * 0.03;
    },
    apply: (c) => {
      const { npc, rng } = c;
      npc.health.mental = clamp(npc.health.mental - rng.int(8, 20), 0, 100);
      npc.health.physical = clamp(npc.health.physical - rng.int(3, 12), 0, 100);
      bumpMomentum(npc, -rng.int(10, 25));
      const enteringTreatment = rng.chance(0.4);
      if (enteringTreatment) {
        npc.health.inTreatment = true;
        addTag(npc, 'hiatus');
      }
      if (!hasGoal(npc, 'recover')) npc.goals.push({ kind: 'recover', priority: 90, progress: 0 });
      removeTag(npc, 'on-tour');
      c.emit({
        type: 'mental-crisis',
        headline: `${npc.name} ${enteringTreatment ? line(rng, ['checks into treatment', 'announces a hiatus for their health', 'steps back to recover']) : line(rng, ['opens up about burnout', 'has a public meltdown', 'cancels appearances citing exhaustion'])}`,
        magnitude: magFromReach(npc, null, 14),
        tags: ['drama', 'health'],
      });
    },
  },

  // ── Comeback ────────────────────────────────────────────────────────────────────────
  {
    id: 'comeback',
    type: 'comeback',
    roles: ['artist', 'influencer'],
    cooldownWeeks: 12,
    condition: (c) => (c.npc.stage === 'declining' || c.npc.momentum < -25) && reach(c.npc) > 20_000,
    weight: (c) => 0.4 + c.npc.personality.ambition * 0.03 + c.npc.personality.workEthic * 0.02,
    apply: (c) => {
      const { npc, rng } = c;
      npc.momentum = clamp(npc.momentum + rng.int(30, 55), -100, 100);
      changeReach(npc, 1 + rng.float(0.05, 0.2));
      applyReputationDelta(npc, { marketability: rng.int(3, 8), influence: rng.int(2, 6) });
      npc.health.inTreatment = false;
      removeTag(npc, 'hiatus');
      progressGoal(npc, 'stay-relevant', 50);
      c.emit({
        type: 'comeback',
        headline: `${npc.name} ${line(rng, ['mounts a stunning comeback', 'is back and bigger than ever', 'returns to the spotlight', 'reinvents themselves'])}`,
        magnitude: magFromReach(npc, null, 22),
        tags: ['triumph'],
      });
    },
  },

  // ── Retirement ────────────────────────────────────────────────────────────────────────
  {
    id: 'retirement',
    type: 'retirement',
    roles: ['artist', 'influencer', 'producer'],
    cooldownWeeks: 999,
    condition: (c) => {
      const age = c.week - c.npc.bornWeek;
      const burntOut = c.npc.health.mental < 25 || c.npc.health.physical < 25;
      return (age > 200 && c.npc.momentum < -20) || (c.npc.stage === 'declining' && age > 120) || burntOut;
    },
    weight: (c) => 0.15 + (c.npc.momentum < -40 ? 0.5 : 0) + (c.npc.health.mental < 25 ? 0.6 : 0),
    apply: (c) => {
      const { npc, rng } = c;
      npc.active = false;
      addTag(npc, 'retired');
      removeTag(npc, 'on-tour');
      c.world.retiredCount++;
      c.emit({
        type: 'retirement',
        headline: `${npc.name} ${line(rng, ['announces retirement', 'steps away from music', 'calls it a career', 'bows out'])}`,
        magnitude: magFromReach(npc, null, 20),
        tags: ['legacy'],
      });
    },
  },

  // ── Undiscovered breakout (debut) ──────────────────────────────────────────────────────
  {
    id: 'debut-breakout',
    type: 'debut',
    roles: ['artist'],
    cooldownWeeks: 8,
    condition: (c) => c.npc.stage === 'undiscovered' && c.npc.reputation.talent > 45,
    weight: (c) => 0.4 + c.npc.personality.workEthic * 0.03 + c.npc.reputation.talent * 0.02,
    apply: (c) => {
      const { npc, rng } = c;
      changeReach(npc, 1, rng.int(2_000, 30_000));
      bumpMomentum(npc, rng.int(15, 35));
      applyReputationDelta(npc, { marketability: rng.int(2, 6), influence: rng.int(1, 4) });
      c.emit({
        type: 'debut',
        headline: `${npc.name} ${line(rng, ['breaks out of nowhere', 'is the buzzy new name', 'goes from unknown to one-to-watch', 'finally breaks through'])}`,
        magnitude: magFromReach(npc, null, 14),
        tags: ['rising'],
      });
    },
  },

  // ── Journalist coverage (shapes others' reputations via bias) ────────────────────────────
  {
    id: 'press-coverage',
    type: 'viral-moment',
    roles: ['journalist'],
    cooldownWeeks: 1,
    condition: (c) => c.npc.active,
    weight: (c) => 2 + c.npc.social.weeklyPostRate * 0.1,
    apply: (c) => {
      const { npc, rng } = c;
      const subject = c.findTarget({ roles: ['artist', 'influencer'], relation: 'any', excludeSelf: true, minReach: 5000 });
      if (!subject) return;
      const bias = npc.roleData.bias ?? 0;
      const favorable = bias + rng.int(-40, 40) > 0;
      if (favorable) {
        applyReputationDelta(subject, { marketability: rng.int(1, 5), influence: rng.int(1, 3) });
        bumpMomentum(subject, rng.int(1, 5));
        c.emit({
          type: 'viral-moment',
          secondary: subject,
          headline: `${npc.roleData.outlet ?? npc.name} runs a glowing feature on ${subject.name}`,
          magnitude: magFromReach(subject, null, 8),
          tags: ['press'],
        });
      } else {
        subject.social.controversyHeat = clamp(subject.social.controversyHeat + rng.int(8, 20), 0, 100);
        applyReputationDelta(subject, { authenticity: -rng.int(1, 4) });
        bumpMomentum(subject, -rng.int(1, 5));
        c.emit({
          type: 'scandal',
          secondary: subject,
          headline: `${npc.roleData.outlet ?? npc.name} publishes a scathing exposé on ${subject.name}`,
          magnitude: magFromReach(subject, null, 12),
          tags: ['press', 'drama'],
        });
      }
    },
  },

  // ── Fan community activity (stan culture) ───────────────────────────────────────────────────
  {
    id: 'fan-activity',
    type: 'viral-moment',
    roles: ['fan-community'],
    cooldownWeeks: 1,
    condition: (c) => {
      const patron = c.npc.roleData.patronId ? c.world.npcs[c.npc.roleData.patronId] : null;
      return !!patron && patron.active;
    },
    weight: (c) => 1 + (c.npc.roleData.fervor ?? 50) * 0.03,
    apply: (c) => {
      const { npc, rng, world } = c;
      const patron = world.npcs[npc.roleData.patronId!];
      if (!patron) return;
      // Stans either rally for their fave or start a fan war with a rival's base.
      if (rng.chance(0.7)) {
        patron.social.engagement = clamp(patron.social.engagement + rng.int(1, 5), 0, 100);
        changeReach(patron, 1, rng.int(50, 1500));
        npc.social.followers += rng.int(20, 400);
        c.emit({
          type: 'viral-moment',
          secondary: patron,
          headline: `${npc.name} ${line(rng, ['gets', 'pushes', 'trends'])} #${patron.name.replace(/\s/g, '')} ${line(rng, ['trending', 'to #1', 'worldwide'])}`,
          magnitude: magFromReach(patron, null, 6),
          tags: ['fans'],
        });
      } else {
        // Find a rival of the patron and harass their fanbase.
        const rivalId = Object.values(patron.relationships).find((r) => r.dims.rivalry > 35)?.targetId;
        const rival = rivalId ? world.npcs[rivalId] : null;
        if (!rival) return;
        rival.social.controversyHeat = clamp(rival.social.controversyHeat + rng.int(3, 12), 0, 100);
        patron.social.controversyHeat = clamp(patron.social.controversyHeat + rng.int(2, 8), 0, 100);
        c.emit({
          type: 'feud-started',
          secondary: rival,
          headline: `A fan war erupts between ${patron.name} and ${rival.name} stans`,
          magnitude: magFromReach(patron, rival, 8),
          tags: ['fans', 'drama'],
        });
      }
    },
  },
];

/** Index of events by role for fast eligibility scans in the hot loop. */
export const EVENTS_BY_ROLE: Record<NpcRole, NpcEventDef[]> = {
  artist: [],
  influencer: [],
  journalist: [],
  label: [],
  producer: [],
  'fan-community': [],
};
for (const def of NPC_EVENTS) {
  for (const role of def.roles) EVENTS_BY_ROLE[role].push(def);
}
