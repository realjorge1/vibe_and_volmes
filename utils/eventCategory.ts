import type { EventCategory } from '../types/events';
import { COLORS } from '../constants/theme';

/**
 * Category → accent color. Single source of truth so the active event card,
 * a resolved beat and a career-log line all tint the same category the same
 * way as the player scrolls their history.
 */
export const CATEGORY_COLOR: Record<EventCategory, string> = {
  career: COLORS.accent,
  drama: COLORS.negative,
  social: COLORS.secondary,
  personal: COLORS.chirper,
  rivalry: COLORS.primary,
  opportunity: COLORS.gold,
};

export function categoryColor(category: EventCategory): string {
  return CATEGORY_COLOR[category] ?? COLORS.neutral;
}
