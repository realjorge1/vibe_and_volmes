import type { RealCategory } from '../../types/realworld';

/**
 * THE REAL WORLD'S YEAR, OFFLINE.
 *
 * When the phone hasn't been online (or the player turned live news off),
 * people still talk about what's true every year around this date: the
 * playoffs, a meteor shower, the new-phone season, fashion month. Worded so
 * it's right whatever the year: no scores, no dates that move, no names that
 * change. Windows are [month, day] on the device's real calendar
 * (inclusive; a window can wrap past New Year).
 */

export interface SeasonalTopic {
  id: string;
  category: RealCategory;
  name: string;
  from: readonly [number, number];
  to: readonly [number, number];
  /** What people would say it is (shown as the trend's context). */
  blurb: string;
}

export const SEASONAL: readonly SeasonalTopic[] = [
  // Sports
  { id: 'nfl-playoffs', category: 'sports', name: 'the NFL playoffs', from: [1, 8], to: [1, 31], blurb: 'Playoff football is here' },
  { id: 'super-bowl', category: 'sports', name: 'the Super Bowl', from: [2, 1], to: [2, 14], blurb: 'Super Bowl week' },
  { id: 'australian-open', category: 'sports', name: 'the Australian Open', from: [1, 12], to: [2, 2], blurb: 'Tennis season opens in Melbourne' },
  { id: 'nba-all-star', category: 'sports', name: 'NBA All-Star weekend', from: [2, 12], to: [2, 22], blurb: 'All-Star weekend' },
  { id: 'march-madness', category: 'sports', name: 'March Madness', from: [3, 14], to: [4, 8], blurb: 'Brackets are already busted' },
  { id: 'f1-season', category: 'sports', name: 'the new F1 season', from: [3, 1], to: [3, 31], blurb: 'Lights out on a new Formula 1 season' },
  { id: 'the-masters', category: 'sports', name: 'the Masters', from: [4, 5], to: [4, 15], blurb: 'Golf’s biggest week' },
  { id: 'nba-playoffs', category: 'sports', name: 'the NBA playoffs', from: [4, 15], to: [6, 5], blurb: 'Playoff basketball' },
  { id: 'ucl-final', category: 'sports', name: 'the Champions League final', from: [5, 20], to: [6, 8], blurb: 'Europe’s biggest club game' },
  { id: 'nba-finals', category: 'sports', name: 'the NBA Finals', from: [6, 1], to: [6, 22], blurb: 'The Finals are on' },
  { id: 'wimbledon', category: 'sports', name: 'Wimbledon', from: [6, 28], to: [7, 15], blurb: 'Grass court season' },
  { id: 'tour-de-france', category: 'sports', name: 'the Tour de France', from: [7, 1], to: [7, 27], blurb: 'Three weeks of cycling across France' },
  { id: 'pl-kickoff', category: 'sports', name: 'the new Premier League season', from: [8, 9], to: [8, 31], blurb: 'Football is back' },
  { id: 'us-open', category: 'sports', name: 'the US Open', from: [8, 24], to: [9, 10], blurb: 'Night sessions in New York' },
  { id: 'nfl-kickoff', category: 'sports', name: 'the new NFL season', from: [9, 4], to: [9, 30], blurb: 'Football Sundays are back' },
  { id: 'ucl-nights', category: 'sports', name: 'Champions League nights', from: [9, 15], to: [12, 12], blurb: 'Midweek football under the lights' },
  { id: 'mlb-postseason', category: 'sports', name: 'playoff baseball', from: [10, 1], to: [10, 31], blurb: 'October baseball' },
  { id: 'nba-tipoff', category: 'sports', name: 'the new NBA season', from: [10, 20], to: [11, 15], blurb: 'Basketball is back' },
  { id: 'boxing-day', category: 'sports', name: 'Boxing Day football', from: [12, 24], to: [12, 28], blurb: 'Holiday football' },
  // Tech and games
  { id: 'ces', category: 'tech', name: 'CES', from: [1, 3], to: [1, 14], blurb: 'The year’s biggest gadget show' },
  { id: 'wwdc', category: 'tech', name: 'WWDC', from: [6, 3], to: [6, 14], blurb: 'Apple’s developer week' },
  { id: 'phone-season', category: 'tech', name: 'new phone season', from: [9, 5], to: [10, 20], blurb: 'Every brand is launching its new phones' },
  { id: 'black-friday-tech', category: 'tech', name: 'Black Friday tech deals', from: [11, 20], to: [12, 2], blurb: 'Deals on everything with a battery' },
  { id: 'summer-game-fest', category: 'gaming', name: 'Summer Game Fest', from: [6, 4], to: [6, 14], blurb: 'Trailer season for games' },
  { id: 'gamescom', category: 'gaming', name: 'Gamescom', from: [8, 18], to: [8, 28], blurb: 'Europe’s biggest games show' },
  { id: 'game-awards', category: 'gaming', name: 'The Game Awards', from: [12, 5], to: [12, 14], blurb: 'Game of the year talk' },
  { id: 'holiday-gaming', category: 'gaming', name: 'holiday game drops', from: [10, 15], to: [11, 20], blurb: 'The big games of the year are landing' },
  // Space and science
  { id: 'quadrantids', category: 'space', name: 'the Quadrantid meteor shower', from: [1, 1], to: [1, 6], blurb: 'The first meteor shower of the year' },
  { id: 'lyrids', category: 'space', name: 'the Lyrid meteor shower', from: [4, 18], to: [4, 25], blurb: 'Meteor shower season returns' },
  { id: 'eta-aquariids', category: 'space', name: 'the Eta Aquariid meteor shower', from: [5, 3], to: [5, 8], blurb: 'Dust from Halley’s Comet lights up the sky' },
  { id: 'perseids', category: 'space', name: 'the Perseid meteor shower', from: [8, 8], to: [8, 15], blurb: 'The summer’s best meteor shower' },
  { id: 'draconids', category: 'space', name: 'the Draconid meteor shower', from: [10, 6], to: [10, 10], blurb: 'An early-evening meteor shower' },
  { id: 'orionids', category: 'space', name: 'the Orionid meteor shower', from: [10, 18], to: [10, 24], blurb: 'More dust from Halley’s Comet' },
  { id: 'leonids', category: 'space', name: 'the Leonid meteor shower', from: [11, 14], to: [11, 19], blurb: 'November’s meteor shower' },
  { id: 'geminids', category: 'space', name: 'the Geminid meteor shower', from: [12, 11], to: [12, 16], blurb: 'The strongest meteor shower of the year' },
  { id: 'summer-solstice', category: 'space', name: 'the summer solstice', from: [6, 19], to: [6, 22], blurb: 'The longest day of the year up north' },
  { id: 'winter-solstice', category: 'space', name: 'the winter solstice', from: [12, 19], to: [12, 22], blurb: 'The shortest day of the year up north' },
  { id: 'nobel-week', category: 'science', name: 'Nobel Prize week', from: [10, 3], to: [10, 12], blurb: 'The science prizes are announced' },
  // Wellness
  { id: 'new-year-fitness', category: 'health', name: 'New Year fitness goals', from: [1, 1], to: [1, 20], blurb: 'Everyone is back at the gym' },
  { id: 'summer-hydration', category: 'health', name: 'staying hydrated in the heat', from: [7, 1], to: [8, 15], blurb: 'Drink your water' },
  { id: 'world-mental-health-day', category: 'health', name: 'World Mental Health Day', from: [10, 9], to: [10, 11], blurb: 'Check in on yourself and your people' },
  // Luxury and cars
  { id: 'fashion-month-feb', category: 'luxury', name: 'fashion month', from: [2, 8], to: [3, 8], blurb: 'New York, London, Milan, Paris' },
  { id: 'met-gala', category: 'luxury', name: 'the Met Gala', from: [5, 1], to: [5, 8], blurb: 'Fashion’s biggest night' },
  { id: 'fashion-month-sep', category: 'luxury', name: 'fashion month', from: [9, 5], to: [10, 8], blurb: 'Spring collections hit the runways' },
  { id: 'watch-week', category: 'luxury', name: 'new watch season', from: [3, 25], to: [4, 15], blurb: 'The watch world shows its new pieces' },
  { id: 'monaco-gp', category: 'auto', name: 'Monaco weekend', from: [5, 20], to: [6, 2], blurb: 'Supercars, yachts and a street race' },
  { id: 'car-week', category: 'auto', name: 'Monterey Car Week', from: [8, 10], to: [8, 20], blurb: 'The world’s rarest cars in one place' },
];

/** Topics that are true around `date` (month 1-12, day 1-31). */
export function seasonalFor(month: number, day: number): SeasonalTopic[] {
  const at = month * 100 + day;
  return SEASONAL.filter((s) => {
    const from = s.from[0] * 100 + s.from[1];
    const to = s.to[0] * 100 + s.to[1];
    return from <= to ? at >= from && at <= to : at >= from || at <= to;
  });
}
