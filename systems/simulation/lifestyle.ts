/**
 * Recurring lifestyle burn for a lifestyle tier: rent, bills, living. The
 * tier follows where the artist lives (data/life/homes.ts). Pure, so the UI
 * and the asset engine can price a home without the weekly tick.
 */
export function lifestyleBurn(weeklyBurn: number, lifestyleTier: number): number {
  return Math.round(weeklyBurn * (1 + lifestyleTier * 0.6));
}
