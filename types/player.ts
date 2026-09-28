export type MusicGenre =
  | 'hip-hop'
  | 'pop'
  | 'r&b'
  | 'rock'
  | 'electronic'
  | 'country'
  | 'latin'
  | 'gospel';

export type PlayerArchetype =
  | 'street-hustler'
  | 'church-singer'
  | 'rich-kid'
  | 'underground-rapper'
  | 'internet-troll'
  | 'indie-dreamer';

export type Gender = 'male' | 'female' | 'nonbinary';

export interface PlayerStats {
  talent: number;           // 0-100: overall music ability
  writing: number;          // 0-100: lyric quality
  vocalSkill: number;       // 0-100: singing/rapping
  charisma: number;         // 0-100: public appeal
  authenticity: number;     // 0-100: perceived realness
  creativity: number;       // 0-100: uniqueness
  discipline: number;       // 0-100: work ethic
  reputation: number;       // 0-100: public image (50 = neutral)
  fans: number;             // raw fan count
  fanLoyalty: number;       // 0-100: how devoted fans are
  industryRespect: number;  // 0-100: label/artist respect
  mentalHealth: number;     // 0-100: stress resilience
  energy: number;           // 0-100: weekly action capacity
}

export interface Player {
  id: string;
  artistName: string;
  realName: string;
  gender: Gender;
  genre: MusicGenre;
  city: string;
  archetype: PlayerArchetype;
  stats: PlayerStats;
  money: number;
  week: number;
  createdAt: number;
  /**
   * Age at week 1. The current age is always derived from the game week
   * (systems/life/age.ts), never stored, so it can't drift out of sync.
   */
  startAge: number;
  /** 1 for a first career, 2 for a child continuing it, and so on. */
  generation?: number;
}

export interface CreatePlayerData {
  artistName: string;
  realName: string;
  gender: Gender;
  genre: MusicGenre;
  city: string;
  archetype: PlayerArchetype;
  startAge: number;
}
