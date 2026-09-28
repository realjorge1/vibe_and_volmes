import type { CosmeticItem, SeasonDef } from '../../types/premium';
import { COLORS } from '../../constants/theme';

/**
 * Premium cosmetic catalog — the data backing the COSMETIC-ONLY entitlement
 * layer (see types/premium). Every item is visual / identity / convenience;
 * nothing grants a mechanical advantage. Prices are in the soft, earnable
 * "Vibes" currency. Beat-pack items map 1:1 to the packs in ./premiumBeats by
 * sharing the pack id, so ownership of the cosmetic unlocks that pack's beats.
 */
export const COSMETIC_CATALOG: CosmeticItem[] = [
  // ── Studio themes (repaint the studio accent) ───────────────────────────
  {
    id: 'theme-midnight',
    name: 'Midnight',
    category: 'studio-theme',
    price: 600,
    blurb: 'Deep-space black with an electric edge. The default, perfected.',
    icon: 'moon',
    themeColor: COLORS.primary,
  },
  {
    id: 'theme-bone',
    name: 'Bone',
    category: 'studio-theme',
    price: 800,
    blurb: 'Stark, clinical white-on-black. Pure signal, no noise.',
    icon: 'contrast',
    themeColor: COLORS.text,
  },
  {
    id: 'theme-gold-room',
    name: 'Gold Room',
    category: 'studio-theme',
    price: 1500,
    blurb: 'A warm legend-tier glint for the studio. Earn your shine.',
    icon: 'diamond',
    themeColor: COLORS.gold,
  },

  // ── Beat packs (variety, never power — share id with ./premiumBeats) ────
  {
    id: 'pack-after-hours',
    name: 'After Hours',
    category: 'beat-pack',
    price: 1200,
    blurb: 'Three late-night lo-fi & R&B instrumentals for the 2am sessions.',
    icon: 'musical-notes',
    beatPackIds: ['pk-afterhours-velour', 'pk-afterhours-streetlight', 'pk-afterhours-noir'],
  },
  {
    id: 'pack-main-stage',
    name: 'Main Stage',
    category: 'beat-pack',
    price: 1800,
    blurb: 'Festival-sized, triumphant pop & afrobeats anthems.',
    icon: 'flame',
    beatPackIds: ['pk-mainstage-ignite', 'pk-mainstage-skyline', 'pk-mainstage-anthem'],
  },

  // ── Vanity (identity flair) ─────────────────────────────────────────────
  {
    id: 'vanity-verified',
    name: 'Blue Check',
    category: 'vanity',
    price: 1000,
    blurb: 'A clean verified mark next to your name across the in-game internet.',
    icon: 'checkmark-circle',
  },
  {
    id: 'vanity-crown',
    name: 'Crown',
    category: 'vanity',
    price: 2500,
    blurb: 'For the untouchable. A subtle crown on your profile.',
    icon: 'ribbon',
  },

  // ── Convenience (quality-of-life toggles, never outcome-affecting) ───────
  {
    id: 'conv-auto-fill',
    name: 'Auto-Fill',
    category: 'convenience',
    price: 500,
    blurb: 'Pre-fills your last release plan so you can ship faster.',
    icon: 'sparkles',
    convenience: 'auto-fill',
  },
  {
    id: 'conv-recap-flair',
    name: 'Recap Flair',
    category: 'convenience',
    price: 400,
    blurb: 'Richer "while you were away" recaps with extra detail.',
    icon: 'newspaper',
    convenience: 'recap-flair',
  },

  // ── Season pass (unlocks the premium reward lane) ───────────────────────
  {
    id: 'season-pass',
    name: 'Season Pass',
    category: 'season-pass',
    price: 2000,
    blurb: 'Unlocks the premium reward track for the current season.',
    icon: 'trophy',
  },
];

export function getCosmetic(id: string): CosmeticItem | undefined {
  return COSMETIC_CATALOG.find((c) => c.id === id);
}

/**
 * The active season. XP is earned purely by playing; both reward lanes are
 * cosmetic / soft-currency only (no mechanical rewards).
 */
export const CURRENT_SEASON: SeasonDef = {
  id: 'season-01-genesis',
  name: 'Season 1 · Genesis',
  blurb: 'The first run. Climb the tiers just by living the career.',
  tiers: [
    {
      tier: 1,
      xpRequired: 0,
      free: { kind: 'currency', amount: 100, label: '100 Vibes' },
      premium: { kind: 'currency', amount: 250, label: '250 Vibes' },
    },
    {
      tier: 2,
      xpRequired: 500,
      free: { kind: 'none', label: '—' },
      premium: { kind: 'cosmetic', cosmeticId: 'theme-midnight', label: 'Midnight theme' },
    },
    {
      tier: 3,
      xpRequired: 1200,
      free: { kind: 'currency', amount: 200, label: '200 Vibes' },
      premium: { kind: 'cosmetic', cosmeticId: 'pack-after-hours', label: 'After Hours pack' },
    },
    {
      tier: 4,
      xpRequired: 2200,
      free: { kind: 'none', label: '—' },
      premium: { kind: 'vanity', cosmeticId: 'vanity-verified', label: 'Blue Check' },
    },
    {
      tier: 5,
      xpRequired: 3600,
      free: { kind: 'currency', amount: 400, label: '400 Vibes' },
      premium: { kind: 'cosmetic', cosmeticId: 'theme-gold-room', label: 'Gold Room theme' },
    },
  ],
};
