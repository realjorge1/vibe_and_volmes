/** Pad a number to always show e.g. "Week 04" */
export function formatWeek(week: number): string {
  return `Week ${String(week).padStart(2, '0')}`;
}

/** Ordinal suffix: 1st, 2nd, 3rd, 4th... */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/** Format large numbers with commas */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** Short number format for social engagement: 1.2K, 4.5M */
export function shortNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Relative in-game time: "3 weeks ago", "just now" */
export function relativeWeek(current: number, past: number): string {
  const diff = current - past;
  if (diff === 0) return 'just now';
  if (diff === 1) return '1 week ago';
  if (diff < 4) return `${diff} weeks ago`;
  if (diff < 12) return `${diff} weeks ago`;
  if (diff < 52) return `${Math.floor(diff / 4)} months ago`;
  return `${Math.floor(diff / 52)} year${diff >= 104 ? 's' : ''} ago`;
}

/** Format money concisely */
export function formatMoney(n: number): string {
  if (n < 0) return `-${formatMoney(-n)}`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

/** Title case a string */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Convert kebab-case genre to label */
export function genreLabel(genre: string): string {
  const map: Record<string, string> = {
    'hip-hop': 'Hip-Hop',
    'pop': 'Pop',
    'r&b': 'R&B',
    'rock': 'Rock',
    'electronic': 'Electronic',
    'country': 'Country',
    'latin': 'Latin',
  };
  return map[genre] ?? titleCase(genre);
}

/** Archetype to readable label */
export function archetypeLabel(archetype: string): string {
  const map: Record<string, string> = {
    'street-hustler': 'Street Hustler',
    'church-singer': 'Church Singer',
    'rich-kid': 'Rich Kid',
    'underground-rapper': 'Underground Rapper',
    'internet-troll': 'Internet Troll',
    'indie-dreamer': 'Indie Dreamer',
  };
  return map[archetype] ?? titleCase(archetype.replace(/-/g, ' '));
}
