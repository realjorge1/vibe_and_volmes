import { pick, randInt } from './random';
import type { MusicGenre } from '../types/player';

const FIRST_NAMES_MALE = [
  'Marcus', 'Devon', 'Jaylen', 'Xavier', 'Malik', 'Andre', 'Darius', 'Elijah',
  'Kwame', 'Isaiah', 'Jordan', 'Kyler', 'Zion', 'Ace', 'Blaze', 'Cruz',
  'Dean', 'Finn', 'Gage', 'Hunter', 'Ivan', 'Jace', 'Kade', 'Lance',
];

const FIRST_NAMES_FEMALE = [
  'Aaliyah', 'Brianna', 'Ciara', 'Diamond', 'Essence', 'Faith', 'Gina',
  'Hailey', 'Imani', 'Jasmine', 'Keisha', 'Luna', 'Maya', 'Nova', 'Olivia',
  'Paris', 'Raven', 'Simone', 'Tia', 'unique', 'Vivian', 'Whitney', 'Zara',
];

const LAST_NAMES = [
  'Banks', 'Carter', 'Davis', 'Evans', 'Ford', 'Grant', 'Harris', 'Iverson',
  'Jackson', 'King', 'Lane', 'Mason', 'Nash', 'Owens', 'Price', 'Quinn',
  'Reed', 'Simmons', 'Taylor', 'Underwood', 'Vance', 'Walker', 'Young', 'Zoom',
];

const HANDLE_PREFIXES = [
  'real', 'its', 'iam', 'da', 'young', 'lil', 'big', 'dj', 'mc', 'the',
  'official', 'thisis', 'teamm', 'just', 'sir', 'miss', 'mister',
];

const HANDLE_SUFFIXES = [
  'xo', 'official', 'real', 'hq', 'music', 'world', 'gram', 'tv', 'daily',
  '2x', '4x', 'fanpage', 'updates', 'nation', 'army',
];

const FAN_ACCOUNT_STYLES = [
  (name: string) => `${name.toLowerCase().replace(/\s/g, '')}fan`,
  (name: string) => `${name.toLowerCase().replace(/\s/g, '')}stan`,
  (name: string) => `stan${name.toLowerCase().replace(/\s/g, '')}`,
  (name: string) => `${name.toLowerCase().replace(/\s/g, '')}updates`,
  (name: string) => `love${name.toLowerCase().replace(/\s/g, '')}`,
  (name: string) => `${name.toLowerCase().replace(/\s/g, '')}daily`,
  (name: string) => `team${name.toLowerCase().replace(/\s/g, '')}`,
];

const GOSSIP_NAMES = [
  'MusicTeaDaily', 'SpillTheSound', 'IndustryInsider', 'BehindTheBeat',
  'HotlineGossip', 'UrbanBlast', 'ChartWatcher', 'SceneReport',
  'MusicBuzz247', 'TheRealTea', 'NoCapNews', 'VibeCheck',
];

const CRITIC_NAMES = [
  'SoundReview', 'PitchCritic', 'AlbumDigest', 'BeatJudge',
  'MusicAnalysis', 'TheHonestEar', 'CriticalMass', 'WaveWatcher',
];

export function generateNpcName(): { username: string; handle: string } {
  const first = pick([...FIRST_NAMES_MALE, ...FIRST_NAMES_FEMALE]);
  const last = pick(LAST_NAMES);
  const num = randInt(1, 999);
  const username = `${first} ${last}`;
  const handle = `${first.toLowerCase()}${last.toLowerCase()}${num}`;
  return { username, handle };
}

export function generateFanHandle(artistName: string): string {
  const style = pick(FAN_ACCOUNT_STYLES);
  const num = randInt(1, 9999);
  return `${style(artistName)}${num}`;
}

export function generateGossipHandle(): string {
  return pick(GOSSIP_NAMES);
}

export function generateCriticHandle(): string {
  return pick(CRITIC_NAMES);
}

const TRACK_WORDS: Record<MusicGenre, { adj: string[]; noun: string[]; phrase: string[] }> = {
  'hip-hop': {
    adj: ['Real', 'Hard', 'Raw', 'Cold', 'Pure', 'Dark', 'Hot', 'Big', 'Heavy', 'Deep'],
    noun: ['Talk', 'Life', 'Wave', 'Way', 'Time', 'Mind', 'Game', 'Code', 'Block', 'Grind'],
    phrase: ['No Cap', 'On God', 'Different', 'Facts', 'Level Up', 'Way Up', 'Run It Back', 'Say Less'],
  },
  'pop': {
    adj: ['Golden', 'Electric', 'Wild', 'Neon', 'Cosmic', 'Crystal', 'Midnight', 'Shining'],
    noun: ['Heart', 'Night', 'Star', 'Dream', 'Summer', 'Light', 'Rain', 'High', 'Spark'],
    phrase: ['Again', 'Forever', 'Right Now', 'Tonight', 'Always', 'Closer', 'Over Again'],
  },
  'r&b': {
    adj: ['Sweet', 'Slow', 'Deep', 'Velvet', 'Smooth', 'Silk', 'Warm', 'Tender', 'Burning'],
    noun: ['Love', 'Soul', 'Vibe', 'Body', 'Touch', 'Night', 'Heart', 'Feel', 'Burn', 'Desire'],
    phrase: ['With You', 'All Night', 'For Real', 'Like That', 'Right Here', 'Stay With Me'],
  },
  'rock': {
    adj: ['Broken', 'Hollow', 'Burning', 'Heavy', 'Lost', 'Shattered', 'Dark', 'Empty', 'Loud'],
    noun: ['Road', 'Sky', 'Stone', 'Wall', 'Storm', 'Fire', 'Chain', 'Signal', 'Edge', 'Ruins'],
    phrase: ['Never Again', 'Breaking Free', 'Falling Down', 'Fight Back', 'Stand Tall'],
  },
  'electronic': {
    adj: ['Neon', 'Digital', 'Electric', 'Pulse', 'Synthetic', 'Holographic', 'Quantum', 'Hyper'],
    noun: ['Wave', 'Signal', 'Frequency', 'Grid', 'Phase', 'Loop', 'Void', 'Surge', 'Flux'],
    phrase: ['Drop It', 'Fade Out', 'Into the Grid', 'System Override', 'Disconnect'],
  },
  'country': {
    adj: ['Old', 'Dusty', 'Lonesome', 'Wild', 'Free', 'Simple', 'Honest', 'Broken', 'Southern'],
    noun: ['Road', 'Home', 'Heart', 'Town', 'Sky', 'Truck', 'Rain', 'Field', 'River', 'Bridge'],
    phrase: ['Back Home', 'Gone Too Long', 'Raise Hell', 'Drink to That', 'Never Left'],
  },
  'latin': {
    adj: ['Fuego', 'Caliente', 'Rico', 'Loca', 'Suave', 'Salvaje', 'Dulce', 'Bravo'],
    noun: ['Amor', 'Corazon', 'Noche', 'Fuego', 'Ritmo', 'Vida', 'Fiesta', 'Alma'],
    phrase: ['Dale', 'Tu Sabes', 'Sin Ti', 'Para Siempre', 'Todo Por Ti', 'La Vida'],
  },
  'gospel': {
    adj: ['Holy', 'Blessed', 'Glory', 'Rising', 'Higher', 'Sacred', 'Amazing', 'Mighty', 'Golden'],
    noun: ['Grace', 'Faith', 'Praise', 'Light', 'River', 'Mountain', 'Spirit', 'Glory', 'Morning', 'Hallelujah'],
    phrase: ['Lift Me Up', 'Carry Me', 'I Believe', 'Hold On', 'Stronger Now', 'Take Me Higher', 'Through It All'],
  },
};

const TRACK_PATTERNS = [
  (words: typeof TRACK_WORDS['pop']) => `${pick(words.adj)} ${pick(words.noun)}`,
  (words: typeof TRACK_WORDS['pop']) => pick(words.phrase),
  (words: typeof TRACK_WORDS['pop']) => `${pick(words.noun)} ${pick(words.noun)}`,
  (words: typeof TRACK_WORDS['pop']) => `${pick(words.adj)} ${pick(words.phrase)}`,
  (words: typeof TRACK_WORDS['pop']) => pick(words.noun),
  (words: typeof TRACK_WORDS['pop']) => `${pick(words.adj)} ${pick(words.adj)} ${pick(words.noun)}`,
];

export function generateTrackTitle(genre: MusicGenre): string {
  const words = TRACK_WORDS[genre];
  const pattern = pick(TRACK_PATTERNS);
  return pattern(words);
}

export function generateHashtag(artistName: string, context: string): string {
  const name = artistName.replace(/\s/g, '');
  const templates = [
    `#${name}`,
    `#${name}Is${context.replace(/\s/g, '')}`,
    `#${context.replace(/\s/g, '')}`,
    `#${name}Out`,
    `#WeLove${name}`,
    `#${name}Gang`,
    `#${name}Era`,
    `#Cancel${name}`,
    `#${name}Comeback`,
    `#${name}Flopped`,
    `#${name}Snapped`,
  ];
  return pick(templates);
}
