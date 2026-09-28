import type { AIProvider } from '../../types/ai';
import { localProvider } from './local';
import { cloudProvider } from './openai';
import { BACKEND_URL } from '../../constants/aiConfig';
import { isAiCloudEnabled } from '../../store/settingsStore';
import { canSpendCloud } from '../budget/ledger';

/**
 * Decides which provider serves a request. The local provider is the
 * DEFAULT; cloud is only chosen when every gate passes. Any uncertainty
 * (no backend URL, disabled, unhealthy, over budget) → local. This is what
 * makes the game offline-safe and cost-safe by construction.
 */
export async function pickProvider(week: number): Promise<AIProvider> {
  if (!isAiCloudEnabled()) return localProvider;
  if (!BACKEND_URL) return localProvider;
  if (!canSpendCloud(week)) return localProvider;
  try {
    if (await cloudProvider.isHealthy()) return cloudProvider;
  } catch {
    /* fall through */
  }
  return localProvider;
}

export { localProvider };
