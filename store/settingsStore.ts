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
  /** Social apps and career moments ping the device's real notification shade. */
  phoneNotifications: boolean;
  /** The OS permission prompt has been shown once already. */
  notificationsAsked: boolean;
  /** The apps' everyday internet talks about real news (sports, tech, science...); off = the made-up world only. */
  realWorld: boolean;
}

interface SettingsActions {
  setAiCloudEnabled: (v: boolean) => void;
  setPhoneNotifications: (v: boolean) => void;
  setNotificationsAsked: (v: boolean) => void;
  setRealWorld: (v: boolean) => void;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

const DEFAULT: SettingsState = {
  aiCloudEnabled: AI_CLOUD_ENABLED_DEFAULT,
  phoneNotifications: true,
  notificationsAsked: false,
  realWorld: true,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT,

  setAiCloudEnabled(v) {
    set({ aiCloudEnabled: v });
    get().save();
  },

  setPhoneNotifications(v) {
    set({ phoneNotifications: v });
    get().save();
  },

  setNotificationsAsked(v) {
    set({ notificationsAsked: v });
    get().save();
  },

  setRealWorld(v) {
    set({ realWorld: v });
    get().save();
  },

  save() {
    const { aiCloudEnabled, phoneNotifications, notificationsAsked, realWorld } = get();
    saveData('settings', { aiCloudEnabled, phoneNotifications, notificationsAsked, realWorld });
  },

  load() {
    const saved = loadData<Partial<SettingsState>>('settings');
    if (saved) {
      set({
        aiCloudEnabled: saved.aiCloudEnabled ?? DEFAULT.aiCloudEnabled,
        phoneNotifications: saved.phoneNotifications ?? DEFAULT.phoneNotifications,
        notificationsAsked: saved.notificationsAsked ?? DEFAULT.notificationsAsked,
        realWorld: saved.realWorld ?? DEFAULT.realWorld,
      });
    }
  },

  reset() {
    set({ ...DEFAULT });
  },
}));

/** Non-React read for the AI router/gateway (outside the component tree). */
export function isAiCloudEnabled(): boolean {
  return useSettingsStore.getState().aiCloudEnabled;
}
