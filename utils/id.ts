let counter = 0;

/** Collision-resistant id for runtime-generated game objects. */
export function uid(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}
