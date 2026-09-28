import type { AIResult } from '../../types/ai';
import { saveData, loadData } from '../../database/gameRepository';
import { AI_CONFIG } from '../../constants/aiConfig';

/**
 * Hard cost governor. Every cloud token is counted; when any cap is hit the
 * router silently pins to the local provider for the rest of the
 * session/run. There is NO path where AI spend can run away — the worst case
 * is the game quietly reverts to free deterministic generation.
 */

interface BudgetState {
  tokensLifetime: number;
  weeklyCalls: number;
  weeklyCallsWeek: number;
}

const SESSION = { tokens: 0 };
let state: BudgetState = {
  tokensLifetime: 0,
  weeklyCalls: 0,
  weeklyCallsWeek: 0,
};

export function loadBudget(): void {
  const saved = loadData<BudgetState>('ai-budget');
  if (saved) state = { ...state, ...saved };
}

function persist(): void {
  saveData('ai-budget', state);
}

/** Roll the per-week cloud-call counter when the game week advances. */
function syncWeek(week: number): void {
  if (state.weeklyCallsWeek !== week) {
    state.weeklyCallsWeek = week;
    state.weeklyCalls = 0;
  }
}

/** Gate checked by the router BEFORE a cloud call is attempted. */
export function canSpendCloud(week: number): boolean {
  syncWeek(week);
  if (SESSION.tokens >= AI_CONFIG.budget.maxTokensPerSession) return false;
  if (state.tokensLifetime >= AI_CONFIG.budget.maxTokensLifetime) return false;
  if (state.weeklyCalls >= AI_CONFIG.budget.maxCloudCallsPerWeek) return false;
  return true;
}

/** Record actual spend after a generation resolves. */
export function recordSpend(result: AIResult, week: number): void {
  if (result.provider !== 'cloud' || result.cached) return;
  syncWeek(week);
  const total = result.tokensIn + result.tokensOut;
  SESSION.tokens += total;
  state.tokensLifetime += total;
  state.weeklyCalls += 1;
  persist();
}

export function budgetSnapshot() {
  return {
    sessionTokens: SESSION.tokens,
    lifetimeTokens: state.tokensLifetime,
    weeklyCalls: state.weeklyCalls,
    caps: AI_CONFIG.budget,
  };
}
