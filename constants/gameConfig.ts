// Fame ramp — restrained: gray (unknown) → blue (the brand accent) → white
// (peak) → gold (legend). One accent, calm escalation.
export const FAME_LEVELS = [
  { level: 0, label: 'Unknown',      minFans: 0,           color: '#5C636B' },
  { level: 1, label: 'Local Scene',  minFans: 100,         color: '#5C636B' },
  { level: 2, label: 'Scene Known',  minFans: 1_000,       color: '#9BA1A8' },
  { level: 3, label: 'Underground',  minFans: 10_000,      color: '#9BA1A8' },
  { level: 4, label: 'Emerging',     minFans: 50_000,      color: '#2E8DFF' },
  { level: 5, label: 'Rising Star',  minFans: 200_000,     color: '#2E8DFF' },
  { level: 6, label: 'Mainstream',   minFans: 1_000_000,   color: '#2E8DFF' },
  { level: 7, label: 'Famous',       minFans: 10_000_000,  color: '#FFFFFF' },
  { level: 8, label: 'Superstar',    minFans: 50_000_000,  color: '#FFFFFF' },
  { level: 9, label: 'Legend',       minFans: 200_000_000, color: '#D9C77E' },
] as const;

// Reputation tiers stay semantic (data colors): red → amber → gray → green → gold.
export const REPUTATION_TIERS = [
  { min: 0,  max: 20,  label: 'Cancelled',   color: '#E5544B' },
  { min: 20, max: 35,  label: 'Controversial', color: '#E0A53B' },
  { min: 35, max: 50,  label: 'Polarizing',  color: '#E0A53B' },
  { min: 50, max: 65,  label: 'Respected',   color: '#9BA1A8' },
  { min: 65, max: 80,  label: 'Beloved',     color: '#3FB87F' },
  { min: 80, max: 101, label: 'Icon',        color: '#D9C77E' },
] as const;

export const STAT_LABELS: Record<string, string> = {
  talent: 'Talent',
  writing: 'Writing',
  vocalSkill: 'Vocal Skill',
  charisma: 'Charisma',
  authenticity: 'Authenticity',
  creativity: 'Creativity',
  discipline: 'Discipline',
  reputation: 'Reputation',
  fanLoyalty: 'Fan Loyalty',
  industryRespect: 'Industry Respect',
  mentalHealth: 'Mental Health',
  energy: 'Energy',
};

// How many events can fire per week based on fame
export const EVENTS_PER_WEEK: Record<number, number> = {
  0: 1,
  1: 1,
  2: 1,
  3: 2,
  4: 2,
  5: 2,
  6: 3,
  7: 3,
  8: 3,
  9: 4,
};

export const BASE_STATS = {
  talent: 40,
  writing: 35,
  vocalSkill: 35,
  charisma: 40,
  authenticity: 50,
  creativity: 40,
  discipline: 45,
  reputation: 50,
  fans: 0,
  fanLoyalty: 30,
  industryRespect: 10,
  mentalHealth: 80,
  energy: 100,
};

export const MAX_STAT = 100;
export const MIN_STAT = 0;

// ─── Age ──────────────────────────────────────────────────────────────────
// One tap of Advance is one week; the artist ages a year every
// WEEKS_PER_YEAR taps. 12 keeps a 20-year career near 240 taps (at a true 52
// it would be ~1,040). Tune after playtesting — age is derived from the week,
// so changing this re-times every save without a migration.
export const WEEKS_PER_YEAR = 12;
/** Youngest selectable start. Teen years are onboarding backstory only. */
export const MIN_START_AGE = 18;
/** Start age given to saves that predate age. */
export const DEFAULT_START_AGE = 21;

// Track quality floor/ceiling multipliers
export const TRACK_QUALITY_WEIGHTS = {
  talent: 0.30,
  writing: 0.25,
  vocalSkill: 0.20,
  creativity: 0.15,
  discipline: 0.10,
};
