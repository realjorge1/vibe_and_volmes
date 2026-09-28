import { create } from 'zustand';
import type { Tour, TourStop } from '../types/industry';
import { saveData, loadData } from '../database/gameRepository';

interface TourStoreState {
  activeTour: Tour | null;
  tourHistory: Tour[];
}

interface TourStoreActions {
  startTour: (tour: Tour) => void;
  applyStopResult: (index: number, result: Partial<TourStop>) => void;
  advanceStop: () => void;
  completeTour: () => void;
  cancelTour: () => void;
  isOnTour: () => boolean;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type TourStore = TourStoreState & TourStoreActions;

const DEFAULT: TourStoreState = { activeTour: null, tourHistory: [] };

export const useTourStore = create<TourStore>((set, get) => ({
  ...DEFAULT,

  startTour(tour) {
    set({ activeTour: tour });
  },

  applyStopResult(index, result) {
    const { activeTour } = get();
    if (!activeTour) return;
    const stops = activeTour.stops.map((s, i) =>
      i === index ? { ...s, ...result } : s
    );
    const grossRevenue = stops.reduce((sum, s) => sum + s.revenue, 0);
    set({ activeTour: { ...activeTour, stops, grossRevenue } });
  },

  advanceStop() {
    const { activeTour } = get();
    if (!activeTour) return;
    set({
      activeTour: {
        ...activeTour,
        currentStopIndex: activeTour.currentStopIndex + 1,
      },
    });
  },

  completeTour() {
    const { activeTour, tourHistory } = get();
    if (!activeTour) return;
    set({
      activeTour: null,
      tourHistory: [
        ...tourHistory,
        { ...activeTour, status: 'completed' as const },
      ].slice(-8),
    });
  },

  cancelTour() {
    const { activeTour, tourHistory } = get();
    if (!activeTour) return;
    set({
      activeTour: null,
      tourHistory: [
        ...tourHistory,
        { ...activeTour, status: 'cancelled' as const },
      ].slice(-8),
    });
  },

  isOnTour() {
    return get().activeTour?.status === 'active';
  },

  save() {
    const { activeTour, tourHistory } = get();
    saveData('tour', { activeTour, tourHistory });
  },

  load() {
    const saved = loadData<TourStoreState>('tour');
    if (saved) {
      set({
        activeTour: saved.activeTour ?? null,
        tourHistory: saved.tourHistory ?? [],
      });
    }
  },

  reset() {
    set({ ...DEFAULT });
  },
}));
