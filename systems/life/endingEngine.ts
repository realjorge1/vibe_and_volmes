import type { EndingDef, EndingId } from '../../types/life';
import type { MentalState } from '../../types/industry';
import type { Player, PlayerStats } from '../../types/player';
import type { Person } from '../../types/people';
import type { HeirFamilyMember, HeirInheritance } from '../../types/meta';
import type { IdentityLabel, LegacyTier } from '../../types/legacy';
import { ENDINGS } from '../../data/life/endings';
import { BLOODLINES } from '../../data/meta/bloodlines';
import {
  HEIR_FANS_CAP,
  HEIR_FANS_SHARE,
  HEIR_MONEY_CAP,
  HEIR_MONEY_SHARE,
  MIN_START_AGE,
} from '../../constants/gameConfig';
import { activePeople, childAge, surnameOf } from './peopleEngine';

/**
 * Endings engine. Pure: whether a career ends this week, and what the next
 * generation inherits if the artist continues as their child.
 */

export interface EndingContext {
  week: number;
  age: number;
  stats: PlayerStats;
  mental: MentalState;
  tags: string[];
}

/** This week's chance of `def`, or 0 when its check fails. */
export function endingChance(def: EndingDef, ctx: EndingContext): number {
  const c = def.check;
  if (c.minWeek !== undefined && ctx.week < c.minWeek) return 0;
  if (c.minAge !== undefined && ctx.age < c.minAge) return 0;
  for (const s of c.statLte ?? []) if ((ctx.stats[s.stat] as number) > s.value) return 0;
  for (const m of c.mentalGte ?? []) if (ctx.mental[m.axis] < m.value) return 0;
  for (const t of c.tags ?? []) if (!ctx.tags.includes(t)) return 0;
  const aged = def.ageRisk ? Math.max(0, ctx.age - def.ageRisk.from) * def.ageRisk.perYear : 0;
  return Math.min(1, def.chance + aged);
}

/** The first ending (in catalog order) whose roll lands this week. */
export function rollEnding(
  ctx: EndingContext,
  rng: () => number = Math.random,
  endings: readonly EndingDef[] = ENDINGS
): EndingDef | null {
  for (const def of endings) {
    const p = endingChance(def, ctx);
    if (p > 0 && rng() < p) return def;
  }
  return null;
}

export function fillFinalLine(def: EndingDef, artistName: string, age: number): string {
  return def.finalLine.replace(/\{artist\}/g, artistName).replace(/\{age\}/g, String(age));
}

/** The bloodline a child is born into, from how the parent is remembered. */
export function bloodlineFor(identity: IdentityLabel): string | null {
  return BLOODLINES.find((b) => b.unlockIdentity.includes(identity))?.id ?? null;
}

function parentTitle(gender: Player['gender']): string {
  return gender === 'male' ? 'your dad' : gender === 'female' ? 'your mom' : 'your parent';
}

function siblingTitle(child: Person): string {
  if (child.title === 'your daughter') return 'your sister';
  if (child.title === 'your son') return 'your brother';
  return 'your sibling';
}

export interface HeirSource {
  player: Player;
  week: number;
  /** The child continuing the story. */
  child: Person;
  people: Person[];
  peakFans: number;
  rivalIds: string[];
  identity: IdentityLabel;
  identityTitle: string;
  legacyTier: LegacyTier;
  ending: EndingId;
  died: boolean;
  /** What the songs the artist owns pay each week: the estate's catalog. */
  catalogWeekly?: number;
}

/** Weeks of catalog royalties the estate passes on (the masters keep paying). */
export const HEIR_CATALOG_WEEKS = 26;
export const HEIR_CATALOG_CAP = 500_000;

/**
 * What the next career inherits. The child starts at their own age (at
 * least MIN_START_AGE: years pass off-screen), in the parent's city, leaning
 * toward the parent's genre, with part of the money, some of the fans, the
 * family's rivals, and the family itself — including the previous artist,
 * unless this ending was their death.
 */
export function buildHeir(src: HeirSource): HeirInheritance {
  const { player, child, people } = src;
  const family: HeirFamilyMember[] = [];
  if (!src.died) {
    family.push({
      name: player.realName.split(/\s+/)[0] || player.artistName,
      role: 'parent',
      title: parentTitle(player.gender),
      affinity: child.affinity,
      traits: ['famous-parent', 'supportive'],
    });
  }
  const otherParent = child.otherParentId
    ? activePeople(people).find((p) => p.id === child.otherParentId)
    : undefined;
  if (otherParent) {
    family.push({
      name: otherParent.name,
      role: 'parent',
      title: 'your parent',
      affinity: 50,
      traits: otherParent.npcId ? ['famous-parent'] : [],
    });
  }
  for (const sib of activePeople(people)) {
    if (sib.role !== 'child' || sib.id === child.id) continue;
    family.push({
      name: sib.name,
      role: 'sibling',
      title: siblingTitle(sib),
      affinity: 40,
      traits: [],
    });
  }

  return {
    generation: (player.generation ?? 1) + 1,
    childName: child.name,
    surname: surnameOf(player.realName) || player.artistName,
    gender: child.title === 'your daughter' ? 'female' : child.title === 'your son' ? 'male' : 'nonbinary',
    startAge: Math.max(MIN_START_AGE, childAge(child, src.week)),
    city: player.city,
    genre: player.genre,
    // Part of the money, plus the catalog: the songs they owned keep paying.
    money:
      Math.min(HEIR_MONEY_CAP, Math.round(player.money * HEIR_MONEY_SHARE)) +
      Math.min(HEIR_CATALOG_CAP, Math.round((src.catalogWeekly ?? 0) * HEIR_CATALOG_WEEKS)),
    fans: Math.min(HEIR_FANS_CAP, Math.round(src.peakFans * HEIR_FANS_SHARE)),
    rivalIds: src.rivalIds,
    bloodlineId: bloodlineFor(src.identity),
    parent: {
      artistName: player.artistName,
      identity: src.identity,
      identityTitle: src.identityTitle,
      legacyTier: src.legacyTier,
      ending: src.ending,
    },
    family,
  };
}
