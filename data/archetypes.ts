import type { PlayerArchetype } from '../types/player';
import type { PlayerStats } from '../types/player';
import { BASE_STATS } from '../constants/gameConfig';

export interface ArchetypeDefinition {
  id: PlayerArchetype;
  label: string;
  description: string;
  flavor: string;        // short one-liner shown on selection
  statBonuses: Partial<PlayerStats>;
  startingMoney: number;
  startingFans: number;
  startingTags: string[];
}

export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'street-hustler',
    label: 'Street Hustler',
    description:
      'You grew up with nothing and turned pain into bars. The streets shaped you. Your story is real — and people feel it.',
    flavor: 'Raw talent. Real life. No filter.',
    statBonuses: {
      talent: 10,
      writing: 5,
      charisma: 10,
      authenticity: 15,
      discipline: -5,
    },
    startingMoney: 500,
    startingFans: 50,
    startingTags: ['street-cred'],
  },
  {
    id: 'church-singer',
    label: 'Church Singer',
    description:
      'You sang in front of congregations before you sang in front of crowds. Your voice is a gift — but the secular world is a different game.',
    flavor: 'God-given talent. The world hasn\'t heard you yet.',
    statBonuses: {
      vocalSkill: 20,
      writing: 10,
      discipline: 15,
      authenticity: 10,
      charisma: -10,
    },
    startingMoney: 200,
    startingFans: 30,
    startingTags: ['gospel-roots'],
  },
  {
    id: 'rich-kid',
    label: 'Rich Kid',
    description:
      'You have money, connections, and a team — but nobody takes you seriously yet. Can you prove the talent is real?',
    flavor: 'All the resources. None of the respect. Yet.',
    statBonuses: {
      charisma: 15,
      creativity: 10,
      authenticity: -15,
    },
    startingMoney: 5000,
    startingFans: 500,
    startingTags: ['privileged-start', 'industry-connections'],
  },
  {
    id: 'underground-rapper',
    label: 'Underground Rapper',
    description:
      'You\'ve been rapping for years. The underground respects you. Now it\'s time to decide: stay true or go mainstream?',
    flavor: 'Real since day one. The crossover question is coming.',
    statBonuses: {
      writing: 15,
      creativity: 10,
      authenticity: 15,
      fanLoyalty: 10,
      industryRespect: -5,
    },
    startingMoney: 300,
    startingFans: 300,
    startingTags: ['underground-rep', 'lyricist'],
  },
  {
    id: 'internet-troll',
    label: 'Internet Troll',
    description:
      'You built a following being chaotic online. The music is secondary — for now. But can you make them take the art seriously?',
    flavor: 'They followed you for the drama. Stay for the music.',
    statBonuses: {
      charisma: 20,
      creativity: 10,
      authenticity: -15,
      fanLoyalty: -10,
    },
    startingMoney: 800,
    startingFans: 2000,
    startingTags: ['viral-personality', 'controversy-magnet'],
  },
  {
    id: 'indie-dreamer',
    label: 'Indie Dreamer',
    description:
      'You\'ve been making music in your bedroom for years. The art comes first. The industry can wait — but will it wait for you?',
    flavor: 'Pure artist. The world moves slow for you.',
    statBonuses: {
      creativity: 15,
      writing: 10,
      discipline: 10,
      industryRespect: -10,
      charisma: -5,
    },
    startingMoney: 400,
    startingFans: 100,
    startingTags: ['bedroom-producer', 'art-first'],
  },
];

export function getArchetype(id: PlayerArchetype): ArchetypeDefinition {
  return ARCHETYPES.find((a) => a.id === id) ?? ARCHETYPES[0];
}

export function buildStartingStats(archetype: ArchetypeDefinition): PlayerStats {
  const stats: PlayerStats = { ...BASE_STATS };
  for (const [key, val] of Object.entries(archetype.statBonuses)) {
    const k = key as keyof PlayerStats;
    if (k === 'fans') {
      stats.fans = archetype.startingFans;
    } else {
      (stats[k] as number) = Math.max(0, Math.min(100, (stats[k] as number) + (val as number)));
    }
  }
  stats.fans = archetype.startingFans;
  return stats;
}
