/** Original name pools for generated sims, townies, and NPCs. */

export const FIRST_NAMES = [
  'Marlo', 'Juniper', 'Desmond', 'Petra', 'Callum', 'Odessa', 'Rufus', 'Bianca',
  'Silas', 'Marisol', 'Ezra', 'Tilda', 'Orson', 'Priya', 'Felix', 'Nadia',
  'Hollis', 'Ramona', 'Gideon', 'Suki', 'Alonzo', 'Greta', 'Ivo', 'Zelda',
  'Bram', 'Coco', 'Lionel', 'Maeve', 'Otto', 'Wren',
];

export const LAST_NAMES = [
  'Novak', 'Delgado', 'Fairweather', 'Okafor', 'Bellamy', 'Ostrowski', 'Vance',
  'Kimura', 'Thistlewood', 'Moreau', 'Adeyemi', 'Crane', 'Valdez', 'Holloway',
  'Peralta', 'Winterbourne', 'Sato', 'Marchetti', 'Quill', 'Ashcombe',
];

export const NPC_NAMES: Record<string, string> = {
  maid: 'Brigitte the Maid',
  repairman: 'Gus the Repairman',
  pizza: 'Fredo (Pizza)',
  burglar: 'Sticky-Fingers Sal',
  police: 'Officer Danvers',
  firefighter: 'Firefighter Ruiz',
  reaper: 'The Reaper',
  social_worker: 'Ms. Pinch (Social Services)',
  repo: 'The Repo Man',
};

/** Thought-bubble icon vocabulary (emoji stand in for the glyph atlas). */
export const THOUGHT = {
  hunger: '🍔',
  comfort: '🛋️',
  hygiene: '🫧',
  bladder: '🚽',
  energy: '😴',
  fun: '🎉',
  social: '💬',
  room: '🥀',
  blocked: '🚧',
  angry: '💢',
  love: '❤️',
  brokenHeart: '💔',
  fire: '🔥',
  burglar: '🥷',
  money: '💸',
  work: '💼',
  school: '🎒',
  baby: '🍼',
  death: '💀',
  ghost: '👻',
  party: '🎈',
  filth: '🪰',
  sad: '😞',
  happy: '😊',
} as const;
