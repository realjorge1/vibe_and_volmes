/**
 * Places a post can be tagged with. Real cities for real-looking posts, and
 * made-up spots for fun: the player can also type anything they like.
 */

export const REAL_PLACES: readonly string[] = [
  'Lagos, Nigeria',
  'Abuja, Nigeria',
  'Accra, Ghana',
  'Nairobi, Kenya',
  'Johannesburg, South Africa',
  'Cape Town, South Africa',
  'Marrakech, Morocco',
  'Cairo, Egypt',
  'London, United Kingdom',
  'Manchester, United Kingdom',
  'Paris, France',
  'Berlin, Germany',
  'Amsterdam, Netherlands',
  'Barcelona, Spain',
  'Ibiza, Spain',
  'Milan, Italy',
  'Rome, Italy',
  'Lisbon, Portugal',
  'Dubai, United Arab Emirates',
  'Tokyo, Japan',
  'Seoul, South Korea',
  'Bali, Indonesia',
  'Sydney, Australia',
  'Toronto, Ontario',
  'Montreal, Quebec',
  'New York, New York',
  'Brooklyn, New York',
  'Los Angeles, California',
  'Hollywood Hills, California',
  'Malibu, California',
  'Atlanta, Georgia',
  'Miami, Florida',
  'Houston, Texas',
  'Dallas, Texas',
  'Chicago, Illinois',
  'Nashville, Tennessee',
  'Detroit, Michigan',
  'Seattle, Washington',
  'Las Vegas, Nevada',
  'New Orleans, Louisiana',
  'Kingston, Jamaica',
  'Rio de Janeiro, Brazil',
  'Mexico City, Mexico',
  'Tulum, Mexico',
];

export const FUN_PLACES: readonly string[] = [
  'Mars, Milky Way',
  'The Moon',
  'Cloud 9',
  'Main Character Land',
  'Studio B, 4AM',
  'Backstage',
  'Front Row',
  'My Mom’s Kitchen',
  'Grandma’s House',
  'The Group Chat',
  'Bed (Do Not Disturb)',
  'The Gym (Allegedly)',
  'Somewhere Over The Rainbow',
  'Atlantis',
  'Living Rent Free In Your Head',
  'Wherever The Party Is',
  'The Top',
  'Out Of Office',
  'Lost In The Sauce',
  'Vibe Central',
  'The Airport Lounge',
  'Somewhere Sunny',
  'A Secret Location',
  'Right Here, Right Now',
];

/** The picker's list: the artist's own city first, then real places, then fun ones. */
export function locationOptions(homeCity: string | null | undefined): string[] {
  const home = (homeCity ?? '').trim();
  const real = REAL_PLACES.filter((p) => !home || !p.toLowerCase().startsWith(home.toLowerCase()));
  const homeLabel = home ? (REAL_PLACES.find((p) => p.toLowerCase().startsWith(home.toLowerCase())) ?? home) : null;
  return [...(homeLabel ? [homeLabel] : []), ...FUN_PLACES.slice(0, 6), ...real, ...FUN_PLACES.slice(6)];
}

/** Search the list: anything that contains every typed word. */
export function searchLocations(options: readonly string[], query: string): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...options];
  return options.filter((o) => {
    const l = o.toLowerCase();
    return words.every((w) => l.includes(w));
  });
}
