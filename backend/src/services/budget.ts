import { env } from '../env';

/**
 * Lightweight server-side spend guardrail (defense in depth — the client has
 * its own budget gate in app ai/budget/ledger.ts). A simple in-process daily
 * token counter that resets at UTC midnight. If a client is modified to ignore
 * its caps, this still bounds upstream spend. In-memory is fine: the worst case
 * after a restart is the daily window resets early. Swap for a shared store if
 * you run multiple instances.
 */

let day = utcDay();
let tokensToday = 0;

function utcDay(): number {
  return Math.floor(Date.now() / 86_400_000);
}

function roll(): void {
  const today = utcDay();
  if (today !== day) {
    day = today;
    tokensToday = 0;
  }
}

/** Checked BEFORE an upstream call. */
export function canSpend(): boolean {
  roll();
  return tokensToday < env.ai.maxTokensPerDay;
}

/** Recorded AFTER a generation resolves. */
export function record(tokens: number): void {
  roll();
  tokensToday += Math.max(0, tokens);
}

export function snapshot() {
  roll();
  return { tokensToday, cap: env.ai.maxTokensPerDay };
}
