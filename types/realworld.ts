/**
 * THE REAL WORLD, AS THE GAME'S INTERNET TALKS ABOUT IT.
 *
 * What is actually happening right now in sports, tech, games, science,
 * space, wellness, luxury and cars (systems/realworld), screened so nothing
 * political, religious, criminal, tragic, medical-alarming, gambling or
 * gossip about real people ever comes in. Regular accounts post it and
 * people talk about it, like on the real apps.
 */

export type RealCategory = 'sports' | 'tech' | 'gaming' | 'science' | 'space' | 'health' | 'luxury' | 'auto';

export interface RealHeadline {
  title: string;
  /** The publication ("ESPN", "The Verge"). */
  source: string;
  /** The article (opened in the browser from VibeNews). */
  url: string;
  /** When it was published (ms). */
  at: number;
}

export interface RealTopic {
  /** Stable for the same story (dedupes refreshes). */
  id: string;
  category: RealCategory;
  /** What people call it: "Sporting CP", "iPhone 18", "Northern lights". Null when a headline has no short name. */
  name: string | null;
  /** The search a trend came from, as the trend board prints it ("Messi Career Goals"). */
  trend?: string;
  /** The lead story. */
  headline: RealHeadline;
  /** More coverage of the same story. */
  related: RealHeadline[];
  /** How much it is being searched (Google Trends "1000+" -> 1000), 0 when unknown. */
  traffic: number;
  /** Where it trends ('US', 'NG', 'GB'...). */
  region: string;
  /** Newest coverage (ms). */
  at: number;
  /** A matchup ("Braga vs Sporting"): the two sides. */
  sides?: [string, string];
  /** From the offline calendar (no live data): true every year around now, no link. */
  evergreen?: boolean;
}
