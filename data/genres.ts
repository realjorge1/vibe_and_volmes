import type { MusicGenre } from '../types/player';

export interface GenreDefinition {
  id: MusicGenre;
  label: string;
  description: string;
  mainstreamScore: number;   // 1-10: how mainstream the genre is
  viralPotential: number;    // 1-10: likelihood of viral moments
  industryWeight: number;    // 1-10: industry doors opened
  statAffinities: string[];  // which stats matter most
  rivalGenres: MusicGenre[]; // genres that compete
}

export const GENRES: GenreDefinition[] = [
  {
    id: 'hip-hop',
    label: 'Hip-Hop',
    description: 'The most talked-about genre on the internet. High drama potential. Culture moves fast.',
    mainstreamScore: 9,
    viralPotential: 10,
    industryWeight: 9,
    statAffinities: ['writing', 'charisma', 'authenticity'],
    rivalGenres: ['pop', 'r&b'],
  },
  {
    id: 'pop',
    label: 'Pop',
    description: 'The biggest commercial ceiling. Chart success is real. But authenticity is always questioned.',
    mainstreamScore: 10,
    viralPotential: 8,
    industryWeight: 10,
    statAffinities: ['charisma', 'creativity', 'vocalSkill'],
    rivalGenres: ['hip-hop', 'electronic'],
  },
  {
    id: 'r&b',
    label: 'R&B',
    description: 'The genre of raw emotion. Fans are deeply loyal. Romantic drama fuels the narrative.',
    mainstreamScore: 7,
    viralPotential: 7,
    industryWeight: 7,
    statAffinities: ['vocalSkill', 'authenticity', 'charisma'],
    rivalGenres: ['hip-hop', 'pop'],
  },
  {
    id: 'rock',
    label: 'Rock',
    description: 'A shrinking mainstream but passionate fanbase. Artistic credibility is everything.',
    mainstreamScore: 5,
    viralPotential: 5,
    industryWeight: 5,
    statAffinities: ['creativity', 'discipline', 'authenticity'],
    rivalGenres: ['electronic', 'country'],
  },
  {
    id: 'electronic',
    label: 'Electronic',
    description: 'Festival money. Streaming numbers. Anonymous artists can blow up overnight.',
    mainstreamScore: 6,
    viralPotential: 9,
    industryWeight: 6,
    statAffinities: ['creativity', 'talent', 'discipline'],
    rivalGenres: ['pop', 'rock'],
  },
  {
    id: 'country',
    label: 'Country',
    description: 'Extremely loyal fans. Crossover potential is massive but the genre has rules.',
    mainstreamScore: 7,
    viralPotential: 6,
    industryWeight: 7,
    statAffinities: ['authenticity', 'writing', 'vocalSkill'],
    rivalGenres: ['pop', 'rock'],
  },
  {
    id: 'latin',
    label: 'Latin',
    description: 'Global reach and massive streaming numbers. Fastest growing genre on the charts.',
    mainstreamScore: 8,
    viralPotential: 9,
    industryWeight: 8,
    statAffinities: ['charisma', 'creativity', 'talent'],
    rivalGenres: ['pop', 'r&b'],
  },
  {
    id: 'gospel',
    label: 'Gospel',
    description: 'Powerhouse vocals and deep community roots. A devoted fanbase and a proven crossover lane.',
    mainstreamScore: 6,
    viralPotential: 6,
    industryWeight: 6,
    statAffinities: ['vocalSkill', 'authenticity', 'charisma'],
    rivalGenres: ['r&b', 'pop'],
  },
];

export function getGenre(id: MusicGenre): GenreDefinition {
  return GENRES.find((g) => g.id === id) ?? GENRES[0];
}
