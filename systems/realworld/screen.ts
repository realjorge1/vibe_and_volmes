import type { RealCategory } from '../../types/realworld';

/**
 * WHAT THE GAME'S INTERNET MAY TALK ABOUT FROM THE REAL WORLD (pure).
 *
 * Default deny. A real story only comes in when it clearly belongs to one of
 * the light categories (sports, tech, games, science, space, wellness,
 * luxury, cars) AND none of its text touches anything off limits:
 *
 * - politics, governments, elections, wars, the military, borders
 * - religion
 * - crime, courts, police, lawsuits, accusations, scandals, feuds
 * - deaths, tragedies, disasters, accidents
 * - diseases, outbreaks, vaccines, drugs
 * - sex, nudity, relationships and gossip about real people
 * - gambling and betting, crypto
 * - pile-on words (slams, rips, blasts, embarrassing, backlash...)
 *
 * Every headline in a story's cluster is screened, not just the lead, so a
 * story that turns ugly in its second headline is dropped too.
 */

/** Normalised for matching: lower case, plain apostrophes, no accents. */
export function norm(text: string): string {
  let t = text.toLowerCase().replace(/[’‘`]/g, "'");
  try {
    t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch {
    /* engines without normalize keep the accents */
  }
  return ` ${t.replace(/[^a-z0-9'+&.# -]+/g, ' ').replace(/\s+/g, ' ')} `;
}

/** Whole words or phrases. */
const BLOCK_WORDS: Record<string, readonly string[]> = {
  politics: [
    'trump', 'biden', 'harris', 'obama', 'putin', 'zelensky', 'zelenskyy', 'netanyahu', 'xi jinping', 'modi', 'tinubu', 'starmer', 'macron', 'erdogan', 'rfk', 'kennedy',
    'president', 'presidential', 'presidency', 'prime minister', 'minister', 'ministry', 'governor', 'senator', 'senate', 'congress', 'congressman', 'congresswoman',
    'parliament', 'lawmaker', 'lawmakers', 'legislation', 'legislature', 'election', 'elections', 'electoral', 'vote', 'votes', 'voting', 'voter', 'voters', 'ballot',
    'campaign', 're-election', 'reelection', 'democrat', 'democrats', 'democratic', 'republican', 'republicans', 'gop', 'maga', 'labour', 'tory', 'tories', 'conservative',
    'liberal', 'liberals', 'progressive', 'left-wing', 'right-wing', 'government', "gov't", 'white house', 'kremlin', 'downing street', 'state house', 'doj', 'fbi', 'cia',
    'immigration', 'immigrant', 'immigrants', 'migrant', 'migrants', 'deport', 'deportation', 'border', 'tariff', 'tariffs', 'sanction', 'sanctions', 'policy', 'policies',
    'executive order', 'midterm', 'midterms', 'impeach', 'impeachment', 'administration', 'regime', 'coup', 'protest', 'protests', 'protesters', 'riot', 'riots', 'rally',
    'activist', 'activists', 'union', 'unions', 'unionize', 'strike', 'strikes', 'diplomat', 'embassy', 'nato', 'united nations', 'eu commission', 'brexit', 'politics',
    'political', 'politician', 'politicians', 'pentagon', 'secretary of state', 'health secretary', 'mayor', 'politico',
  ],
  conflict: [
    'war', 'wars', 'warfare', 'military', 'army', 'troops', 'soldier', 'soldiers', 'missile', 'missiles', 'bomb', 'bombs', 'bombing', 'airstrike', 'airstrikes', 'drone strike',
    'attack', 'attacks', 'attacked', 'terror', 'terrorist', 'terrorism', 'hostage', 'hostages', 'ceasefire', 'invasion', 'invade', 'nuclear weapon', 'weapons', 'gaza',
    'israel', 'israeli', 'palestine', 'palestinian', 'hamas', 'hezbollah', 'houthi', 'houthis', 'ukraine', 'ukrainian', 'russia', 'russian', 'iran', 'iranian', 'china',
    'chinese government', 'taiwan', 'north korea', 'syria', 'sudan', 'yemen', 'afghanistan', 'militia', 'insurgent', 'bandits', 'kidnap', 'kidnapped', 'kidnapping', 'refugee', 'refugees',
  ],
  religion: [
    'religion', 'religious', 'church', 'churches', 'mosque', 'mosques', 'temple', 'synagogue', 'pope', 'vatican', 'bishop', 'pastor', 'priest', 'imam', 'rabbi', 'islam',
    'islamic', 'muslim', 'muslims', 'christian', 'christians', 'christianity', 'catholic', 'jewish', 'jews', 'hindu', 'hindus', 'sikh', 'buddhist', 'god', 'jesus', 'allah',
    'bible', 'quran', 'koran', 'prayer', 'prayers', 'pray', 'sermon', 'worship', 'blasphemy', 'faith leader', 'evangelical', 'atheist',
  ],
  crime: [
    'police', 'cops', 'arrest', 'arrested', 'arrests', 'charged', 'charges', 'indicted', 'indictment', 'court', 'courts', 'judge', 'jury', 'trial', 'verdict', 'sentenced',
    'sentence', 'prison', 'jail', 'jailed', 'prosecutor', 'prosecutors', 'attorney', 'lawyer', 'lawyers', 'lawsuit', 'lawsuits', 'sued', 'sues', 'suing', 'settlement',
    'investigation', 'investigators', 'crime', 'crimes', 'criminal', 'murder', 'murdered', 'homicide', 'shooting', 'shootings', 'gunman', 'gun', 'guns', 'firearm',
    'stabbing', 'stabbed', 'assault', 'assaulted', 'robbery', 'theft', 'stolen', 'fraud', 'scam', 'scammed', 'bribery', 'corruption', 'abuse', 'abused', 'domestic violence',
    'violence', 'violent', 'harassment', 'misconduct', 'allegation', 'allegations', 'alleged', 'allegedly', 'accused', 'accuses', 'accusation', 'bail', 'custody', 'warrant',
    'smuggling', 'trafficking', 'hack', 'hacked', 'hacker', 'hackers', 'breach', 'malware', 'ransomware', 'spyware', 'proxy malware', 'cyberattack', 'banned', 'ban',
    'suspended', 'suspension', 'fined', 'doping', 'cheating', 'cheated', 'burglar', 'burglars', 'burglary',
  ],
  tragedy: [
    'dies', 'died', 'dead', 'death', 'deaths', 'deadly', 'die', 'dying', 'obituary', 'funeral', 'passed away', 'passes away', 'mourn', 'mourns', 'mourning', 'tribute',
    'tributes', 'rip', 'r.i.p', 'killed', 'kills', 'kill', 'killing', 'fatal', 'fatally', 'tragic', 'tragedy', 'victim', 'victims', 'casualties', 'injured', 'wounded',
    'crash', 'crashes', 'crashed', 'accident', 'accidents', 'collapse', 'collapsed', 'disaster', 'disasters', 'hurricane', 'earthquake', 'tsunami', 'wildfire', 'wildfires',
    'flood', 'floods', 'flooding', 'tornado', 'cyclone', 'typhoon', 'landslide', 'evacuate', 'evacuation', 'evacuated', 'emergency', 'missing person', 'drowned', 'drowning',
    'explosion', 'blast', 'fire kills', 'suicide', 'self-harm', 'overdose', 'famine', 'hunger crisis', 'crisis',
  ],
  medical: [
    'vaccine', 'vaccines', 'vaccination', 'vaccinated', 'vax', 'anti-vax', 'measles', 'outbreak', 'outbreaks', 'pandemic', 'epidemic', 'covid', 'coronavirus', 'virus',
    'viruses', 'flu', 'influenza', 'bird flu', 'mpox', 'ebola', 'cholera', 'cancer', 'cancers', 'tumor', 'tumors', 'tumour', 'leukemia', 'hiv', 'aids', 'std', 'stds', 'sti',
    'stis', 'sexually transmitted', 'infection', 'infections', 'infected', 'disease', 'diseases', 'diagnosis', 'diagnosed', 'terminal', 'hospitalized', 'hospitalised', 'icu',
    'abortion', 'abortions', 'contraception', 'euthanasia', 'parasite', 'bacteria', 'legionnaires', 'west nile', 'side effects', 'recall', 'recalled', 'autism', 'dementia',
    'alzheimer', "alzheimer's", 'stroke', 'heart attack', 'seizure', 'disorder', 'eating disorder', 'anorexia', 'obesity', 'diabetes', 'surgery', 'drug', 'drugs', 'opioid',
    'opioids', 'fentanyl', 'cocaine', 'heroin', 'meth', 'cannabis', 'marijuana', 'weed', 'vaping', 'vape', 'nicotine', 'tobacco', 'smoking', 'alcoholism', 'addiction',
    'raw milk', 'glp-1', 'ozempic', 'wegovy', 'weight-loss drug', 'gender-affirming', 'puberty blockers',
  ],
  identity: ['gender', 'transgender', 'trans', 'lgbt', 'lgbtq', 'lgbtq+', 'queer', 'gay', 'lesbian', 'racial', 'racism', 'racist', 'slur', 'slurs', 'discrimination', 'dei', 'woke'],
  adult: [
    'sex', 'sexual', 'sexually', 'sexy', 'nude', 'nudes', 'nudity', 'naked', 'porn', 'pornography', 'onlyfans', 'explicit', 'strip club', 'escort', 'affair', 'cheating scandal',
    'divorce', 'divorced', 'divorcing', 'breakup', 'break up', 'split from', 'splits from', 'dating rumors', 'girlfriend', 'boyfriend', 'ex-wife', 'ex-husband', 'wife', 'husband',
    'pregnant', 'pregnancy', 'baby bump', 'engaged', 'engagement', 'wedding', 'romance', 'romantic', 'kiss', 'kissing', 'bikini', 'lingerie', 'swimsuit',
  ],
  gambling: ['bet', 'bets', 'betting', 'bettor', 'bettors', 'odds', 'picks', 'parlay', 'parlays', 'sportsbook', 'gambling', 'gamble', 'casino', 'lottery', 'jackpot', 'wager', 'prop bets', 'fantasy football', 'draftkings', 'fanduel', 'crypto', 'bitcoin', 'ethereum', 'memecoin', 'nft', 'nfts'],
  pileon: [
    'slams', 'slammed', 'blasts', 'blasted', 'rips', 'ripped into', 'lashes out', 'lie', 'lies', 'liar', 'lying', 'feud', 'feuds', 'beef', 'diss', 'mocks', 'mocked', 'trolls',
    'trolled', 'backlash', 'outrage', 'outraged', 'furious', 'fury', 'angry', 'anger', 'rant', 'meltdown', 'humiliating', 'humiliated', 'humiliation', 'embarrassing',
    'embarrassed', 'embarrassment', 'disgrace', 'disgraceful', 'shameful', 'shame', 'worst', 'blunder', 'flop', 'flopped', 'controversy', 'controversial', 'scandal',
    'scandals', 'apology', 'apologizes', 'apologises', 'apologized', 'fired', 'sacked', 'axed', 'quits', 'resigns', 'resigned', 'resignation', 'toxic', 'threat', 'threats',
    'threatens', 'warning', 'warns', 'boycott', 'cancelled', 'canceled', 'insanity', 'brainless', 'hate', 'hates', 'hated', 'hatred', 'criticism', 'criticized',
    'criticised', 'blames', 'blamed', 'autopsy', 'soulless', 'screwed', 'screwed-up', 'under-fire', 'under fire', 'hot seat', 'sack', 'sacking', 'sackico',
    'thin ice', 'thinner ice', 'layoffs', 'laid off', 'job cuts', 'bankrupt', 'bankruptcy', 'lawsuit', 'unfair', 'rigged',
  ],
};

/** Starts of words: anything beginning with these is out ("terroris", "assassin"). */
const BLOCK_STEMS: readonly string[] = ['assassin', 'genocid', 'massacr', 'extremis', 'jihad', 'nazi', 'fascis', 'supremac', 'pedophil', 'paedophil', 'molest', 'suicid', 'murd', 'embarrass', 'humiliat', 'disgrac', 'hijack'];

/** Names that contain a blocked word but aren't about it (games, places, brands). */
const EXCEPTIONS: readonly string[] = [
  'star wars', 'gears of war', 'god of war', 'death stranding', 'dead space', 'red dead', 'dying light', 'dead by daylight', 'dead island', 'kennedy space center',
  'world of warcraft', 'warzone', 'mortal kombat', 'rip curl', 'death valley', 'dead sea',
];

const WORD_RE = (() => {
  const all = Object.values(BLOCK_WORDS).flat();
  const esc = all.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length);
  return new RegExp(`[ ](?:${esc.join('|')})(?=[ '.,:;!?])`);
})();

const STEM_RE = new RegExp(`[ ](?:${BLOCK_STEMS.join('|')})`);

/** Why a text is off limits, or null when it's fine. */
export function blocked(text: string): string | null {
  let t = norm(text);
  for (const e of EXCEPTIONS) t = t.split(` ${e}`).join(' ');
  const word = t.match(WORD_RE);
  if (word) {
    const w = word[0].trim();
    for (const [why, list] of Object.entries(BLOCK_WORDS)) if (list.includes(w)) return `${why}: ${w}`;
    return `blocked: ${w}`;
  }
  const stem = t.match(STEM_RE);
  return stem ? `blocked: ${stem[0].trim()}` : null;
}

// --- Categories ------------------------------------------------------------------------

/** Words that put a story in a category (weight 2 = a sure sign). */
const CATEGORY_WORDS: Record<RealCategory, readonly (readonly [string, number])[]> = {
  sports: [
    ['premier league', 2], ['champions league', 2], ['europa league', 2], ['la liga', 2], ['serie a', 2], ['bundesliga', 2], ['ligue 1', 2], ['mls', 2], ['nba', 2], ['wnba', 2],
    ['nfl', 2], ['mlb', 2], ['nhl', 2], ['ufc', 2], ['f1', 2], ['formula 1', 2], ['formula one', 2], ['grand prix', 2], ['world series', 2], ['super bowl', 2], ['stanley cup', 2],
    ['ballon d\'or', 2], ['world cup', 2], ['afcon', 2], ['super eagles', 2], ['black stars', 2], ['wimbledon', 2], ['us open', 2], ['french open', 2], ['australian open', 2],
    ['ryder cup', 2], ['tour de france', 2], ['olympics', 2], ['olympic', 2], ['fifa', 2], ['uefa', 2], ['nlcs', 2], ['alcs', 2], ['nlds', 2], ['alds', 2], ['playoffs', 2],
    ['playoff', 2], ['quarterback', 2], ['touchdown', 2], ['mvp', 2], ['all-star', 2], ['transfer window', 2], ['hat-trick', 2], ['hat trick', 2], ['grand slam', 2],
    ['vs', 1], ['vs.', 1], ['v', 1], ['match', 1], ['matchday', 2], ['game', 1], ['games', 1], ['season', 1], ['league', 1], ['cup', 1], ['final', 1], ['finals', 1],
    ['semifinal', 2], ['quarterfinal', 2], ['score', 1], ['scores', 1], ['goal', 1], ['goals', 1], ['striker', 2], ['midfielder', 2], ['defender', 1], ['goalkeeper', 2],
    ['coach', 1], ['manager', 1], ['qb', 2], ['rookie', 1], ['roster', 1], ['lineup', 1], ['lineups', 1], ['fixture', 2], ['fixtures', 2], ['derby', 2], ['tennis', 2], ['golf', 2],
    ['cricket', 2], ['rugby', 2], ['boxing', 2], ['marathon', 2], ['athletics', 2], ['basketball', 2], ['football', 2], ['soccer', 2], ['baseball', 2], ['hockey', 2],
    ['win', 1], ['wins', 1], ['beat', 1], ['beats', 1], ['defeat', 1], ['defeats', 1], ['victory', 1], ['champions', 1], ['championship', 2], ['title', 1], ['standings', 2],
    ['fc', 2], ['week 5', 1], ['week 6', 1], ['week 7', 1], ['injury', 1], ['practice', 1], ['debut', 1], ['highlights', 1], ['preview', 1], ['kickoff', 2], ['kick-off', 2],
  ],
  tech: [
    ['apple', 1], ['iphone', 2], ['ipad', 2], ['macbook', 2], ['mac', 1], ['apple watch', 2], ['airpods', 2], ['vision pro', 2], ['ios', 2], ['macos', 2], ['android', 2], ['pixel', 2],
    ['samsung', 2], ['galaxy s', 2], ['galaxy z', 2], ['google', 1], ['gboard', 2], ['chrome', 1], ['microsoft', 1], ['windows', 1], ['openai', 2], ['chatgpt', 2], ['ai', 1],
    ['a.i.', 1], ['gemini', 1], ['copilot', 2], ['nvidia', 2], ['intel', 2], ['amd', 2], ['chip', 1], ['chips', 1], ['cpu', 2], ['gpu', 2], ['laptop', 2], ['laptops', 2],
    ['smartphone', 2], ['phone', 1], ['phones', 1], ['app', 1], ['apps', 1], ['update', 1], ['beta', 1], ['software', 2], ['gadget', 2], ['gadgets', 2], ['smartwatch', 2],
    ['wearable', 2], ['earbuds', 2], ['headphones', 2], ['soundbar', 2], ['tablet', 2], ['tablets', 2], ['pc', 1], ['pcs', 1], ['robot', 2], ['robots', 2], ['robotics', 2],
    ['vr', 2], ['ar glasses', 2], ['smart glasses', 2], ['fitbit', 2], ['tech', 2], ['technology', 2], ['launch event', 2], ['unveils', 1], ['announces', 1], ['foldable', 2],
    ['camera', 1], ['battery', 1], ['5g', 2], ['wi-fi', 2], ['starlink', 2], ['meta', 1], ['quest', 1], ['alexa', 2],
  ],
  gaming: [
    ['playstation', 2], ['ps5', 2], ['ps6', 2], ['xbox', 2], ['nintendo', 2], ['switch 2', 2], ['steam', 1], ['steam deck', 2], ['gta', 2], ['gta 6', 2], ['zelda', 2],
    ['pokemon', 2], ['call of duty', 2], ['fortnite', 2], ['minecraft', 2], ['roblox', 2], ['forza', 2], ['halo', 2], ['mario', 2], ['elden ring', 2], ['esports', 2],
    ['video game', 2], ['video games', 2], ['gaming', 2], ['gamer', 2], ['gamers', 2], ['console', 2], ['consoles', 2], ['dlc', 2], ['trailer', 1], ['gameplay', 2],
    ['preorder', 1], ['pre-order', 1], ['remaster', 2], ['remake', 1], ['warhammer', 2], ['the game awards', 2], ['gamescom', 2], ['summer game fest', 2],
  ],
  science: [
    ['scientists', 2], ['scientist', 2], ['researchers', 2], ['research', 1], ['study', 1], ['studies', 1], ['discovery', 2], ['discovered', 1], ['discover', 1],
    ['fossil', 2], ['fossils', 2], ['dinosaur', 2], ['dinosaurs', 2], ['t. rex', 2], ['t rex', 2], ['species', 2], ['ancient', 1], ['archaeologists', 2],
    ['archaeology', 2], ['neanderthal', 2], ['neanderthals', 2], ['physics', 2], ['quantum', 2], ['chemistry', 2], ['biology', 2], ['dna', 2], ['genome', 2], ['evolution', 2],
    ['evolved', 1], ['nobel', 2], ['nobel prize', 2], ['experiment', 1], ['lab', 1], ['particle', 2], ['isopod', 2], ['deep sea', 2], ['marine', 1], ['ocean', 1], ['bird', 1],
    ['birds', 1], ['animals', 1], ['nature', 1], ['nuclear clock', 2], ['superconducting', 2], ['microbes', 2], ['science', 2], ['scientific', 2],
  ],
  space: [
    ['nasa', 2], ['esa', 2], ['spacex', 2], ['starship', 2], ['rocket', 2], ['rockets', 2], ['astronaut', 2], ['astronauts', 2], ['moon', 2], ['lunar', 2], ['mars', 2],
    ['martian', 2], ['jupiter', 2], ['saturn', 2], ['venus', 2], ['mercury', 1], ['telescope', 2], ['webb', 2], ['hubble', 2], ['galaxy', 1], ['galaxies', 2], ['nebula', 2],
    ['comet', 2], ['asteroid', 2], ['meteor', 2], ['meteor shower', 2], ['meteors', 2], ['eclipse', 2], ['aurora', 2], ['northern lights', 2], ['solar flare', 2],
    ['cme', 2], ['cmes', 2], ['orbit', 2], ['iss', 2], ['space station', 2], ['artemis', 2], ['black hole', 2], ['black holes', 2], ['exoplanet', 2], ['supernova', 2],
    ['space', 2], ['universe', 2], ['cosmic', 2], ['apod', 2], ['rover', 2], ['curiosity rover', 2], ['satellite', 1], ['sentinel', 1], ['draconid', 2], ['perseid', 2],
    ['geminid', 2], ['orionid', 2], ['leonid', 2], ['lyrid', 2], ['radio burst', 2], ['splashdown', 2], ['launch', 1],
  ],
  health: [
    ['fitness', 2], ['exercise', 2], ['workout', 2], ['workouts', 2], ['walking', 2], ['walk', 1], ['steps', 1], ['running', 1], ['sleep', 2], ['nutrition', 2], ['diet', 1],
    ['protein', 2], ['hydration', 2], ['wellness', 2], ['healthy', 2], ['healthier', 2], ['longevity', 2], ['habit', 2], ['habits', 2], ['yoga', 2], ['meditation', 2],
    ['weight lifting', 2], ['strength training', 2], ['heart health', 2], ['your heart', 2], ['gut health', 2], ['mental health', 1], ['stress', 1], ['gene therapy', 2],
    ['restore sight', 2], ['breakthrough', 1], ['memory', 1], ['brain', 1], ['vitamin', 2], ['fiber', 2], ['mediterranean', 2], ['stretching', 2],
  ],
  luxury: [
    ['rolex', 2], ['patek philippe', 2], ['audemars piguet', 2], ['richard mille', 2], ['cartier', 2], ['hermes', 2], ['birkin', 2], ['louis vuitton', 2], ['gucci', 2],
    ['prada', 2], ['chanel', 2], ['dior', 2], ['balenciaga', 2], ['versace', 2], ['fendi', 2], ['tiffany', 2], ['bulgari', 2], ['bvlgari', 2], ['omega', 1], ['tag heuer', 2],
    ['luxury', 2], ['haute couture', 2], ['couture', 2], ['fashion week', 2], ['runway', 2], ['met gala', 2], ['designer', 1], ['collection', 1], ['watchmaker', 2],
    ['superyacht', 2], ['yacht', 2], ['private jet', 2], ['penthouse', 2], ['mansion', 1], ['air jordan', 2], ['jordan', 1], ['yeezy', 2], ['sneaker', 2], ['sneakers', 2],
    ['nike', 1], ['adidas', 1], ['new balance', 1], ['collab', 1], ['limited edition', 2], ['handbag', 2], ['handbags', 2], ['jewelry', 2], ['jewellery', 2], ['diamond', 1],
  ],
  auto: [
    ['ferrari', 2], ['lamborghini', 2], ['porsche', 2], ['bugatti', 2], ['mclaren', 2], ['rolls-royce', 2], ['bentley', 2], ['aston martin', 2], ['maybach', 2],
    ['mercedes', 1], ['mercedes-benz', 2], ['bmw', 2], ['audi', 2], ['tesla', 2], ['cybertruck', 2], ['toyota', 2], ['honda', 1], ['ford', 1], ['mustang', 2], ['corvette', 2],
    ['supercar', 2], ['hypercar', 2], ['sports car', 2], ['electric vehicle', 2], ['ev', 1], ['evs', 1], ['concept car', 2], ['auto show', 2], ['horsepower', 2], ['sedan', 2],
    ['suv', 2], ['coupe', 2], ['convertible', 2], ['car', 1], ['cars', 1],
  ],
};

const CATEGORY_RES: Record<RealCategory, readonly (readonly [RegExp, number])[]> = Object.fromEntries(
  Object.entries(CATEGORY_WORDS).map(([cat, words]) => [
    cat,
    words.map(([w, weight]) => [new RegExp(`[ ]${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[ '.,:;!?])`), weight] as const),
  ])
) as unknown as Record<RealCategory, readonly (readonly [RegExp, number])[]>;

/** A story must say at least one of these to count as wellness (and nothing medical-alarming). */
const WELLNESS = ['fitness', 'exercise', 'workout', 'walking', 'sleep', 'nutrition', 'protein', 'hydration', 'wellness', 'healthy', 'longevity', 'habit', 'yoga', 'meditation', 'weight lifting', 'strength training', 'heart health', 'your heart', 'gene therapy', 'restore sight', 'gut health', 'steps'];

/**
 * Which light category the story is in, or null. `hint` is the section the
 * feed filed it under (Google News SPORTS, SCIENCE...).
 */
export function categorize(texts: readonly string[], hint: RealCategory | null = null): RealCategory | null {
  const t = norm(texts.join(' . '));
  const score = new Map<RealCategory, number>();
  for (const [cat, res] of Object.entries(CATEGORY_RES) as [RealCategory, readonly (readonly [RegExp, number])[]][]) {
    let s = 0;
    for (const [re, w] of res) if (re.test(t)) s += w;
    if (s > 0) score.set(cat, s);
  }
  // The section a feed filed it under counts most (a Sega game in the tech section isn't sports).
  if (hint) score.set(hint, (score.get(hint) ?? 0) + 2.5);
  // Space is a kind of science, gaming a kind of tech: the more specific one wins a tie.
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1] || order(b[0]) - order(a[0]));
  const best = ranked[0];
  if (!best || best[1] < 2.5) return null;
  if (best[0] === 'health' && !WELLNESS.some((w) => t.includes(` ${w}`))) return null;
  return best[0];
}

function order(c: RealCategory): number {
  return c === 'space' || c === 'gaming' || c === 'luxury' ? 1 : 0;
}

/**
 * Publications whose angle is a side (religious or political advocacy): their
 * "science" or "sports" pieces stay out too.
 */
const SOURCE_BLOCK: readonly string[] = [
  'answers in genesis', 'christian', 'catholic', 'gospel', 'church', 'bible', 'islam', 'muslim', 'jewish', 'breitbart', 'the federalist', 'daily wire', 'the blaze',
  'newsmax', 'oann', 'one america news', 'gateway pundit', 'mother jones', 'jacobin', 'daily kos', 'the nation', 'politico', 'the hill', 'washington examiner', 'daily caller',
];

export function sourceBlocked(source: string | undefined): boolean {
  const s = norm(source ?? '');
  return SOURCE_BLOCK.some((b) => s.includes(` ${b}`));
}

/** A story is fine when every text in it is (the lead and its whole cluster) and nobody in it writes from a side. */
export function storyBlocked(texts: readonly string[], sources: readonly (string | undefined)[] = []): string | null {
  for (const src of sources) if (sourceBlocked(src)) return `source: ${src}`;
  for (const t of texts) {
    const why = blocked(t);
    if (why) return why;
  }
  return null;
}
