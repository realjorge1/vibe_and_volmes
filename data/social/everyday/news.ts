import type { PhotoTag } from '../../photos/photoPack';
import type { NewsSection } from './accounts';

/**
 * VibeNews' general headlines (the world outside music), by section, and
 * the paragraphs an outlet would write under them. Everything is made up.
 * Placeholders: {city}, {team}, {team2}, {show}, {phone}.
 */

export const HEADLINES: Record<NewsSection, readonly string[]> = {
  world: [
    'City council approves late-night transit expansion after years of debate',
    'Global leaders agree on new ocean protection pact',
    'Record number of travelers expected at airports this holiday weekend',
    'Housing prices cool for the first time in two years, report finds',
    'Volunteers plant 10,000 trees across {city} in a single weekend',
    'New high-speed rail line cuts journey times in half',
    'Museum reopens after major renovation with free entry for a month',
  ],
  business: [
    'Coffee prices hit a 10-year high as harvests struggle',
    'Streaming platforms raise prices again; subscribers push back',
    'Startup behind viral delivery app valued at $4 billion',
    'Remote work is here to stay, survey of 5,000 companies says',
    'Sneaker resale market slows as brands restock popular styles',
    'Grocery bills ease slightly as inflation cools',
  ],
  sports: [
    '{team} stun {team2} with last-second winner',
    '{team} star signs record-breaking contract extension',
    'Injury report: {team2} without their top scorer for three weeks',
    'Underdogs {team} clinch first playoff spot in a decade',
    'Coach of {team2} fined after post-game rant',
    'Rookie sensation breaks single-game scoring record',
  ],
  tech: [
    'Nimbus confirms launch event for the {phone}',
    'Leaked images show the {phone} with a redesigned camera',
    'Popular messaging app adds long-awaited edit button',
    'Battery breakthrough could double phone life, researchers say',
    'Major outage knocks social apps offline for two hours',
    'Smart glasses are back, and this time they look normal',
  ],
  health: [
    'Doctors say a 20-minute daily walk is the most underrated habit',
    'Study: people who sleep 7 hours are happier at work',
    'Free health screenings come to {city} this month',
    'Hydration myths, debunked by experts',
    'Mental health days gain traction at workplaces',
  ],
  entertainment: [
    '{show} finale breaks streaming records',
    '{show} renewed for two more seasons',
    'Fans demand answers after shocking {show} twist',
    'Box office: animated sequel tops the weekend',
    'Reality star from {show} lands their own spin-off',
  ],
  weather: [
    'Heat advisory issued as temperatures climb past 38°C',
    'Heavy rain expected through the weekend; flood warnings in place',
    'First frost of the season arrives early',
    'Snowstorm closes schools and roads across the region',
    'Clear skies and mild temperatures forecast for the week',
  ],
};

/** The photo a story in each section leads with. */
export const SECTION_TAGS: Record<NewsSection, readonly PhotoTag[]> = {
  world: ['city', 'street', 'sky'],
  business: ['money', 'city', 'paper'],
  sports: ['stadium', 'crowd', 'night'],
  tech: ['phone', 'screen', 'aesthetic'],
  health: ['fit', 'sky', 'food'],
  entertainment: ['screen', 'night', 'crowd'],
  weather: ['sky', 'rain', 'city'],
};

/** How an outlet writes the story up (after the headline). */
export const ARTICLE: Record<NewsSection, readonly string[]> = {
  world: [
    'Officials confirmed the details on Tuesday, describing the move as long overdue.',
    'Residents who spoke to reporters were mostly supportive, though some questioned the timeline and the cost.',
    'The plan takes effect in phases over the coming months, with a review scheduled for next year.',
  ],
  business: [
    'Analysts say the shift reflects changing habits since the pandemic, and expect the trend to continue.',
    'Shares moved sharply in early trading before settling by the afternoon.',
    'Consumers, meanwhile, say they are watching their spending more closely than ever.',
  ],
  sports: [
    'It was a night the fans in the building won’t forget, and the replay is already everywhere online.',
    'The coach praised the team’s resilience afterwards, while the opposing locker room was quiet.',
    'Both sides meet again next week, with plenty still to play for.',
  ],
  tech: [
    'The company declined to comment on specifics, but insiders expect an announcement within weeks.',
    'Early reactions online were split between excitement and questions about the price.',
    'Industry watchers say the move puts pressure on rivals to respond quickly.',
  ],
  health: [
    'Researchers stressed that small, consistent changes matter more than dramatic overhauls.',
    'The findings are based on data collected over several years from thousands of participants.',
    'Experts recommend speaking with a doctor before making major changes to your routine.',
  ],
  entertainment: [
    'The response online was instant, with fans flooding social media within minutes.',
    'Cast members shared behind-the-scenes photos and thanked viewers for their support.',
    'The studio is said to be planning more, though no dates have been confirmed.',
  ],
  weather: [
    'Forecasters urged residents to plan ahead and check updates before travelling.',
    'Conditions are expected to ease by the end of the week.',
    'Local services say they are prepared and will share updates as things develop.',
  ],
};
