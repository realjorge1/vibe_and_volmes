// ─── Age & life stages ─────────────────────────────────────────────────────

export type LifeStageId = 'young' | 'prime' | 'established' | 'midlife' | 'elder';

export interface LifeStage {
  id: LifeStageId;
  label: string;
  minAge: number;
  /** Inclusive; the last stage runs forever. */
  maxAge: number;
  /** Written into the Deck the week the artist enters this stage. */
  arrival: string;
}

/** Starting age offered at onboarding, with its teen-years backstory. */
export interface StartingAgeOption {
  age: number;
  label: string;
  backstory: string;
}
