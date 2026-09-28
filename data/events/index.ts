import { CAREER_EVENTS } from './careerEvents';
import { DRAMA_EVENTS } from './dramaEvents';
import { SOCIAL_EVENTS } from './socialEvents';
import { PERSONAL_EVENTS } from './personalEvents';
import { RIVALRY_EVENTS } from './rivalryEvents';
import { INDUSTRY_EVENTS } from './industryEvents';
import { CULTURE_EVENTS } from './cultureEvents';
import { LIFE_EVENTS } from './lifeEvents';
import type { GameEvent } from '../../types/events';

export const ALL_EVENTS: GameEvent[] = [
  ...CAREER_EVENTS,
  ...DRAMA_EVENTS,
  ...SOCIAL_EVENTS,
  ...PERSONAL_EVENTS,
  ...RIVALRY_EVENTS,
  ...INDUSTRY_EVENTS,
  ...CULTURE_EVENTS,
  ...LIFE_EVENTS,
];

export {
  CAREER_EVENTS,
  DRAMA_EVENTS,
  SOCIAL_EVENTS,
  PERSONAL_EVENTS,
  RIVALRY_EVENTS,
  INDUSTRY_EVENTS,
  CULTURE_EVENTS,
  LIFE_EVENTS,
};

export function getEventById(id: string): GameEvent | undefined {
  return ALL_EVENTS.find((e) => e.id === id);
}
