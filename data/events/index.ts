import { CAREER_EVENTS } from './careerEvents';
import { DRAMA_EVENTS } from './dramaEvents';
import { SOCIAL_EVENTS } from './socialEvents';
import { PERSONAL_EVENTS } from './personalEvents';
import { RIVALRY_EVENTS } from './rivalryEvents';
import { INDUSTRY_EVENTS } from './industryEvents';
import { CULTURE_EVENTS } from './cultureEvents';
import { LIFE_EVENTS } from './lifeEvents';
import { PEOPLE_EVENTS } from './peopleEvents';
import { ASSET_EVENTS } from './assetEvents';
import { HEIR_EVENTS } from './heirEvents';
import { MOMENT_EVENTS } from './momentEvents';
import { ROMANCE_EVENTS } from './romanceEvents';
import { WAR_EVENTS } from './warEvents';
import { CALLBACK_EVENTS } from './callbackEvents';
import { LEGAL_EVENTS } from './legalEvents';
import { ARC_EVENTS } from './arcEvents';
import { MASTERS_EVENTS } from './mastersEvents';
import { MOGUL_EVENTS } from './mogulEvents';
import { LEGACY_EVENTS } from './legacyEvents';
import { CALENDAR_EVENTS } from './calendarEvents';
import { TRAIT_EVENTS } from './traitEvents';
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
  ...PEOPLE_EVENTS,
  ...ASSET_EVENTS,
  ...HEIR_EVENTS,
  ...MOMENT_EVENTS,
  ...ROMANCE_EVENTS,
  ...WAR_EVENTS,
  ...CALLBACK_EVENTS,
  ...LEGAL_EVENTS,
  ...ARC_EVENTS,
  ...MASTERS_EVENTS,
  ...MOGUL_EVENTS,
  ...LEGACY_EVENTS,
  ...CALENDAR_EVENTS,
  ...TRAIT_EVENTS,
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
  PEOPLE_EVENTS,
  ASSET_EVENTS,
  HEIR_EVENTS,
  MOMENT_EVENTS,
  ROMANCE_EVENTS,
  WAR_EVENTS,
  CALLBACK_EVENTS,
  LEGAL_EVENTS,
  ARC_EVENTS,
  MASTERS_EVENTS,
  MOGUL_EVENTS,
  LEGACY_EVENTS,
  CALENDAR_EVENTS,
  TRAIT_EVENTS,
};

export function getEventById(id: string): GameEvent | undefined {
  return ALL_EVENTS.find((e) => e.id === id);
}
