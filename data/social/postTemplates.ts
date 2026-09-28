import type { PostSentiment } from '../../types/social';

export interface PostTemplate {
  template: string;
  sentiment: PostSentiment;
  minFans?: number;       // minimum player fans to use this template
  requiresTag?: string;   // requires player to have this tag
  platforms?: string[];   // preferred platforms
  weight: number;
}

const HYPE_TEMPLATES: PostTemplate[] = [
  { template: '{playerName} is NOT playing around with this one 🔥', sentiment: 'hype', weight: 10 },
  { template: 'I been saying {playerName} was different. Y\'all sleeping 😤', sentiment: 'hype', weight: 9 },
  { template: 'The way {playerName} just dropped "{trackTitle}" without warning..', sentiment: 'hype', weight: 8, requiresTag: 'has-track' },
  { template: 'OK {playerName} YOU WIN. We\'re not okay. 😭🔥', sentiment: 'hype', weight: 8 },
  { template: 'Not me crying in the club because of {playerName}', sentiment: 'hype', weight: 7 },
  { template: '{playerName} is in their bag right now and it shows', sentiment: 'hype', weight: 9 },
  { template: 'The {playerName} era is literally upon us', sentiment: 'hype', weight: 7, minFans: 5000 },
  { template: 'I KNEW {playerName} was going to snap. Manifested this 🙏', sentiment: 'hype', weight: 8 },
  { template: '{playerName} said "let them talk" and then went ahead and SNAPPED', sentiment: 'hype', weight: 8 },
  { template: 'If you\'re not listening to {playerName} rn what are you doing', sentiment: 'hype', weight: 9 },
  { template: 'Stream "{trackTitle}" for clear skin, better sleep, and financial stability', sentiment: 'hype', weight: 7, requiresTag: 'has-track' },
  { template: '{playerName} woke up and chose excellence again 💪', sentiment: 'hype', weight: 7 },
  { template: 'The critics will understand {playerName}\'s vision in 5 years', sentiment: 'hype', weight: 6 },
  { template: '{playerName} really said "I\'m that girl/guy" and was not lying', sentiment: 'hype', weight: 8 },
];

const POSITIVE_TEMPLATES: PostTemplate[] = [
  { template: 'Actually impressed by {playerName}\'s growth lately', sentiment: 'positive', weight: 8 },
  { template: '{playerName} handles the pressure really well. Props.', sentiment: 'positive', weight: 7 },
  { template: 'Been a fan since the beginning. {playerName} has not changed. That\'s rare.', sentiment: 'positive', weight: 7 },
  { template: 'Watched the {playerName} interview. Actually said something worth hearing.', sentiment: 'positive', weight: 6 },
  { template: 'Give {playerName} their flowers NOW. Don\'t wait.', sentiment: 'positive', weight: 8 },
  { template: '{playerName} really built something from nothing. Respect on every level.', sentiment: 'positive', weight: 7 },
  { template: 'Honestly {playerName}\'s catalog goes harder than people give credit for', sentiment: 'positive', weight: 8 },
  { template: 'The {genre} scene has been waiting for someone like {playerName}', sentiment: 'positive', weight: 7 },
  { template: 'People sleep on {playerName} but they won\'t be able to for much longer', sentiment: 'positive', weight: 8 },
  { template: '{playerName}\'s authenticity in an industry full of fakes is so refreshing', sentiment: 'positive', weight: 7 },
];

const NEUTRAL_TEMPLATES: PostTemplate[] = [
  { template: 'so {playerName} really said that huh', sentiment: 'neutral', weight: 8 },
  { template: '{playerName} is an interesting case study in the music industry', sentiment: 'neutral', weight: 5 },
  { template: 'Still forming my opinion on {playerName} tbh', sentiment: 'neutral', weight: 7 },
  { template: 'I see {playerName} is trending again. What happened now?', sentiment: 'neutral', weight: 9 },
  { template: 'Y\'all really came for {playerName} over that?', sentiment: 'neutral', weight: 7 },
  { template: 'The {playerName} situation is... complicated', sentiment: 'neutral', weight: 6 },
  { template: 'Wait what did {playerName} do this time', sentiment: 'neutral', weight: 9 },
  { template: 'Watching the {playerName} thing unfold in real time is wild', sentiment: 'neutral', weight: 7 },
  { template: '{playerName} is always in the news. Love or hate them you know the name.', sentiment: 'neutral', weight: 6 },
];

const CRITICAL_TEMPLATES: PostTemplate[] = [
  { template: 'I\'m sorry but {playerName} is overrated and I won\'t be taking questions', sentiment: 'critical', weight: 7 },
  { template: '{playerName} peaked already. The new stuff isn\'t it.', sentiment: 'critical', weight: 6 },
  { template: 'The {playerName} hype does not match the actual music quality', sentiment: 'critical', weight: 6 },
  { template: '{playerName} needs to stay in their lane fr', sentiment: 'critical', weight: 7 },
  { template: 'I said what I said. {playerName} is a product, not an artist.', sentiment: 'critical', weight: 5 },
  { template: 'The industry propped up {playerName} and y\'all fell for it', sentiment: 'critical', weight: 5 },
  { template: '{playerName}\'s fanbase is more loyal than the music deserves', sentiment: 'critical', weight: 6 },
  { template: 'Wrote a whole essay about why {playerName} is mid. I stand by it.', sentiment: 'critical', weight: 5 },
];

const HOSTILE_TEMPLATES: PostTemplate[] = [
  { template: '{playerName} is a menace and the industry needs to say it', sentiment: 'hostile', weight: 4 },
  { template: 'Blocked {playerName} and streaming numbers went up. Coincidence?', sentiment: 'hostile', weight: 5 },
  { template: 'If {playerName} is successful then the bar is literally on the floor', sentiment: 'hostile', weight: 4 },
  { template: '{playerName} stay losing and it\'s not even my fault 💀', sentiment: 'hostile', weight: 5 },
  { template: 'Every week {playerName} does something else embarrassing. I\'m keeping score.', sentiment: 'hostile', weight: 4 },
  { template: 'The {playerName} era needs to END. I\'m exhausted.', sentiment: 'hostile', weight: 5 },
];

const MEME_TEMPLATES: PostTemplate[] = [
  { template: '{playerName} fans when the new song isn\'t about what they wanted: 😭💀', sentiment: 'meme', weight: 8 },
  { template: 'me explaining to my mom why {playerName} is important', sentiment: 'meme', weight: 7 },
  { template: '{playerName} really said all of that on a Friday?? no thoughts head empty just vibes', sentiment: 'meme', weight: 8 },
  { template: 'me in 2019 vs me after discovering {playerName}: 💀 → 🔥', sentiment: 'meme', weight: 7 },
  { template: '{playerName}: *breathes* The internet:', sentiment: 'meme', weight: 9 },
  { template: 'therapist: {playerName} can\'t hurt you. {playerName}: 🎤', sentiment: 'meme', weight: 8 },
  { template: 'okay but {playerName} really ate and left no crumbs 😭', sentiment: 'meme', weight: 8 },
  { template: 'POV: you asked me one question about {playerName} and I talked for 4 hours', sentiment: 'meme', weight: 7 },
];

const NEWS_TEMPLATES: PostTemplate[] = [
  { template: 'BREAKING: {playerName} is trending following {event}', sentiment: 'news', weight: 8 },
  { template: 'Sources: {playerName} in talks for {opportunity}. Story developing.', sentiment: 'news', weight: 6 },
  { template: '{playerName}\'s numbers are moving differently this week. Worth watching.', sentiment: 'news', weight: 7 },
  { template: 'Industry insiders say {playerName}\'s trajectory is one of the year\'s big stories', sentiment: 'news', weight: 5, minFans: 50000 },
  { template: 'The {playerName} conversation is changing. Here\'s why.', sentiment: 'news', weight: 6 },
  { template: 'Charts update: {playerName} makes a move this week 📈', sentiment: 'news', weight: 7 },
];

const SHADE_TEMPLATES: PostTemplate[] = [
  { template: 'I\'m not saying {playerName} bought their numbers but... 👀', sentiment: 'shade', weight: 5 },
  { template: '{playerName} really wants us to believe they wrote that alone. Okay.', sentiment: 'shade', weight: 4 },
  { template: 'The delusion of {playerName}\'s team thinking this is a winning strategy', sentiment: 'shade', weight: 5 },
  { template: '{playerName} smiled at the camera like they didn\'t just do what they did 😭', sentiment: 'shade', weight: 6 },
  { template: 'Love how {playerName} still thinks we forgot. We didn\'t.', sentiment: 'shade', weight: 5 },
  { template: 'The {playerName} PR team is working overtime and it still isn\'t working', sentiment: 'shade', weight: 4 },
];

export const ALL_POST_TEMPLATES: PostTemplate[] = [
  ...HYPE_TEMPLATES,
  ...POSITIVE_TEMPLATES,
  ...NEUTRAL_TEMPLATES,
  ...CRITICAL_TEMPLATES,
  ...HOSTILE_TEMPLATES,
  ...MEME_TEMPLATES,
  ...NEWS_TEMPLATES,
  ...SHADE_TEMPLATES,
];

export const TEMPLATES_BY_SENTIMENT: Record<PostSentiment, PostTemplate[]> = {
  hype: HYPE_TEMPLATES,
  positive: POSITIVE_TEMPLATES,
  neutral: NEUTRAL_TEMPLATES,
  critical: CRITICAL_TEMPLATES,
  hostile: HOSTILE_TEMPLATES,
  meme: MEME_TEMPLATES,
  news: NEWS_TEMPLATES,
  shade: SHADE_TEMPLATES,
};

// Hashtag templates used in trending topics
export const HASHTAG_TEMPLATES = {
  hype: (name: string) => [
    `#${name.replace(/\s/g, '')}`,
    `#${name.replace(/\s/g, '')}IsSnapping`,
    `#${name.replace(/\s/g, '')}Era`,
    `#WeLove${name.replace(/\s/g, '')}`,
    `#${name.replace(/\s/g, '')}Gang`,
  ],
  drama: (name: string) => [
    `#${name.replace(/\s/g, '')}Drama`,
    `#${name.replace(/\s/g, '')}Exposed`,
    `#${name.replace(/\s/g, '')}Cancelled`,
    `#Cancel${name.replace(/\s/g, '')}`,
    `#${name.replace(/\s/g, '')}Lied`,
  ],
  track: (name: string, track: string) => [
    `#${track.replace(/\s/g, '')}`,
    `#${name.replace(/\s/g, '')}New${track.replace(/\s/g, '')}`,
    `#Stream${track.replace(/\s/g, '')}`,
  ],
  beef: (name: string) => [
    `#${name.replace(/\s/g, '')}Beef`,
    `#${name.replace(/\s/g, '')}Diss`,
    `#${name.replace(/\s/g, '')}Responded`,
    `#WhoWon`,
  ],
  // Fashion / aesthetic trends — fueled by lifestyle posts, ride genre eras.
  fashion: (name: string) => [
    `#${name.replace(/\s/g, '')}CoreAesthetic`,
    `#${name.replace(/\s/g, '')}Fit`,
    `#OutfitOfTheNight`,
    `#RedCarpetMoment`,
    `#ThatGirlEnergy`,
  ],
  // Social movements / discourse the artist gets pulled into.
  movement: () => [
    `#ProtectArtists`,
    `#PayMusiciansFairly`,
    `#TouringIsBroken`,
    `#StreamingScam`,
    `#MentalHealthInMusic`,
  ],
};
