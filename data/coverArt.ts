/** Procedural cover "art" — no image assets. Two-tone blocks + initials,
 *  picked by the player. Cheap, offline, and recognizable on a feed. */
export interface CoverArt {
  id: string;
  top: string;
  bottom: string;
  label: string;
}

export const COVER_ART: CoverArt[] = [
  { id: 'cover-1', top: '#FF3B5C', bottom: '#7B1023', label: 'Heat' },
  { id: 'cover-2', top: '#7B4FFF', bottom: '#1B0F3B', label: 'Nocturne' },
  { id: 'cover-3', top: '#00D4AA', bottom: '#063A30', label: 'Mint' },
  { id: 'cover-4', top: '#FF9500', bottom: '#4A2A00', label: 'Amber' },
  { id: 'cover-5', top: '#FFD700', bottom: '#3A3000', label: 'Gold' },
  { id: 'cover-6', top: '#1DA1F2', bottom: '#0A2A40', label: 'Cold' },
  { id: 'cover-7', top: '#E1306C', bottom: '#3A0A1E', label: 'Bloom' },
  { id: 'cover-8', top: '#222222', bottom: '#000000', label: 'Void' },
];

export function getCover(id: string | null): CoverArt {
  return COVER_ART.find((c) => c.id === id) ?? COVER_ART[0];
}
