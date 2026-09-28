import type { NpcRole } from '../../types/world';
import type { Rng } from '../../systems/world/rng';

/**
 * Deterministic name generation for world NPCs. Unlike `utils/nameGenerator.ts`
 * (which pulls from `Math.random`), every function here takes an `Rng` so the
 * generated world is fully reproducible from its seed.
 */

const STAGE_PREFIX = [
  'Lil', 'Young', 'Big', 'King', 'Queen', 'DJ', 'MC', 'Saint', 'Baby', 'Yung',
  'Sir', 'Lady', 'Prince', 'Mad', 'Slim', 'Fat', 'Real', 'Trippie', 'Glo',
];

const STAGE_CORE = [
  'Blaze', 'Nova', 'Remy', 'Prophet', 'Kassia', 'Vector', 'Destine', 'Cash',
  'Ember', 'Luca', 'Sable', 'Onyx', 'Echo', 'Vega', 'Rune', 'Zaire', 'Mireya',
  'Cipher', 'Halo', 'Drift', 'Marlo', 'Sage', 'Koda', 'Wren', 'Axel', 'Juno',
  'Reign', 'Storm', 'Lyric', 'Phoenix', 'Crew', 'Maverick', 'Nyla', 'Kairo',
];

const STAGE_SUFFIX = [
  '', '', '', '', // weight toward no suffix
  'Omen', 'Starr', 'Zero', 'Fox', 'Moreno', 'B', 'Wave', 'World', 'God',
  'Santana', '3x', 'Glock', 'Boy', 'Girl', 'Money', 'Soul', 'Gz',
];

const REAL_FIRST = [
  'Marcus', 'Devon', 'Jaylen', 'Xavier', 'Malik', 'Andre', 'Elijah', 'Isaiah',
  'Aaliyah', 'Brianna', 'Ciara', 'Diamond', 'Faith', 'Imani', 'Jasmine',
  'Maya', 'Olivia', 'Simone', 'Carmen', 'Renata', 'Theo', 'Wesley', 'Greta',
  'Naomi', 'Priya', 'Lena', 'Hassan', 'Mateo', 'Sofia', 'Dimitri', 'Yuki',
];

const REAL_LAST = [
  'Banks', 'Carter', 'Davis', 'Evans', 'Ford', 'Grant', 'Harris', 'Jackson',
  'King', 'Mason', 'Nash', 'Owens', 'Price', 'Quinn', 'Reed', 'Simmons',
  'Walker', 'Young', 'Castillo', 'Okafor', 'Petrova', 'Nakamura', 'Hale',
  'Vance', 'Cole', 'Frost', 'Mercer', 'Sloane', 'Rhodes', 'Delgado',
];

const OUTLET_NAMES = [
  'PitchWave', 'SoundCheck', 'The Drop', 'Volume', 'Resonance', 'Static Mag',
  'The Honest Ear', 'Crescendo', 'Backbeat', 'Frequency', 'TasteMakers',
  'The Mix', 'Loud Quarterly', 'Cymbal', 'Reverb Report', 'The Liner Notes',
];

const LABEL_FIRST = [
  'Apex', 'Crown', 'Golden', 'Midnight', 'Skyline', 'Iron', 'Velvet', 'North',
  'Empire', 'Echo', 'Lunar', 'Pulse', 'Diamond', 'Wildfire', 'Atlas', 'Monarch',
];

const LABEL_SECOND = [
  'Records', 'Sound', 'Music Group', 'Recordings', 'Entertainment', 'Collective',
  'Audio', 'Tapes', 'Media', 'Label', 'House', 'Studios',
];

const PRODUCER_TAGS = [
  'Beatsmith', 'Knobs', 'TrackLord', 'Maestro', 'Wizard', 'Architect', 'Plug',
  'Engineer', 'Sauce', 'Boardroom', 'Frequency', 'Loops',
];

const FAN_COMMUNITY_SUFFIX = [
  'Nation', 'Army', 'Stans', 'World', 'Hive', 'Cult', 'Faithful', 'Disciples',
  'Crew', 'Gang', 'Collective', 'Coven',
];

function strip(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** A stage name + social handle for an artist or influencer. */
export function genStageName(rng: Rng): { name: string; handle: string } {
  const usePrefix = rng.chance(0.55);
  const prefix = usePrefix ? rng.pick(STAGE_PREFIX) + ' ' : '';
  const core = rng.pick(STAGE_CORE);
  const suffix = rng.pick(STAGE_SUFFIX);
  const name = `${prefix}${core}${suffix ? ' ' + suffix : ''}`.trim();
  const handle = strip(name) + (rng.chance(0.4) ? String(rng.int(1, 99)) : '');
  return { name, handle };
}

function genRealName(rng: Rng): { name: string; handle: string } {
  const first = rng.pick(REAL_FIRST);
  const last = rng.pick(REAL_LAST);
  const name = `${first} ${last}`;
  return { name, handle: `${first.toLowerCase()}.${last.toLowerCase()}` };
}

/** A publication name (the outlet a journalist writes for). */
export function genOutlet(rng: Rng): { name: string; handle: string } {
  const name = rng.pick(OUTLET_NAMES);
  return { name, handle: strip(name) };
}

function genLabelName(rng: Rng): { name: string; handle: string } {
  const name = `${rng.pick(LABEL_FIRST)} ${rng.pick(LABEL_SECOND)}`;
  return { name, handle: strip(name) };
}

function genProducerName(rng: Rng): { name: string; handle: string } {
  const tag = rng.pick(PRODUCER_TAGS);
  const core = rng.pick(STAGE_CORE);
  const name = rng.chance(0.5) ? `${core} the ${tag}` : `${tag} ${core}`;
  return { name, handle: strip(`${core}${tag}`) };
}

/** Fan community name derived from the artist they stan. */
export function genFanCommunityName(
  rng: Rng,
  patronName: string,
): { name: string; handle: string } {
  const base = patronName.split(' ').slice(-1)[0] || patronName;
  const name = `${base} ${rng.pick(FAN_COMMUNITY_SUFFIX)}`;
  return { name, handle: strip(name) };
}

/** Identity appropriate to the role (fan communities are named separately). */
export function genIdentity(
  rng: Rng,
  role: NpcRole,
): { name: string; handle: string } {
  switch (role) {
    case 'artist':
      return genStageName(rng);
    case 'influencer':
      return rng.chance(0.5) ? genStageName(rng) : genRealName(rng);
    case 'journalist':
      return genRealName(rng);
    case 'label':
      return genLabelName(rng);
    case 'producer':
      return genProducerName(rng);
    case 'fan-community':
      return genStageName(rng); // overridden once a patron is assigned
    default:
      return genRealName(rng);
  }
}

export const WORLD_OUTLETS = OUTLET_NAMES;
