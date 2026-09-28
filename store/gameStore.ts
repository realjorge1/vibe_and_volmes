import { create } from 'zustand';
import type { GameEvent, EventHistoryEntry, EventCategory } from '../types/events';
import { saveData, loadData, logEvent } from '../database/gameRepository';

interface GameStoreState {
  week: number;
  phase: 'onboarding' | 'playing';
  playerTags: string[];
  activeEvents: GameEvent[];       // events pending player decision this week
  eventHistory: string[];          // IDs of events that have fired
  eventCooldowns: Record<string, number>; // eventId → week it last fired
  historyLog: EventHistoryEntry[]; // full readable history (last 100)
  pendingEventIndex: number;       // which active event the player is deciding on
  lastWeekSummary: EventHistoryEntry[];
}

interface GameStoreActions {
  startGame: () => void;
  setWeek: (week: number) => void;
  advanceWeek: () => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  hasTag: (tag: string) => boolean;
  setActiveEvents: (events: GameEvent[]) => void;
  resolveCurrentEvent: (choiceId: string, entry: EventHistoryEntry) => void;
  nextPendingEvent: () => GameEvent | null;
  addWeekSummaryNotes: (notes: string[], category?: EventCategory) => void;
  saveGameState: () => void;
  loadGameState: () => void;
  reset: () => void;
}

type GameStore = GameStoreState & GameStoreActions;

const DEFAULT_STATE: GameStoreState = {
  week: 1,
  phase: 'onboarding',
  playerTags: [],
  activeEvents: [],
  eventHistory: [],
  eventCooldowns: {},
  historyLog: [],
  pendingEventIndex: 0,
  lastWeekSummary: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...DEFAULT_STATE,

  startGame() {
    set({ phase: 'playing' });
  },

  setWeek(week) {
    set({ week });
  },

  advanceWeek() {
    const { week } = get();
    set({ week: week + 1, activeEvents: [], pendingEventIndex: 0, lastWeekSummary: [] });
  },

  addTag(tag) {
    const { playerTags } = get();
    if (!playerTags.includes(tag)) {
      set({ playerTags: [...playerTags, tag] });
    }
  },

  removeTag(tag) {
    set({ playerTags: get().playerTags.filter((t) => t !== tag) });
  },

  hasTag(tag) {
    return get().playerTags.includes(tag);
  },

  setActiveEvents(events) {
    set({ activeEvents: events, pendingEventIndex: 0 });
  },

  resolveCurrentEvent(choiceId, entry) {
    const { activeEvents, pendingEventIndex, eventHistory, eventCooldowns, historyLog, week } = get();
    const current = activeEvents[pendingEventIndex];
    if (!current) return;

    const newHistory = eventHistory.includes(current.id)
      ? eventHistory
      : [...eventHistory, current.id];

    const newCooldowns = { ...eventCooldowns, [current.id]: week };
    const newLog = [entry, ...historyLog].slice(0, 100);

    set({
      eventHistory: newHistory,
      eventCooldowns: newCooldowns,
      historyLog: newLog,
      lastWeekSummary: [...get().lastWeekSummary, entry],
      pendingEventIndex: pendingEventIndex + 1,
    });

    logEvent({
      eventId: current.id,
      choiceId,
      category: current.category,
      flavorText: entry.flavorText,
      week,
    });
  },

  nextPendingEvent() {
    const { activeEvents, pendingEventIndex } = get();
    return activeEvents[pendingEventIndex] ?? null;
  },

  addWeekSummaryNotes(notes, category = 'career') {
    if (notes.length === 0) return;
    const { week, lastWeekSummary, historyLog } = get();
    const entries: EventHistoryEntry[] = notes.map((text) => ({
      eventId: 'phase3-sim',
      choiceId: 'sim',
      week,
      flavorText: text,
      category,
    }));
    set({
      lastWeekSummary: [...lastWeekSummary, ...entries],
      historyLog: [...entries, ...historyLog].slice(0, 100),
    });
  },

  saveGameState() {
    const s = get();
    saveData('game', {
      week: s.week,
      phase: s.phase,
      playerTags: s.playerTags,
      eventHistory: s.eventHistory,
      eventCooldowns: s.eventCooldowns,
      historyLog: s.historyLog,
    });
  },

  loadGameState() {
    const saved = loadData<Partial<GameStoreState>>('game');
    if (saved) {
      set({
        week: saved.week ?? 1,
        phase: saved.phase ?? 'playing',
        playerTags: saved.playerTags ?? [],
        eventHistory: saved.eventHistory ?? [],
        eventCooldowns: saved.eventCooldowns ?? {},
        historyLog: saved.historyLog ?? [],
      });
    }
  },

  reset() {
    set({ ...DEFAULT_STATE });
  },
}));
