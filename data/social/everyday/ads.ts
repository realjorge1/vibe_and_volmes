import type { PhotoTag } from '../../photos/photoPack';

/** What each made-up brand advertises, and the button under the ad. */
export interface AdCopy {
  lines: readonly string[];
  tags: readonly PhotoTag[];
  cta: 'Shop now' | 'Learn more' | 'Order now' | 'Install now' | 'Book now' | 'Sign up';
}

export const ADS: Record<string, AdCopy> = {
  'ad-fizzly': {
    lines: ['Zero sugar. All the fizz. 🫧', 'New flavor just dropped: Mango Rush', 'Summer tastes like this', 'The official drink of doing nothing'],
    tags: ['food', 'aesthetic', 'pool'],
    cta: 'Shop now',
  },
  'ad-kloudkicks': {
    lines: ['Walk on clouds. Literally. ☁️', 'The Kloud Runner 2 is here', 'Your new everyday sneaker', '20% off this weekend only'],
    tags: ['sneakers', 'street', 'fashion'],
    cta: 'Shop now',
  },
  'ad-novabank': {
    lines: ['Get paid up to 2 days early.', 'No fees. No branches. No nonsense.', 'Your savings, finally growing', 'Split the bill in one tap'],
    tags: ['phone', 'money', 'city'],
    cta: 'Sign up',
  },
  'ad-glowy': {
    lines: ['Your skin, but well rested ✨', 'The serum everyone keeps asking about', '3 steps. 5 minutes. Glow.', 'Dermatologist approved, group chat obsessed'],
    tags: ['aesthetic', 'lifestyle'],
    cta: 'Shop now',
  },
  'ad-zippeats': {
    lines: ['Hungry? It’s already on the way 🛵', 'Free delivery on your first 3 orders', 'Late-night cravings, handled', 'Your favorite spots, 20 minutes away'],
    tags: ['food', 'city', 'night'],
    cta: 'Order now',
  },
  'ad-volt': {
    lines: ['Charge up ⚡', 'Zero crash. Pure focus.', 'Fuel for the grind', 'New: Volt Citrus Storm'],
    tags: ['fit', 'night', 'city'],
    cta: 'Shop now',
  },
  'ad-haven': {
    lines: ['Stay somewhere worth posting.', 'Weekend escapes from $89', 'Rooftop pools. Ocean views. You deserve it.', 'Your next getaway starts here'],
    tags: ['hotel', 'pool', 'travel'],
    cta: 'Book now',
  },
  'ad-nimbus': {
    lines: ['Think in orbit.', 'The camera that sees in the dark.', 'All-day battery. All-night battery.', 'Trade in. Trade up.'],
    tags: ['phone', 'aesthetic', 'screen'],
    cta: 'Learn more',
  },
};

export function adCta(accountId: string): string | null {
  return ADS[accountId]?.cta ?? null;
}
