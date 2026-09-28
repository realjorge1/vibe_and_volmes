import type { MusicGenre } from '../../types/player';
import type {
  GoalKind,
  Npc,
  NpcGoal,
  NpcRole,
  PersonalityTraits,
  ReputationDimensions,
  WorldGenConfig,
  WorldState,
} from '../../types/world';
import { Rng, clamp, hash32 } from './rng';
import { genFanCommunityName, genIdentity, genOutlet } from '../../data/world/names';
import { careerStageFor, fameLevel } from './reputation';
import { adjustRelationship, getOrCreateRelationship, setStatus } from './relationships';

const GENRES: MusicGenre[] = [
  'hip-hop', 'pop', 'r&b', 'rock', 'electronic', 'country', 'latin', 'gospel',
];

// Tier 0..4 ~ undiscovered / rising / established / star / legend.
// Heavily weighted toward the bottom so the world is a realistic pyramid.
const TIER_WEIGHTS = [40, 32, 18, 8, 2];
const TIER_REACH: [number, number][] = [
  [50, 900],
  [1_000, 49_000],
  [50_000, 490_000],
  [500_000, 4_900_000],
  [5_000_000, 40_000_000],
];

function rollTier(rng: Rng): number {
  const total = TIER_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < TIER_WEIGHTS.length; i++) {
    r -= TIER_WEIGHTS[i];
    if (r <= 0) return i;
  }
  return 0;
}

function randomPersonality(rng: Rng): PersonalityTraits {
  const t = () => clamp(Math.round(rng.gauss(50, 18)), 0, 100);
  return {
    ambition: t(),
    ego: t(),
    loyalty: t(),
    volatility: t(),
    openness: t(),
    workEthic: t(),
    warmth: t(),
    pettiness: t(),
  };
}

function baseReputation(rng: Rng, tier: number): ReputationDimensions {
  // Bigger acts read as more talented/marketable on average, with noise.
  const lift = tier * 9;
  const v = (n: number) => clamp(Math.round(rng.gauss(35 + lift, 14)), 0, 100);
  return {
    talent: v(0),
    authenticity: v(0),
    professionalism: v(0),
    marketability: v(0),
    influence: clamp(Math.round(rng.gauss(25 + lift * 1.1, 13)), 0, 100),
  };
}

const ROLE_GOALS: Record<NpcRole, GoalKind[]> = {
  artist: ['top-charts', 'go-viral', 'win-award', 'go-on-tour', 'collaborate', 'sign-deal', 'find-love', 'start-beef', 'reinvent', 'stay-relevant'],
  influencer: ['go-viral', 'expand-empire', 'collaborate', 'start-beef', 'find-love', 'stay-relevant'],
  journalist: ['expand-empire', 'stay-relevant', 'go-viral'],
  label: ['expand-empire', 'sign-deal', 'stay-relevant'],
  producer: ['collaborate', 'expand-empire', 'win-award', 'stay-relevant'],
  'fan-community': ['expand-empire', 'stay-relevant'],
};

function genGoals(rng: Rng, role: NpcRole, personality: PersonalityTraits, stage: string): NpcGoal[] {
  const pool = ROLE_GOALS[role];
  const count = rng.int(1, role === 'artist' ? 3 : 2);
  const chosen = rng.shuffle(pool).slice(0, count);

  // Personality nudges priorities so goals feel motivated, not random.
  const bias = (kind: GoalKind): number => {
    switch (kind) {
      case 'start-beef': return personality.ego + personality.pettiness;
      case 'find-love': return personality.warmth;
      case 'collaborate': return personality.openness + personality.warmth;
      case 'top-charts':
      case 'expand-empire': return personality.ambition;
      case 'win-award': return personality.ambition + personality.workEthic;
      case 'stay-relevant': return stage === 'declining' || stage === 'legend' ? 120 : 30;
      case 'recover': return personality.volatility;
      default: return 50;
    }
  };

  return chosen.map((kind) => ({
    kind,
    priority: clamp(Math.round(bias(kind) / 2 + rng.gauss(0, 10)), 5, 100),
    progress: rng.int(0, 25),
  }));
}

export interface GenerateNpcOptions {
  rng: Rng;
  id: string;
  role: NpcRole;
  week: number;
  genre?: MusicGenre | null;
  forceTier?: number;
}

/** Generate a single, internally-consistent NPC. */
export function generateNpc(opts: GenerateNpcOptions): Npc {
  const { rng, id, role, week } = opts;
  const tier = opts.forceTier ?? rollTier(rng);
  const [lo, hi] = TIER_REACH[tier];
  const reachVal = rng.int(lo, hi);

  const isMusical = role === 'artist' || role === 'producer';
  const genre = opts.genre !== undefined
    ? opts.genre
    : isMusical || role === 'fan-community'
      ? rng.pick(GENRES)
      : null;

  const ident = genIdentity(rng, role);
  const personality = randomPersonality(rng);
  const reputation = baseReputation(rng, tier);
  const fame = fameLevel(reachVal);

  const followers = role === 'label' ? rng.int(2_000, 80_000) : reachVal;
  const netWorth = Math.round(
    (tier === 0 ? rng.int(-3_000, 8_000) : reachVal * rng.float(0.3, 2.2)) +
    (role === 'label' ? rng.int(200_000, 20_000_000) : 0),
  );
  const weeklyIncome = Math.round(reachVal * rng.float(0.002, 0.02));
  const weeklyBurn = Math.round(weeklyIncome * rng.float(0.4, 1.3) + 200);

  const npc: Npc = {
    id,
    name: ident.name,
    handle: ident.handle,
    role,
    stage: 'undiscovered', // set properly below
    genre,
    personality,
    reputation,
    relationships: {},
    goals: [],
    finances: {
      netWorth,
      weeklyIncome,
      weeklyBurn,
      inDebt: netWorth < 0,
    },
    health: {
      physical: clamp(Math.round(rng.gauss(72, 14)), 10, 100),
      mental: clamp(Math.round(rng.gauss(68, 16)), 5, 100),
      burnout: clamp(Math.round(rng.gauss(20, 14)), 0, 100),
      addiction: clamp(Math.round(rng.gauss(8, 12)), 0, 100),
      inTreatment: false,
    },
    social: {
      followers,
      weeklyPostRate: clamp(Math.round(rng.gauss(4, 3)), 0, 30),
      engagement: clamp(Math.round(rng.gauss(45, 18)), 0, 100),
      lastPostWeek: week,
      controversyHeat: 0,
    },
    roleData: {},
    momentum: clamp(Math.round(rng.gauss(0, 18)), -100, 100),
    bornWeek: week,
    active: true,
    tags: [],
    cooldowns: {},
  };

  // Role-specific data.
  switch (role) {
    case 'artist':
      npc.roleData.fans = reachVal;
      npc.roleData.catalogSize = rng.int(0, tier * 6 + 2);
      npc.roleData.lastReleaseWeek = week - rng.int(1, 30);
      break;
    case 'producer':
      npc.roleData.fans = Math.round(reachVal * 0.4);
      npc.roleData.catalogSize = rng.int(1, tier * 10 + 3);
      break;
    case 'label':
      npc.roleData.roster = [];
      npc.roleData.budget = Math.round(rng.float(0.05, 0.4) * (npc.finances.netWorth + 1_000_000));
      npc.roleData.signingAppetite = clamp(Math.round(rng.gauss(50, 22)), 0, 100);
      break;
    case 'journalist':
      npc.roleData.outlet = genOutlet(rng).name;
      npc.roleData.bias = Math.round(rng.gauss(0, 35));
      break;
    case 'fan-community':
      npc.roleData.fervor = clamp(Math.round(rng.gauss(60, 18)), 0, 100);
      break;
  }

  npc.stage = careerStageFor(npc);
  npc.goals = genGoals(rng, role, personality, npc.stage);
  void fame; // computed for clarity / future hooks
  return npc;
}

/**
 * Seed a small amount of initial social texture so a freshly-generated world
 * already has rivalries, friendships and a few romances on week 1 instead of
 * being a room full of strangers.
 */
function seedInitialRelationships(world: WorldState, rng: Rng): void {
  const artists = world.npcIds
    .map((id) => world.npcs[id])
    .filter((n) => n.role === 'artist');

  for (const a of artists) {
    if (rng.chance(0.55)) continue;
    const peers = rng.shuffle(artists.filter((b) => b.id !== a.id)).slice(0, rng.int(1, 3));
    for (const b of peers) {
      const sameGenre = a.genre === b.genre;
      const relA = getOrCreateRelationship(a, b.id, world.week);
      const relB = getOrCreateRelationship(b, a.id, world.week);
      const roll = rng.next();
      if (roll < 0.4 && sameGenre) {
        // Same-lane competition breeds rivalry.
        adjustRelationship(relA, { rivalry: rng.int(25, 55), respect: rng.int(-5, 25) }, world.week, 'history with');
        adjustRelationship(relB, { rivalry: rng.int(25, 55), respect: rng.int(-5, 25) }, world.week, 'history with');
      } else if (roll < 0.85) {
        const f = rng.int(15, 45);
        adjustRelationship(relA, { friendship: f, trust: rng.int(5, 30) }, world.week, 'old friends');
        adjustRelationship(relB, { friendship: f, trust: rng.int(5, 30) }, world.week, 'old friends');
      } else {
        // Rare pre-existing romance.
        adjustRelationship(relA, { attraction: rng.int(40, 70), friendship: rng.int(20, 40), trust: rng.int(20, 40) }, world.week);
        adjustRelationship(relB, { attraction: rng.int(40, 70), friendship: rng.int(20, 40), trust: rng.int(20, 40) }, world.week);
        setStatus(relA, 'dating', world.week, 'together');
        setStatus(relB, 'dating', world.week, 'together');
      }
    }
  }
}

export const DEFAULT_WORLD_CONFIG: WorldGenConfig = {
  artists: 120,
  influencers: 40,
  journalists: 15,
  labels: 10,
  producers: 25,
  fanCommunities: 50,
};

/**
 * Build a complete, internally-consistent world from a seed. Fully
 * deterministic: `generateWorld(s, c)` always returns the same world for the
 * same `s` and `c`.
 */
export function generateWorld(
  seed: number,
  config: WorldGenConfig = DEFAULT_WORLD_CONFIG,
  startWeek = 0,
): WorldState {
  const world: WorldState = {
    seed,
    week: startWeek,
    npcs: {},
    npcIds: [],
    events: [],
    eventCount: 0,
    retiredCount: 0,
  };

  let index = 0;
  const add = (role: NpcRole, count: number, prefix: string) => {
    for (let i = 0; i < count; i++) {
      const id = `${prefix}-${i}`;
      const npc = generateNpc({
        rng: new Rng(hash32(seed, index)),
        id,
        role,
        week: startWeek,
      });
      world.npcs[id] = npc;
      world.npcIds.push(id);
      index++;
    }
  };

  add('artist', config.artists, 'art');
  add('influencer', config.influencers, 'inf');
  add('journalist', config.journalists, 'jrn');
  add('label', config.labels, 'lbl');
  add('producer', config.producers, 'prd');

  // Fan communities attach to existing artists (popular ones draw bigger fanbases).
  const artists = world.npcIds.map((id) => world.npcs[id]).filter((n) => n.role === 'artist');
  for (let i = 0; i < config.fanCommunities; i++) {
    const rng = new Rng(hash32(seed, index));
    const patron =
      rng.weightedPick(artists, (a) => fameLevel(a.roleData.fans ?? 0) + 5) ?? artists[0];
    const id = `fan-${i}`;
    const npc = generateNpc({ rng, id, role: 'fan-community', week: startWeek, genre: patron?.genre ?? null });
    if (patron) {
      npc.roleData.patronId = patron.id;
      const ident = genFanCommunityName(rng, patron.name);
      npc.name = ident.name;
      npc.handle = ident.handle;
      npc.social.followers = Math.max(100, Math.round((patron.roleData.fans ?? 1000) * rng.float(0.02, 0.15)));
    }
    world.npcs[id] = npc;
    world.npcIds.push(id);
    index++;
  }

  seedInitialRelationships(world, new Rng(hash32(seed, 0x5eed)));
  return world;
}
