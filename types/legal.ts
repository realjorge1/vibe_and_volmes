/**
 * THE LAW. Some nights end in handcuffs. A charge becomes a case, the case
 * gets a lawyer (or a plea), the court decides, and sometimes the artist
 * spends months inside — writing, fighting, plotting an escape, while the
 * internet decides whether to free them.
 */

export type ChargeSeverity = 'minor' | 'serious' | 'major';

export interface ChargeDef {
  id: string;
  label: string;
  /** One line for the Deck. */
  blurb: string;
  severity: ChargeSeverity;
  /** 0..1: how strong the case is before lawyers. */
  evidence: number;
  /** Sentence range in weeks on conviction. */
  sentence: [number, number];
  fine: number;
  /** News headline. {playerName} is filled. */
  headline: string;
}

export type LawyerTier = 'public' | 'solid' | 'elite' | 'plea';

export type CaseStage = 'charged' | 'trial' | 'jailed' | 'fugitive';

export interface LegalCase {
  id: string;
  chargeId: string;
  chargedWeek: number;
  stage: CaseStage;
  lawyer: LawyerTier | null;
  verdictWeek: number | null;
  sentenceWeeks: number;
  jailStartWeek: number | null;
  releaseWeek: number | null;
  /** Fugitive: the week the manhunt started. */
  escapedWeek: number | null;
  escapes: number;
}

export type CaseOutcome = 'acquitted' | 'probation' | 'served' | 'escaped';

export interface LegalRecord {
  chargeId: string;
  label: string;
  week: number;
  outcome: CaseOutcome;
  weeks: number;
}
