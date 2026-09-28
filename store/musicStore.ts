import { create } from 'zustand';
import type { Track, ChartEntry, ReleaseResult } from '../types/music';
import { saveData, loadData } from '../database/gameRepository';

interface MusicStoreState {
  discography: Track[];
  chartHistory: ChartEntry[];
  currentWeekStreams: number;
  totalStreams: number;
  lastRelease: ReleaseResult | null;
}

interface MusicStoreActions {
  addTrack: (track: Track) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  addChartEntry: (entry: ChartEntry) => void;
  setCurrentWeekStreams: (n: number) => void;
  setLastRelease: (result: ReleaseResult | null) => void;
  getLatestTrack: () => Track | null;
  getActiveReleases: () => Track[];
  hasReleasedTrack: () => boolean;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type MusicStore = MusicStoreState & MusicStoreActions;

export const useMusicStore = create<MusicStore>((set, get) => ({
  discography: [],
  chartHistory: [],
  currentWeekStreams: 0,
  totalStreams: 0,
  lastRelease: null,

  addTrack(track) {
    set((s) => ({ discography: [track, ...s.discography] }));
  },

  updateTrack(trackId, updates) {
    set((s) => ({
      discography: s.discography.map((t) =>
        t.id === trackId ? { ...t, ...updates } : t
      ),
    }));
  },

  addChartEntry(entry) {
    set((s) => ({
      chartHistory: [entry, ...s.chartHistory].slice(0, 500),
      currentWeekStreams: entry.streams,
      totalStreams: s.totalStreams + entry.streams,
    }));
  },

  setCurrentWeekStreams(n) {
    set({ currentWeekStreams: n });
  },

  setLastRelease(result) {
    set({ lastRelease: result });
  },

  getLatestTrack() {
    return get().discography[0] ?? null;
  },

  getActiveReleases() {
    return get().discography.filter(
      (t) => t.status === 'charting' || t.status === 'fading'
    );
  },

  hasReleasedTrack() {
    return get().discography.length > 0;
  },

  save() {
    const { discography, chartHistory, totalStreams } = get();
    saveData('music', { discography, chartHistory: chartHistory.slice(0, 100), totalStreams });
  },

  load() {
    const saved = loadData<{ discography: Track[]; chartHistory: ChartEntry[]; totalStreams: number }>('music');
    if (saved) {
      set({
        discography: saved.discography ?? [],
        chartHistory: saved.chartHistory ?? [],
        totalStreams: saved.totalStreams ?? 0,
      });
    }
  },

  reset() {
    set({ discography: [], chartHistory: [], currentWeekStreams: 0, totalStreams: 0, lastRelease: null });
  },
}));
