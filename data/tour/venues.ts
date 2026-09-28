import type { Venue, VenueScale } from '../../types/industry';

export const VENUES: Venue[] = [
  {
    id: 'open-mic-night',
    name: 'The Corner Open Mic',
    scale: 'open-mic',
    capacity: 60,
    minFameLevel: 0,
    baseGuarantee: 0,
    prestige: 4,
  },
  {
    id: 'the-basement',
    name: 'The Basement',
    scale: 'club',
    capacity: 350,
    minFameLevel: 1,
    baseGuarantee: 800,
    prestige: 15,
  },
  {
    id: 'neon-room',
    name: 'Neon Room',
    scale: 'club',
    capacity: 900,
    minFameLevel: 2,
    baseGuarantee: 3_000,
    prestige: 25,
  },
  {
    id: 'paramount-theater',
    name: 'Paramount Theater',
    scale: 'theater',
    capacity: 2_800,
    minFameLevel: 3,
    baseGuarantee: 12_000,
    prestige: 42,
  },
  {
    id: 'grand-hall',
    name: 'Grand Hall',
    scale: 'theater',
    capacity: 5_500,
    minFameLevel: 4,
    baseGuarantee: 30_000,
    prestige: 55,
  },
  {
    id: 'metro-arena',
    name: 'Metro Arena',
    scale: 'arena',
    capacity: 18_000,
    minFameLevel: 5,
    baseGuarantee: 120_000,
    prestige: 72,
  },
  {
    id: 'skyline-stadium',
    name: 'Skyline Stadium',
    scale: 'stadium',
    capacity: 62_000,
    minFameLevel: 7,
    baseGuarantee: 600_000,
    prestige: 90,
  },
  {
    id: 'sunfall-festival',
    name: 'Sunfall Festival (Headliner)',
    scale: 'festival',
    capacity: 95_000,
    minFameLevel: 6,
    baseGuarantee: 450_000,
    prestige: 95,
  },
];

export const TOUR_SCALES: { scale: VenueScale; label: string; stops: number }[] = [
  { scale: 'club', label: 'Club Run', stops: 4 },
  { scale: 'theater', label: 'Regional Tour', stops: 6 },
  { scale: 'arena', label: 'Arena Tour', stops: 8 },
  { scale: 'stadium', label: 'World Tour', stops: 10 },
  { scale: 'festival', label: 'Festival Circuit', stops: 5 },
];

export function venuesForScale(scale: VenueScale): Venue[] {
  return VENUES.filter((v) => v.scale === scale);
}

export function getVenue(id: string): Venue | undefined {
  return VENUES.find((v) => v.id === id);
}
