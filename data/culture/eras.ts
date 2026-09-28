import type { EraDefinition, EraId } from '../../types/culture';
import type { MusicGenre } from '../../types/player';

/**
 * The ordered cultural timeline. The world starts in `blog-era` and ages
 * forward through these. Each era reshapes genre fit, fan volatility, media
 * hostility and how much authenticity the public rewards — this is what
 * makes Year 1 feel different from Year 15. Data-driven by design: adding a
 * new era is appending one entry here (content-scalability mandate).
 */
export const ERAS: EraDefinition[] = [
  {
    id: 'blog-era',
    label: 'The Blog Era',
    vibe: 'Tastemakers and mixtapes. Buzz is earned in comment sections.',
    chronicle:
      'an age when reputations were built on music blogs and leaked mixtapes, before the algorithms took over',
    minWeeks: 28,
    maxWeeks: 60,
    genreFit: { 'hip-hop': 1.3, 'r&b': 1.15, rock: 1.2, gospel: 1.05, pop: 0.95 },
    ascendantGenres: ['hip-hop', 'r&b', 'rock'],
    fanVolatility: 0.35,
    mediaHostility: 0.4,
    authenticityWeight: 0.8,
    trendDescriptors: ['Underground', 'Mixtape', 'Cosign', 'Blogged'],
    scandalStandard: 'a leaked verse could end you',
  },
  {
    id: 'streaming-boom',
    label: 'The Streaming Boom',
    vibe: 'Playlists are the new radio. Numbers are everything.',
    chronicle:
      'the gold rush when streaming playlists minted overnight superstars and the charts never stopped moving',
    minWeeks: 32,
    maxWeeks: 64,
    genreFit: { pop: 1.3, 'hip-hop': 1.25, latin: 1.2, electronic: 1.15, country: 1.05 },
    ascendantGenres: ['pop', 'hip-hop', 'latin'],
    fanVolatility: 0.45,
    mediaHostility: 0.45,
    authenticityWeight: 0.6,
    trendDescriptors: ['Playlisted', 'Streaming', 'GoldPlay', 'Chartrun'],
    scandalStandard: 'streams could be bought and everyone knew it',
  },
  {
    id: 'short-video-virality',
    label: 'The Short-Video Age',
    vibe: 'A 12-second clip can make or bury a career overnight.',
    chronicle:
      'the chaotic stretch when a single looping clip decided who ate that year',
    minWeeks: 28,
    maxWeeks: 56,
    genreFit: { pop: 1.35, 'hip-hop': 1.2, electronic: 1.2, latin: 1.15, country: 1.1 },
    ascendantGenres: ['pop', 'electronic', 'country'],
    fanVolatility: 0.7,
    mediaHostility: 0.55,
    authenticityWeight: 0.45,
    trendDescriptors: ['Viral', 'Sound', 'Trend', 'ForYou'],
    scandalStandard: 'one bad clip looped a million times',
  },
  {
    id: 'algorithmic-saturation',
    label: 'Algorithmic Saturation',
    vibe: 'Everyone is releasing constantly. Attention is rationed.',
    chronicle:
      'the exhausted years when the feed never slept and every artist fought the algorithm for air',
    minWeeks: 30,
    maxWeeks: 60,
    genreFit: { pop: 1.1, 'hip-hop': 1.05, electronic: 1.1, 'r&b': 1.1, country: 1.05 },
    ascendantGenres: ['r&b', 'country', 'electronic'],
    fanVolatility: 0.6,
    mediaHostility: 0.65,
    authenticityWeight: 0.7,
    trendDescriptors: ['Algorithm', 'Oversaturated', 'Drop', 'Reset'],
    scandalStandard: 'silence itself was suspicious',
  },
  {
    id: 'ai-flood',
    label: 'The AI Flood',
    vibe: 'Synthetic artists everywhere. Realness is suddenly priceless.',
    chronicle:
      'the era when machines could fake any voice, and a beating human heart became the rarest sound in music',
    minWeeks: 32,
    maxWeeks: 70,
    genreFit: { 'r&b': 1.3, gospel: 1.25, rock: 1.2, 'hip-hop': 1.15, country: 1.15 },
    ascendantGenres: ['r&b', 'gospel', 'rock'],
    fanVolatility: 0.55,
    mediaHostility: 0.6,
    authenticityWeight: 0.95,
    trendDescriptors: ['Human', 'Real', 'Synthetic', 'Deepfake'],
    scandalStandard: 'no one could tell what was even real anymore',
  },
  {
    id: 'post-authenticity',
    label: 'Post-Authenticity',
    vibe: 'Spectacle wins. The audience stopped pretending it cared who was real.',
    chronicle:
      'the strange final age when nobody asked if it was real, only whether it was unforgettable',
    minWeeks: 36,
    maxWeeks: 999,
    genreFit: { pop: 1.3, electronic: 1.25, latin: 1.2, 'hip-hop': 1.1, country: 1.1 },
    ascendantGenres: ['pop', 'electronic', 'latin'],
    fanVolatility: 0.75,
    mediaHostility: 0.7,
    authenticityWeight: 0.35,
    trendDescriptors: ['Spectacle', 'Legend', 'Era', 'Iconic'],
    scandalStandard: 'nothing was scandalous because nothing was sacred',
  },
];

const ERA_BY_ID = new Map<EraId, EraDefinition>(ERAS.map((e) => [e.id, e]));

export function getEra(id: EraId): EraDefinition {
  return ERA_BY_ID.get(id) ?? ERAS[0];
}

export function nextEra(id: EraId): EraDefinition | null {
  const i = ERAS.findIndex((e) => e.id === id);
  if (i < 0 || i >= ERAS.length - 1) return null;
  return ERAS[i + 1];
}

/** Era genreFit lookup with a neutral 1.0 default for unlisted genres. */
export function eraGenreFit(era: EraDefinition, genre: MusicGenre): number {
  return era.genreFit[genre] ?? 1.0;
}
