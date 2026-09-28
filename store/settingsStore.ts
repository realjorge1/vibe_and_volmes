import { create } from 'zustand';
import { saveData, loadData } from '../database/gameRepository';
import { AI_CLOUD_ENABLED_DEFAULT } from '../constants/aiConfig';

/**
 * Player-facing settings. The only Phase 4 knob today is the AI cloud
 * toggle: the game is fully playable with it OFF (deterministic local
 * generation), so it defaults off unless app config opted in.
 */
interface SettingsState {
  aiCloudEnabled: boolean;
}

interface SettingsActions {
  setAiCloudEnabled: (v: boolean) => void;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

const DEFAULT: SettingsState = {
  aiCloudEnabled: AI_CLOUD_ENABLED_DEFAULT,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT,

  setAiCloudEnabled(v) {
    set({ aiCloudEnabled: v });
    get().save();
  },

  save() {
    saveData('settings', { aiCloudEnabled: get().aiCloudEnabled });
  },

  load() {
    const saved = loadData<SettingsState>('settings');
    if (saved) set({ aiCloudEnabled: saved.aiCloudEnabled ?? DEFAULT.aiCloudEnabled });
  },

  reset() {
    set({ ...DEFAULT });
  },
}));

/** Non-React read for the AI router/gateway (outside the component tree). */
export function isAiCloudEnabled(): boolean {
  return useSettingsStore.getState().aiCloudEnabled;
}
