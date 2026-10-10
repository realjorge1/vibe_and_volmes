import type { MusicGenre, PlayerStats } from './player';

// ─── Record Label System ──────────────────────────────────────────────────

export type LabelTier = 'independent' | 'indie' | 'major';

export type DealKind = 'recording' | 'publishing' | 'management' | 'sponsorship';

export interface LabelProfile {
  id: string;
  name: string;
  tier: LabelTier;
  budget: number;             // marketing money they can throw behind a release
  marketingPower: number;     // 0-100: how much reach a push generates
  artistReputation: number;   // 0-100: how artists/industry view the label
  strictness: number;         // 0-100: release obligations / creative leash
  exploitation: number;       // 0-100: likelihood of manipulation/sabotage
  genreBias: MusicGenre[];    // genres they push hardest
  blurb: string;
}

export interface ContractTerms {
  royaltyPct: number;         // % of revenue the artist keeps
  creativeControl: number;    // 0-100: how much say the artist has
  durationWeeks: number;      // contract length
  releaseQuota: number;       // releases owed over the contract
  ownsMasters: boolean;       // does the artist keep ownership
  touringObligation: number;  // 0-100: forced touring intensity
  advance: number;            // upfront cash (recoupable)
}

export interface Contract {
  id: string;
  labelId: string;
  kind: DealKind;
  terms: ContractTerms;
  signedWeek: number;
  expiresWeek: number;
  releasesDelivered: number;
  unrecoupedBalance: number;  // advance still owed back from royalties
  trust: number;              // -100..100 label<->artist trust, drives manipulation
  status: 'active' | 'fulfilled' | 'breached' | 'expired' | 'dropped';
}

export interface ContractOffer {
  id: string;
  labelId: string;
  kind: DealKind;
  terms: ContractTerms;
  createdWeek: number;
  expiresWeek: number;        // offer rescinded if not signed
  rationale: string;          // why the label wants the artist (flavor)
}

// ─── Touring System ───────────────────────────────────────────────────────

export type VenueScale =
  | 'open-mic'
  | 'club'
  | 'theater'
  | 'arena'
  | 'stadium'
  | 'festival';

export interface Venue {
  id: string;
  name: string;
  scale: VenueScale;
  capacity: number;
  minFameLevel: number;       // gating by fame
  baseGuarantee: number;      // flat fee regardless of sales
  prestige: number;           // 0-100: rep/industry impact of playing here
}

export type TourStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export interface TourStop {
  venueId: string;
  city: string;
  week: number;               // absolute game week this stop happens
  played: boolean;
  ticketsSold: number;
  capacity: number;
  revenue: number;
  performanceScore: number;   // 0-100 quality of the night
  incidentId: string | null;  // tour incident that fired here, if any
  /** Set when the artist played the show themselves (the live show screen). */
  liveScore?: number | null;
}

export interface Tour {
  id: string;
  name: string;
  scale: VenueScale;
  status: TourStatus;
  stops: TourStop[];
  startWeek: number;
  currentStopIndex: number;
  productionCost: number;     // upfront staging cost
  grossRevenue: number;
  hypeAtBooking: number;      // fame snapshot when booked (sets demand)
}

// ─── Interview / Media System ─────────────────────────────────────────────

export type MediaOutletKind =
  | 'podcast'
  | 'radio'
  | 'livestream'
  | 'award-show'
  | 'press-conference';

export type MediaTone = 'softball' | 'neutral' | 'probing' | 'hostile' | 'gotcha';

export interface InterviewQuestion {
  id: string;
  tone: MediaTone;
  prompt: string;
  topicTags: string[];        // e.g. 'rivalry','scandal','relationship'
  answers: InterviewAnswer[];
}

export interface InterviewAnswer {
  id: string;
  text: string;
  // perception deltas
  reputationDelta: number;
  controversyRisk: number;    // 0-1 chance this answer spawns a controversy
  charismaInfluence: number;  // how much charisma improves the real outcome
  industryRespectDelta: number;
  fanPerceptionDelta: number;
  spawnsControversyId?: string;
  relationshipTargets?: string[]; // rival/ally ids this answer name-drops
  flavor: string;
}

export interface MediaHeadlineTemplate {
  id: string;
  kind: 'positive' | 'negative' | 'neutral' | 'misleading' | 'viral';
  template: string;           // "{artist} {verb} during {outlet} interview"
  weight: number;
}

export interface InterviewSession {
  id: string;
  outletKind: MediaOutletKind;
  outletName: string;
  week: number;
  questionIds: string[];
  answeredWith: Record<string, string>; // questionId -> answerId
  resolvedHeadline: string | null;
  netReputation: number;
  spawnedControversyId: string | null;
}

// ─── PR & Controversy System ──────────────────────────────────────────────

export type ControversySeverity = 'minor' | 'moderate' | 'severe' | 'career-ending';

export type ControversyKind =
  | 'cheating'
  | 'leaked-audio'
  | 'offensive-post'
  | 'violent-incident'
  | 'fan-harassment'
  | 'fake-rumor'
  | 'lawsuit'
  | 'addiction'
  | 'ghostwriting'
  | 'industry-plant';

export type PRStrategyId =
  | 'ignore'
  | 'deny'
  | 'apology-sincere'
  | 'apology-forced'
  | 'deflect'
  | 'counterattack'
  | 'lay-low'
  | 'pr-team-spin';

export interface ControversyDefinition {
  id: string;
  kind: ControversyKind;
  severity: ControversySeverity;
  headline: string;
  description: string;
  baseHeat: number;           // 0-100 initial public outrage
  decayPerWeek: number;       // natural cool-off
  truthMatters: boolean;      // does it matter if the player is "guilty"
  tags: string[];
}

export interface ActiveControversy {
  instanceId: string;
  defId: string;
  kind: ControversyKind;
  severity: ControversySeverity;
  startedWeek: number;
  heat: number;               // current outrage 0-100
  guilty: boolean;            // did it actually happen (drives strategy success)
  strategyApplied: PRStrategyId | null;
  resolved: boolean;
  resolutionWeek: number | null;
  outcome: 'survived' | 'damaged' | 'escalated' | 'cancelled' | null;
  instigatorArtistId: string | null; // rival who started it, if any
}

export interface PRStrategy {
  id: PRStrategyId;
  label: string;
  description: string;
  cost: number;
  // chance the public buys it, scaled by severity/guilt/charisma
  baseSuccess: number;
  successIfInnocent: number;
  successIfGuilty: number;
  backfireHeatGain: number;   // heat added if it backfires
  requiresPRTeam: boolean;
}

// ─── Mental Health & Pressure System ──────────────────────────────────────

export interface MentalState {
  burnout: number;            // 0-100: accumulated exhaustion
  anxiety: number;            // 0-100
  paranoia: number;           // 0-100: distrust, fed by scandals/rivalries
  depression: number;         // 0-100
  addictionRisk: number;      // 0-100
  isolation: number;          // 0-100: weakened relationships
  inTreatment: boolean;
  lastCrisisWeek: number | null;
}

// ─── Career Arc System ────────────────────────────────────────────────────

export type CareerPhase =
  | 'come-up'
  | 'breakthrough'
  | 'peak'
  | 'plateau'
  | 'decline'
  | 'comeback'
  | 'legacy';

export interface CareerArcState {
  phase: CareerPhase;
  phaseStartedWeek: number;
  momentum: number;           // -100..100 trailing trajectory
  peakFans: number;           // historical high-water mark
  peakWeek: number;
  comebackCount: number;
  weeksSincePeak: number;
}

// ─── Economy & Wealth System ──────────────────────────────────────────────

export type IncomeKind =
  | 'streaming'
  | 'touring'
  | 'sponsorship'
  | 'advance'
  | 'merch'
  | 'feature'
  | 'label'
  | 'venture'
  | 'shows';

export type ExpenseKind =
  | 'lifestyle'
  | 'taxes'
  | 'production'
  | 'pr'
  | 'legal'
  | 'label-recoup'
  | 'tour-cost'
  | 'upkeep'
  | 'masters'
  | 'signing'
  | 'fines';

export interface LedgerEntry {
  week: number;
  amount: number;             // +income / -expense
  kind: IncomeKind | ExpenseKind;
  note: string;
}

export interface EconomyState {
  netWorth: number;
  debt: number;
  lifestyleTier: number;      // 0-5: drives recurring burn + fan perception
  weeklyBurn: number;         // recurring lifestyle cost
  taxRatePct: number;
  ledger: LedgerEntry[];      // capped rolling history
  lifetimeEarnings: number;
}

// ─── Dynamic History System ───────────────────────────────────────────────

export type HistoryKind =
  | 'scandal'
  | 'feud'
  | 'breakup'
  | 'flop'
  | 'triumph'
  | 'betrayal'
  | 'contract'
  | 'award'
  | 'statement'
  // Drama layer: moments the Chronicle keeps.
  | 'charity'
  | 'romance'
  | 'viral'
  | 'embarrassment'
  // The bigger story: courtrooms, dreams, businesses.
  | 'legal'
  | 'dream'
  | 'business';

export interface HistoryRecord {
  id: string;
  kind: HistoryKind;
  week: number;
  summary: string;            // human-readable, used by social/resurface
  severity: number;           // 0-100 how big a deal
  tags: string[];             // for matching when resurfacing
  artistId: string | null;    // related rival/ally
  resurfacedCount: number;
  buried: boolean;            // player actively suppressed it
}

// ─── Cross-System Influence ───────────────────────────────────────────────

/**
 * The bus through which Phase 3 systems modify each other and the
 * Phase 1 player stats every simulated week. Engines push deltas,
 * the influence graph resolves them, the tick applies them once.
 */
export interface InfluenceBundle {
  statDeltas: Partial<Record<keyof PlayerStats, number>>;
  fansDelta: number;
  moneyDelta: number;
  mentalDeltas: Partial<MentalState>;
  addTags: string[];
  removeTags: string[];
  socialBeats: string[];      // strings the social feed can dramatize
  historyRecords: Omit<HistoryRecord, 'id' | 'resurfacedCount' | 'buried'>[];
  notes: string[];            // weekly-summary lines for the player
}
