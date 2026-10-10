import type { Contract, ContractTerms } from '../../types/industry';
import { useLabelStore } from '../../store/labelStore';
import { usePlayerStore } from '../../store/playerStore';
import { useCareerStore } from '../../store/careerStore';
import { getLabel } from '../../data/industry/labels';
import { uid } from '../../utils/id';
import { clamp } from '../../utils/random';

/**
 * Deals signed on the spot, from an event, no negotiation: the night a man
 * in a nice car offers more money than you have ever seen. The "predatory"
 * one owns your masters forever; the "fair" one doesn't.
 */

const PREDATORY_LABEL = 'goldline';
const FAIR_LABEL = 'basement-tapes';

function terms(kind: 'predatory' | 'fair', fans: number): ContractTerms {
  if (kind === 'predatory') {
    return {
      royaltyPct: 15,
      creativeControl: 25,
      durationWeeks: 36,
      releaseQuota: 4,
      ownsMasters: false,
      touringObligation: 60,
      advance: Math.round(clamp(15_000 + fans * 2, 15_000, 150_000) / 1000) * 1000,
    };
  }
  return {
    royaltyPct: 50,
    creativeControl: 75,
    durationWeeks: 36,
    releaseQuota: 3,
    ownsMasters: true,
    touringObligation: 30,
    advance: Math.round(clamp(5_000 + fans * 0.8, 5_000, 60_000) / 1000) * 1000,
  };
}

/** Sign it now. Null when the artist is already under contract. */
export function signDealNow(kind: 'predatory' | 'fair', week: number): Contract | null {
  const label = useLabelStore.getState();
  const player = usePlayerStore.getState().player;
  if (!player || label.contract) return null;
  const labelId = kind === 'predatory' ? PREDATORY_LABEL : FAIR_LABEL;
  const t = terms(kind, player.stats.fans);
  const contract: Contract = {
    id: uid('contract'),
    labelId,
    kind: 'recording',
    terms: t,
    signedWeek: week,
    expiresWeek: week + t.durationWeeks,
    releasesDelivered: 0,
    unrecoupedBalance: t.advance,
    trust: kind === 'predatory' ? 10 : 40,
    status: 'active',
  };
  label.signContract(contract);
  usePlayerStore.getState().addMoney(t.advance);
  const career = useCareerStore.getState();
  career.recordLedger({ week, amount: t.advance, kind: 'advance', note: 'Signing advance (recoupable)' });
  career.addHistory({
    id: uid('hist'),
    kind: 'contract',
    week,
    summary: `signed with ${getLabel(labelId)?.name ?? 'a label'} on the spot`,
    severity: 55,
    tags: ['label', 'contract', kind],
    artistId: null,
    resurfacedCount: 0,
    buried: false,
  });
  return contract;
}
