import { create } from 'zustand';
import type {
  AwardRecord,
  AwardsState,
  ChartBoard,
  ChartDay,
  FestivalBooking,
  FestivalRecord,
  NpcSong,
  WrappedCard,
  YearSnapshot,
} from '../types/calendar';
import { saveData, loadData } from '../database/gameRepository';

/**
 * The music year: this year's awards and festival, their histories, the
 * chart board (the artist's songs against the world's), the chart day
 * waiting to be revealed, and the year-in-review.
 */

interface CalendarState {
  awards: AwardsState | null;
  awardHistory: AwardRecord[];
  festival: FestivalBooking | null;
  festivalHistory: FestivalRecord[];
  chart: ChartBoard | null;
  npcSongs: NpcSong[];
  chartDay: ChartDay | null;
  yearStart: YearSnapshot | null;
  wrapped: WrappedCard | null;
  /** Every Wrapped the artist has had, newest first. */
  wrappedHistory: WrappedCard[];
}

interface CalendarActions {
  setAwards: (a: AwardsState | null) => void;
  patchAwards: (p: Partial<AwardsState>) => void;
  addAwardRecords: (records: AwardRecord[]) => void;
  setFestival: (f: FestivalBooking | null) => void;
  patchFestival: (p: Partial<FestivalBooking>) => void;
  addFestivalRecord: (r: FestivalRecord) => void;
  setChart: (board: ChartBoard, npcSongs: NpcSong[]) => void;
  setChartDay: (d: ChartDay | null) => void;
  markChartDaySeen: () => void;
  setYearStart: (y: YearSnapshot) => void;
  setWrapped: (w: WrappedCard | null) => void;
  markWrappedSeen: () => void;
  save: () => void;
  load: () => void;
  reset: () => void;
}

const DEFAULT_STATE: CalendarState = {
  awards: null,
  awardHistory: [],
  festival: null,
  festivalHistory: [],
  chart: null,
  npcSongs: [],
  chartDay: null,
  yearStart: null,
  wrapped: null,
  wrappedHistory: [],
};

const SAVE_KEY = 'calendar';

export const useCalendarStore = create<CalendarState & CalendarActions>((set, get) => ({
  ...DEFAULT_STATE,

  setAwards(awards) {
    set({ awards });
  },

  patchAwards(p) {
    const a = get().awards;
    if (a) set({ awards: { ...a, ...p } });
  },

  addAwardRecords(records) {
    set({ awardHistory: [...records, ...get().awardHistory].slice(0, 80) });
  },

  setFestival(festival) {
    set({ festival });
  },

  patchFestival(p) {
    const f = get().festival;
    if (f) set({ festival: { ...f, ...p } });
  },

  addFestivalRecord(r) {
    set({ festivalHistory: [r, ...get().festivalHistory].slice(0, 30) });
  },

  setChart(chart, npcSongs) {
    set({ chart, npcSongs });
  },

  setChartDay(chartDay) {
    set({ chartDay });
  },

  markChartDaySeen() {
    const d = get().chartDay;
    if (d) set({ chartDay: { ...d, seen: true } });
  },

  setYearStart(yearStart) {
    set({ yearStart });
  },

  setWrapped(wrapped) {
    set({
      wrapped,
      wrappedHistory: wrapped ? [wrapped, ...get().wrappedHistory].slice(0, 30) : get().wrappedHistory,
    });
  },

  markWrappedSeen() {
    const w = get().wrapped;
    if (!w) return;
    const seen = { ...w, seen: true };
    set({
      wrapped: seen,
      wrappedHistory: get().wrappedHistory.map((h) => (h.year === w.year ? seen : h)),
    });
  },

  save() {
    const s = get();
    saveData(SAVE_KEY, {
      awards: s.awards,
      awardHistory: s.awardHistory,
      festival: s.festival,
      festivalHistory: s.festivalHistory,
      chart: s.chart,
      npcSongs: s.npcSongs,
      chartDay: s.chartDay,
      yearStart: s.yearStart,
      wrapped: s.wrapped,
      wrappedHistory: s.wrappedHistory,
    });
  },

  load() {
    const saved = loadData<Partial<CalendarState>>(SAVE_KEY);
    if (saved) set({ ...DEFAULT_STATE, ...saved });
  },

  reset() {
    set({ ...DEFAULT_STATE });
  },
}));
