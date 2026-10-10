import type { PhotoTag } from '../../photos/photoPack';
import type { EverydayVibe, NewsSection } from './accounts';

/**
 * THE WORLD'S YEAR.
 *
 * What everyone is talking about each month, so the feed moves with the
 * calendar: New Year's resolutions, the big game, a show's finale, the
 * heatwave, the phone launch, Halloween, the holidays. A game year is
 * WEEKS_PER_YEAR weeks, and week N of the year is month N (the game's own
 * holiday season sits on weeks 10-12).
 *
 * Placeholders: {team} / {team2} (the league's finalists this year), {show},
 * {phone}, {year} (the class year), {city}.
 */

export type League = 'pbl' | 'gfl' | 'cup';

export interface CalendarBeat {
  id: string;
  /** 0 = January. */
  months: readonly number[];
  vibe: EverydayVibe;
  hashtag: string;
  /** How loud it is: trend volume and share of the week's everyday posts. */
  heat: number;
  league?: League;
  chirp: readonly string[];
  gram: readonly string[];
  tok: readonly string[];
  news?: { section: NewsSection; lines: readonly string[] };
  tags?: readonly PhotoTag[];
  comments?: readonly string[];
}

/** Made-up leagues and shows. Each year draws its own finalists and big show. */
export const LEAGUES: Record<League, { name: string; teams: readonly string[] }> = {
  pbl: { name: 'PBL', teams: ['Bay City Sharks', 'Metro Monarchs', 'Lakeside Flyers', 'Capital Crowns', 'Desert Hawks', 'Harbor Titans', 'Northside Wolves', 'Sunset Suns'] },
  gfl: { name: 'GFL', teams: ['Iron Valley Forge', 'Bayview Storm', 'Granite Peaks', 'Southport Comets', 'Highland Owls', 'Riverside Wolves'] },
  cup: { name: 'Continental Cup', teams: ['Nigeria', 'Brazil', 'France', 'Ghana', 'Argentina', 'England', 'Spain', 'Senegal', 'Japan', 'Morocco'] },
};

export const SHOWS = {
  reality: ['Velvet Estates', 'Love Villa', 'The Proposal Hour'],
  drama: ['Kingdom of Ash', 'Night Shift', 'Harbor Lights'],
} as const;

export const CALENDAR_BEATS: readonly CalendarBeat[] = [
  // January
  {
    id: 'new-year', months: [0], vibe: 'motivation', hashtag: '#NewYearNewMe', heat: 3,
    chirp: ['new year same me but hydrated', 'my resolution is to stop making resolutions', 'day 3 of the new year and I already broke 4 promises to myself', 'this is the year. I can feel it.'],
    gram: ['new year, new chapter ✨', 'goals on paper this year', 'year one of the rest of my life'],
    tok: ['my realistic new year’s resolutions', 'POV: the gym on January 2nd', 'building habits that actually stick this year'],
    tags: ['sky', 'city', 'party'],
  },
  {
    id: 'snow-day', months: [0, 11], vibe: 'weather', hashtag: '#SnowDay', heat: 2,
    chirp: ['snow day = blanket, tea, zero responsibilities', 'it snowed one inch and the whole city shut down', 'my car is a snowman now', 'cold enough to see your breath inside the house'],
    gram: ['winter wonderland ❄️', 'first snow of the season', 'cozy mode activated'],
    tok: ['snow day routine', 'my dog seeing snow for the first time'],
    news: { section: 'weather', lines: ['Snowstorm closes schools and roads across the region', 'Up to 20cm of snow expected overnight'] },
    tags: ['sky', 'city', 'home'],
  },
  // February
  {
    id: 'valentines', months: [1], vibe: 'dating', hashtag: '#ValentinesDay', heat: 3,
    chirp: ['happy valentine’s day to my bed, my snacks and my phone', 'single on valentine’s day? no. I’m in a committed relationship with my peace', 'restaurants tonight are a war zone of couples', 'galentine’s > valentine’s, fight me'],
    gram: ['my valentine 💘', 'love is in the air (and the chocolate)', 'dinner date ❤️'],
    tok: ['valentine’s day gift ideas under $20', 'POV: you’re single on valentine’s day and thriving', 'rating valentine’s date ideas'],
    tags: ['love', 'food', 'night'],
    comments: ['so cute 🥺', 'I’m spending it with my cat', 'single gang where you at', '@{friend} be my valentine?'],
  },
  {
    id: 'gridiron-bowl', months: [1], vibe: 'sports', hashtag: '#GridironBowl', heat: 3.5, league: 'gfl',
    chirp: ['{team} vs {team2} and I have not slept', 'the halftime snacks are the real main event', 'if {team} lose I’m blaming the coach publicly', 'GRIDIRON BOWL SUNDAY'],
    gram: ['game day setup 🏈', 'watch party ready', '{team} til I die'],
    tok: ['every fan at a gridiron bowl watch party', 'best gridiron bowl ads this year', 'the play of the game'],
    news: { section: 'sports', lines: ['{team} win the Gridiron Bowl in an instant classic', 'Gridiron Bowl preview: {team} vs {team2}'] },
    tags: ['stadium', 'crowd', 'food'],
  },
  // March
  {
    id: 'silver-screen', months: [2], vibe: 'tv', hashtag: '#SilverScreenAwards', heat: 2.5,
    chirp: ['the silver screen awards red carpet is my super bowl', 'they robbed {show} of best series and I’ll never forget', 'the host was funnier than the movies', 'that acceptance speech made me cry'],
    gram: ['awards night look 🏆', 'red carpet season'],
    tok: ['best looks from the silver screen awards', 'reacting to the winners (some were crimes)'],
    news: { section: 'entertainment', lines: ['{show} sweeps the Silver Screen Awards', 'Silver Screen Awards: the winners, the snubs and the speeches'] },
    tags: ['press', 'night', 'fashion'],
  },
  {
    id: 'spring-reset', months: [2, 3], vibe: 'life', hashtag: '#SpringReset', heat: 1.5,
    chirp: ['spring cleaning found three phone chargers and my will to live', 'it’s finally light outside after 6pm and I feel reborn', 'spring is here and so is my allergies'],
    gram: ['fresh start 🌸', 'sunny days are back', 'new season, new energy'],
    tok: ['spring cleaning motivation', 'my spring room makeover'],
    tags: ['sky', 'home', 'aesthetic'],
  },
  // April
  {
    id: 'april-fools', months: [3], vibe: 'memes', hashtag: '#AprilFools', heat: 2,
    chirp: ['I don’t trust any news today. any of it', 'every brand trying to be funny today is so embarrassing (I laughed)', 'my mom fell for the same prank for the 5th year in a row'],
    gram: ['got ‘em 😂'],
    tok: ['best april fools pranks that went too far', 'pranking my roommate (he did not laugh)'],
    tags: ['phone', 'home'],
  },
  {
    id: 'drama-finale', months: [3], vibe: 'tv', hashtag: '#KingdomOfAshFinale', heat: 3,
    chirp: ['the kingdom of ash finale. I need a minute. or a year', 'they really killed off my favorite character in the last episode', 'the kingdom of ash writers are criminals and I love them'],
    gram: ['finale night snacks 📺', 'still recovering'],
    tok: ['my reaction to the kingdom of ash finale', 'kingdom of ash theories that came true'],
    news: { section: 'entertainment', lines: ['Kingdom of Ash finale breaks streaming records', 'Kingdom of Ash creator responds to fan backlash over ending'] },
    tags: ['screen', 'home', 'night'],
  },
  {
    id: 'spring-rain', months: [3], vibe: 'weather', hashtag: '#RainyDays', heat: 1.5,
    chirp: ['rain all week. my umbrella has given up', 'rainy day playlist and a blanket, I’m not leaving', 'the rain started exactly when I left the house, as always'],
    gram: ['rainy windows and slow mornings', 'puddles everywhere 🌧️'],
    tok: ['cozy rainy day routine'],
    news: { section: 'weather', lines: ['Heavy rain expected through the weekend; flood warnings in place'] },
    tags: ['rain', 'city', 'moody'],
  },
  // May
  {
    id: 'graduation', months: [4], vibe: 'family', hashtag: '#ClassOf{year}', heat: 2.5,
    chirp: ['graduation season is just everyone crying in a gown', 'they said the real world would be hard and they were right', 'my little cousin graduated and I feel 100 years old'],
    gram: ['WE DID IT 🎓', 'class of {year}!!', 'from day one to done'],
    tok: ['graduation day vlog', 'POV: you’re the first in your family to graduate'],
    tags: ['friends', 'sky', 'city'],
    comments: ['congratulations!! 🎓', 'so proud of you', 'the hard work paid off', 'class of {year} 🔥'],
  },
  {
    id: 'mothers-day', months: [4], vibe: 'family', hashtag: '#MothersDay', heat: 2.5,
    chirp: ['happy mother’s day to the woman who still calls me by my full name when I’m in trouble', 'call your mom today. I’m serious.', 'mother’s day brunch reservations are harder to get than concert tickets'],
    gram: ['happy mother’s day to my queen 👑', 'everything I am, I owe to her', 'the original boss ❤️'],
    tok: ['surprising my mom for mother’s day', 'things my mom says that are always right'],
    tags: ['home', 'food', 'love'],
  },
  {
    id: 'summer-body', months: [4, 5], vibe: 'fitness', hashtag: '#SummerBodyLoading', heat: 1.5,
    chirp: ['summer body loading… 3%', 'every body is a summer body, now pass the fries', 'started working out for summer. summer is in 2 weeks'],
    gram: ['getting ready for summer ☀️', 'early mornings pay off'],
    tok: ['summer shred day 1', '10-minute workout for summer'],
    tags: ['fit', 'beach', 'sky'],
  },
  // June
  {
    id: 'pbl-finals', months: [5], vibe: 'sports', hashtag: '#PBLFinals', heat: 3.5, league: 'pbl',
    chirp: ['{team} vs {team2} in the finals, I need a cardiologist', 'game 7. I’m not breathing', '{team} fans really thought they were winning it all', 'whoever wins tonight, the refs lose'],
    gram: ['FINALS NIGHT 🏀', 'courtside energy', 'this is what it’s all about'],
    tok: ['best plays of the PBL finals', 'every fan during game 7', 'the parade was insane'],
    news: { section: 'sports', lines: ['{team} win the PBL Finals in seven games', 'PBL Finals: {team} and {team2} set for a game 7'] },
    tags: ['stadium', 'crowd', 'night'],
  },
  {
    id: 'fathers-day', months: [5], vibe: 'family', hashtag: '#FathersDay', heat: 2,
    chirp: ['happy father’s day to every dad who explains how a car works when you didn’t ask', 'dads with a grill and a playlist from 1998 are national treasures', 'got my dad a tie again. he loves it (he says)'],
    gram: ['happy father’s day to my hero', 'the GOAT 🐐', 'dad jokes since forever'],
    tok: ['things only dads do', 'my dad reacting to his father’s day gift'],
    tags: ['home', 'car', 'food'],
  },
  {
    id: 'summer-mode', months: [5, 6], vibe: 'travel', hashtag: '#SummerMode', heat: 2,
    chirp: ['summer plans: beach, sleep, repeat', 'the ice cream truck song still controls me', 'out of office energy all summer'],
    gram: ['summer mode on ☀️', 'saltwater therapy 🌊', 'sun’s out'],
    tok: ['summer bucket list', 'beach day essentials'],
    tags: ['beach', 'pool', 'sky'],
  },
  // July
  {
    id: 'heatwave', months: [6, 7], vibe: 'weather', hashtag: '#Heatwave', heat: 3,
    chirp: ['it’s so hot my phone is overheating in my hand', 'the sun is personally attacking me', 'whoever invented AC deserves a statue', 'opened the door and got hit by a wall of heat'],
    gram: ['stay cool out there 🥵', 'pool day, every day', 'surviving the heat'],
    tok: ['heatwave hacks that actually work', 'POV: it’s 40°C and your AC breaks'],
    news: { section: 'weather', lines: ['Heat advisory issued as temperatures climb past 38°C', 'Heatwave: officials open cooling centers across {city}'] },
    tags: ['sky', 'pool', 'beach'],
  },
  {
    id: 'love-villa', months: [6, 7], vibe: 'tv', hashtag: '#LoveVilla', heat: 3,
    chirp: ['love villa recoupling tonight and I am SEATED', 'the love villa villain is the best part of the show', 'whoever cast this season of love villa deserves a raise', 'love villa is not a show, it’s a lifestyle'],
    gram: ['love villa night 🌴', 'watch party with the girls'],
    tok: ['love villa recap in 60 seconds', 'every love villa contestant ever', 'the love villa recoupling reaction'],
    news: { section: 'entertainment', lines: ['Love Villa finale draws the show’s biggest audience ever', 'Love Villa couple announce engagement after the show'] },
    tags: ['pool', 'night', 'love'],
  },
  {
    id: 'continental-cup', months: [6, 7], vibe: 'sports', hashtag: '#ContinentalCup', heat: 3.5, league: 'cup',
    chirp: ['{team} vs {team2} and the whole street is outside', '{team} scored and my neighbors screamed loud enough for the moon to hear', 'the continental cup is the only time I care about my country this much', 'penalties. why is it always penalties'],
    gram: ['matchday 🏆', 'flags out!!', 'the whole city is watching'],
    tok: ['the moment {team} scored', 'fans going crazy for the continental cup'],
    news: { section: 'sports', lines: ['{team} reach the Continental Cup final', '{team} knock out {team2} on penalties'] },
    tags: ['stadium', 'crowd', 'street'],
  },
  // August
  {
    id: 'back-to-school', months: [7], vibe: 'family', hashtag: '#BackToSchool', heat: 2,
    chirp: ['back to school ads in july should be illegal', 'parents on the first day of school are the happiest people alive', 'the back to school supply list costs more than my rent'],
    gram: ['first day! 📚', 'new year, new notebooks'],
    tok: ['back to school haul', 'POV: first day of school energy'],
    tags: ['city', 'paper', 'friends'],
  },
  // September
  {
    id: 'phone-launch', months: [8], vibe: 'tech', hashtag: '#{phoneTag}', heat: 3,
    chirp: ['the {phone} is just last year’s phone with a new color and I’m buying it anyway', 'the {phone} camera samples look fake good', '{phone} preorders crashed the website in 4 minutes', 'still using a 4-year-old phone and proud'],
    gram: ['new phone who dis 📱', 'unboxing day', 'upgrade complete'],
    tok: ['{phone} unboxing and first impressions', 'is the {phone} worth it? honest review', '{phone} vs last year: can you tell the difference?'],
    news: { section: 'tech', lines: ['Nimbus unveils the {phone} with a camera that sees in the dark', '{phone} review: the best phone of the year, with one big catch'] },
    tags: ['phone', 'screen', 'aesthetic'],
  },
  {
    id: 'gfl-kickoff', months: [8], vibe: 'sports', hashtag: '#GFLKickoff', heat: 2.5, league: 'gfl',
    chirp: ['football is BACK', 'season opener and {team} already scared me', 'fantasy league draft night is my real holiday'],
    gram: ['season opener 🏈', 'we’re back!'],
    tok: ['predicting every team’s season', 'tailgate essentials'],
    news: { section: 'sports', lines: ['GFL season kicks off with {team} vs {team2}'] },
    tags: ['stadium', 'crowd', 'food'],
  },
  {
    id: 'fashion-week', months: [8], vibe: 'fashion', hashtag: '#FashionWeek', heat: 2,
    chirp: ['fashion week looks are either genius or a cry for help, no in between', 'the front row at fashion week is a who’s who of people I can’t afford to dress like'],
    gram: ['fashion week street style 📸', 'the looks this season'],
    tok: ['best street style from fashion week', 'recreating runway looks on a budget'],
    tags: ['fashion', 'street', 'sneakers'],
  },
  // October
  {
    id: 'halloween', months: [9], vibe: 'memes', hashtag: '#Halloween', heat: 3,
    chirp: ['my halloween costume is “person who forgot to buy a costume”', 'spooky season means horror movies I watch through my fingers', 'adults trick or treating is a valid lifestyle', 'my dog hates his costume and I love him for it'],
    gram: ['spooky szn 🎃', 'costume reveal 👻', 'trick or treat'],
    tok: ['last minute halloween costume ideas', 'my dog in his halloween costume', 'rating halloween candy'],
    tags: ['night', 'party', 'pets'],
  },
  {
    id: 'first-cold', months: [9, 10], vibe: 'weather', hashtag: '#SweaterWeather', heat: 1.5,
    chirp: ['first cold morning and I’m already in three layers', 'sweater weather is the best weather and that’s final', 'the heating is on and my bills are scared'],
    gram: ['sweater weather 🍂', 'cozy season is here'],
    tok: ['fall outfit ideas', 'cozy fall morning routine'],
    tags: ['moody', 'coffee', 'city'],
  },
  {
    id: 'night-shift', months: [9], vibe: 'tv', hashtag: '#NightShift', heat: 2,
    chirp: ['night shift season premiere had me stressed like I work in that hospital', 'night shift is just people falling in love during emergencies and I’m obsessed'],
    gram: ['premiere night 📺'],
    tok: ['night shift premiere reaction'],
    news: { section: 'entertainment', lines: ['Night Shift returns with its most-watched premiere yet'] },
    tags: ['screen', 'night'],
  },
  // November
  {
    id: 'black-friday', months: [10], vibe: 'money', hashtag: '#BlackFriday', heat: 3,
    chirp: ['black friday deals got me buying things I didn’t know existed 10 minutes ago', 'saved $40 by spending $300. economics', 'my cart is full and my bank account is crying'],
    gram: ['haul 🛍️', 'deals were insane'],
    tok: ['black friday haul', 'black friday deals that are actually worth it', 'POV: the store opens at 6am on black friday'],
    news: { section: 'business', lines: ['Black Friday online sales hit a record high', 'Shoppers line up overnight as Black Friday deals go live'] },
    tags: ['money', 'fashion', 'city'],
  },
  {
    id: 'thanksgiving', months: [10], vibe: 'family', hashtag: '#Thanksgiving', heat: 2,
    chirp: ['thanksgiving is just a family group chat that you can smell', 'my auntie asked when I’m getting married before I took my coat off', 'the leftovers are the real holiday'],
    gram: ['grateful for these people 🧡', 'the table is set', 'family, food, football'],
    tok: ['thanksgiving dinner with my family (chaos)', 'POV: your auntie asks about your love life'],
    tags: ['food', 'home', 'love'],
  },
  {
    id: 'reality-reunion', months: [10], vibe: 'tv', hashtag: '#VelvetEstatesReunion', heat: 2.5,
    chirp: ['velvet estates reunion was 3 hours of screaming and I loved every minute', 'the way she threw that drink at the velvet estates reunion 😭', 'velvet estates cast needs a group therapist and a lawyer'],
    gram: ['reunion night 🍷'],
    tok: ['velvet estates reunion in 60 seconds', 'the most iconic velvet estates reunion moments'],
    news: { section: 'entertainment', lines: ['Velvet Estates reunion ends in chaos as cast members walk out'] },
    tags: ['screen', 'night', 'party'],
  },
  // December
  {
    id: 'holidays', months: [11], vibe: 'family', hashtag: '#HolidaySeason', heat: 3,
    chirp: ['holiday season means 4 family dinners in 3 days', 'wrapping presents at 2am like a professional', 'the holiday playlist started in november and I let it', 'secret santa got me socks again'],
    gram: ['happy holidays from us 🎄', 'the best time of the year', 'cozy nights and good company'],
    tok: ['holiday gift ideas that aren’t boring', 'decorating the tree with my family', 'POV: it’s the holidays and your house is full'],
    tags: ['home', 'night', 'love'],
  },
  {
    id: 'year-in-review', months: [11], vibe: 'memes', hashtag: '#YearInReview', heat: 2,
    chirp: ['this year lasted 6 years and 3 days at the same time', 'my year in review is mostly naps and group chats', 'year recap: I survived. that’s it. that’s the recap'],
    gram: ['photo dump of the year 📸', 'what a year'],
    tok: ['my year in 60 seconds', 'top 10 moments of the year'],
    tags: ['friends', 'party', 'travel'],
  },
  {
    id: 'nye', months: [11], vibe: 'life', hashtag: '#NYE', heat: 2.5,
    chirp: ['new year’s eve plans: fall asleep at 11:45 and wake up at midnight', 'the countdown kiss is overrated, the countdown snacks are not', 'last party of the year, let’s go'],
    gram: ['cheers to the new year 🥂', 'last night of the year with my favorites', 'NYE 🎆'],
    tok: ['new year’s eve outfit ideas', 'the countdown with the squad'],
    tags: ['party', 'night', 'friends'],
  },
];
