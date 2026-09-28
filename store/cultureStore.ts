import { create } from 'zustand';
import type {
  CultureState,
  GenreClimate,
  GenreTrend,
} from '../types/culture';
import type { MusicGenre } from '../types/player';
import { ERAS } from '../data/culture/eras';
import { GENRES } from '../data/genres';
import { saveData, loadData } from '../database/gameRepository';
import { clamp } from '../utils/random';

interface CultureStoreActions {
  setState: (partial: Partial<CultureState>) => void;
  setGenreClimate: (climate: GenreClimate[]) => void;
  genreHeat: (genre: MusicGenre) => number;
  genreTrend: (genre: MusicGenre) => GenreTrend;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type CultureStore = CultureState & CultureStoreActions;

function defaultClimate(): GenreClimate[] {
  // Seed every genre mid-warm with a little spread so the world starts alive.
  return GENRES.map((g, i) => ({
    genre: g.id,
    heat: clamp(45 + ((i * 7) % 25), 20, 80),
    trend: (i % 3 === 0 ? 'rising' : i % 3 === 1 ? 'hot' : 'cooling') as GenreTrend,
    weeksInTrend: 0,
  }));
}

const DEFAULT: CultureState = {
  eraId: ERAS[0].id,
  eraIndex: 0,
  eraStartedWeek: 1,
  weeksInEra: 0,
  genreClimate: defaultClimate(),
  eraHistory: [{ eraId: ERAS[0].id, startedWeek: 1, endedWeek: null }],
};

export const useCultureStore = create<CultureStore>((set, get) => ({
  ...DEFAULT,

  setState(partial) {
    set({ ...get(), ...partial });
  },

  setGenreClimate(genreClimate) {
    set({ genreClimate });
  },

  genreHeat(genre) {
    return get().genreClimate.find((c) => c.genre === genre)?.heat ?? 50;
  },

  genreTrend(genre) {
    return get().genreClimate.find((c) => c.genre === genre)?.trend ?? 'hot';
  },

  save() {
    const { eraId, eraIndex, eraStartedWeek, weeksInEra, genreClimate, eraHistory } =
      get();
    saveData('culture', {
      eraId,
      eraIndex,
      eraStartedWeek,
      weeksInEra,
      genreClimate,
      eraHistory,
    });
  },

  load() {
    const saved = loadData<CultureState>('culture');
    if (saved) {
      set({
        eraId: saved.eraId ?? DEFAULT.eraId,
        eraIndex: saved.eraIndex ?? 0,
        eraStartedWeek: saved.eraStartedWeek ?? 1,
        weeksInEra: saved.weeksInEra ?? 0,
        genreClimate:
          saved.genreClimate?.length ? saved.genreClimate : defaultClimate(),
        eraHistory: saved.eraHistory ?? DEFAULT.eraHistory,
      });
    }
  },

  reset() {
    set({
      eraId: DEFAULT.eraId,
      eraIndex: 0,
      eraStartedWeek: 1,
      weeksInEra: 0,
      genreClimate: defaultClimate(),
      eraHistory: [{ eraId: ERAS[0].id, startedWeek: 1, endedWeek: null }],
    });
  },
}));
