import type { EventCategory } from '../types/events';
import { COLORS } from '../constants/theme';

/**
 * Category → accent color. Single source of truth so the active event card,
 * a resolved beat and a career-log line all tint the same category the same
 * way as the player scrolls their history.
 */
export const CATEGORY_COLOR: Record<EventCategory, string> = {
  career: COLORS.primary,
  drama: COLORS.negative,
  social: COLORS.accent,
  personal: COLORS.secondary,
  rivalry: '#FF8A3D',
  opportunity: COLORS.gold,
};

/** Category → the glyph drawn on its 3D orb. */
export const CATEGORY_ICON: Record<EventCategory, string> = {
  career: 'rocket',
  drama: 'flame',
  social: 'chatbubbles',
  personal: 'heart',
  rivalry: 'flash',
  opportunity: 'star',
};

export function categoryColor(category: EventCategory): string {
  return CATEGORY_COLOR[category] ?? COLORS.neutral;
}

export function categoryIcon(category: EventCategory): string {
  return CATEGORY_ICON[category] ?? 'sparkles';
}
