import type { HistoryRecord, InfluenceBundle } from '../../types/industry';
import { useCareerStore } from '../../store/careerStore';
import { addStat, addMental, note, beat } from '../simulation/influenceGraph';
import { uid } from '../../utils/id';
import { pick, chance } from '../../utils/random';

/**
 * Commit the history records other engines queued on the bundle. Centralized
 * so every system records the past the same way and ids stay unique.
 */
export function commitHistory(bundle: InfluenceBundle, week: number): void {
  const store = useCareerStore.getState();
  for (const r of bundle.historyRecords) {
    const record: HistoryRecord = {
      ...r,
      id: uid('hist'),
      week: r.week || week,
      resurfacedCount: 0,
      buried: false,
    };
    store.addHistory(record);
  }
  bundle.historyRecords = [];
}

/**
 * The internet remembers. Each week there is a chance an old, significant,
 * un-buried scandal/feud/betrayal resurfaces — re-applying a fraction of
 * its sting and feeding the social feed. This is the system that makes
 * past decisions reappear years later.
 */
export function maybeResurface(bundle: InfluenceBundle, week: number): void {
  const store = useCareerStore.getState();
  const candidates = store.history.filter(
    (h) =>
      !h.buried &&
      h.severity >= 55 &&
      week - h.week >= 8 &&
      h.resurfacedCount < 3 &&
      ['scandal', 'feud', 'betrayal', 'flop', 'breakup'].includes(h.kind)
  );
  if (candidates.length === 0) return;

  // Older + bigger + less-resurfaced = more likely to come back around.
  const weighted = candidates.map((h) => ({
    record: h,
    weight:
      h.severity +
      Math.min(40, week - h.week) -
      h.resurfacedCount * 20,
  }));
  const total = weighted.reduce((s, w) => s + Math.max(1, w.weight), 0);
  const baseChance = Math.min(0.25, 0.05 + total / 4000);
  if (!chance(baseChance)) return;

  const chosen = pick(weighted).record;
  store.markResurfaced(chosen.id);

  const sting = Math.round(chosen.severity / 12);
  addStat(bundle, 'reputation', -sting);
  addMental(bundle, 'paranoia', sting);
  addMental(bundle, 'anxiety', Math.round(sting / 2));
  beat(bundle, 'history-resurface');
  note(
    bundle,
    `An old story resurfaced: you ${chosen.summary}. The internet never forgets.`
  );

  bundle.addTags.push('past-resurfaced');
}

/** Player actively buries a record (used by PR / event consequences). */
export function buryRecord(id: string): void {
  useCareerStore.getState().buryHistory(id);
}
