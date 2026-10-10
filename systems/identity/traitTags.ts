/**
 * Traits are stored as `trait:<id>` tags. Pure helpers (no stores), so the
 * event engine and pure tests can read them without loading the app's state.
 */

export const TRAIT_PREFIX = 'trait:';

export function traitTag(id: string): string {
  return `${TRAIT_PREFIX}${id}`;
}

/** Trait ids among a list of tags. */
export function traitsFromTags(tags: readonly string[]): string[] {
  return tags.filter((t) => t.startsWith(TRAIT_PREFIX)).map((t) => t.slice(TRAIT_PREFIX.length));
}
