import { create } from 'zustand';
import type { Contract, ContractOffer } from '../types/industry';
import { saveData, loadData } from '../database/gameRepository';
import { clamp } from '../utils/random';

interface LabelStoreState {
  contract: Contract | null;
  offers: ContractOffer[];
  pastContracts: Contract[];
}

interface LabelStoreActions {
  addOffer: (offer: ContractOffer) => void;
  removeOffer: (offerId: string) => void;
  signContract: (contract: Contract) => void;
  endContract: (status: Contract['status']) => void;
  recordRelease: () => void;
  adjustTrust: (delta: number) => void;
  recoup: (amount: number) => number; // returns amount actually recouped
  expireOffers: (week: number) => void;
  hasContract: () => boolean;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type LabelStore = LabelStoreState & LabelStoreActions;

const DEFAULT: LabelStoreState = {
  contract: null,
  offers: [],
  pastContracts: [],
};

export const useLabelStore = create<LabelStore>((set, get) => ({
  ...DEFAULT,

  addOffer(offer) {
    const { offers } = get();
    if (offers.some((o) => o.labelId === offer.labelId)) return;
    set({ offers: [...offers, offer] });
  },

  removeOffer(offerId) {
    set({ offers: get().offers.filter((o) => o.id !== offerId) });
  },

  signContract(contract) {
    set({ contract, offers: [] });
  },

  endContract(status) {
    const { contract, pastContracts } = get();
    if (!contract) return;
    set({
      contract: null,
      pastContracts: [...pastContracts, { ...contract, status }].slice(-10),
    });
  },

  recordRelease() {
    const { contract } = get();
    if (!contract) return;
    set({
      contract: {
        ...contract,
        releasesDelivered: contract.releasesDelivered + 1,
      },
    });
  },

  adjustTrust(delta) {
    const { contract } = get();
    if (!contract) return;
    set({
      contract: { ...contract, trust: clamp(contract.trust + delta, -100, 100) },
    });
  },

  recoup(amount) {
    const { contract } = get();
    if (!contract || contract.unrecoupedBalance <= 0) return 0;
    const taken = Math.min(amount, contract.unrecoupedBalance);
    set({
      contract: {
        ...contract,
        unrecoupedBalance: contract.unrecoupedBalance - taken,
      },
    });
    return taken;
  },

  expireOffers(week) {
    set({ offers: get().offers.filter((o) => o.expiresWeek > week) });
  },

  hasContract() {
    return get().contract !== null;
  },

  save() {
    const { contract, offers, pastContracts } = get();
    saveData('label', { contract, offers, pastContracts });
  },

  load() {
    const saved = loadData<LabelStoreState>('label');
    if (saved) {
      set({
        contract: saved.contract ?? null,
        offers: saved.offers ?? [],
        pastContracts: saved.pastContracts ?? [],
      });
    }
  },

  reset() {
    set({ ...DEFAULT });
  },
}));
