import type { Contract, ContractOffer, DealKind } from '../../types/industry';
import { LABELS } from '../../data/industry/labels';
import { buildContractTerms } from '../../data/industry/contractTemplates';
import { useLabelStore } from '../../store/labelStore';
import { usePlayerStore } from '../../store/playerStore';
import { useCareerStore } from '../../store/careerStore';
import type { InfluenceBundle } from '../../types/industry';
import { addStat, addMental, note, beat } from '../simulation/influenceGraph';
import { uid } from '../../utils/id';
import { pick, chance, clamp } from '../../utils/random';

/** Artist negotiating leverage 0..1 from fame + industry respect. */
function leverage(): number {
  const p = usePlayerStore.getState().player;
  if (!p) return 0;
  const fameScore = Math.min(1, Math.log10(p.stats.fans + 10) / 8);
  const respect = p.stats.industryRespect / 100;
  return clamp(fameScore * 0.6 + respect * 0.4, 0, 1);
}

export function generateOffer(
  tier: 'independent' | 'indie' | 'major',
  week: number,
  kind: DealKind = 'recording'
): ContractOffer | null {
  const candidates = LABELS.filter((l) => l.tier === tier && l.budget > 0);
  if (candidates.length === 0) return null;
  const label = pick(candidates);
  const terms = buildContractTerms(label, kind, leverage());
  return {
    id: uid('offer'),
    labelId: label.id,
    kind,
    terms,
    createdWeek: week,
    expiresWeek: week + 3,
    rationale:
      label.exploitation > 60
        ? 'They see a profitable asset. The enthusiasm is transactional.'
        : 'They genuinely believe in the music — for now.',
  };
}

export function signOffer(offerId: string, week: number): boolean {
  const labelStore = useLabelStore.getState();
  const offer = labelStore.offers.find((o) => o.id === offerId);
  if (!offer || labelStore.contract) return false;

  const contract: Contract = {
    id: uid('contract'),
    labelId: offer.labelId,
    kind: offer.kind,
    terms: offer.terms,
    signedWeek: week,
    expiresWeek: week + offer.terms.durationWeeks,
    releasesDelivered: 0,
    unrecoupedBalance: offer.terms.advance,
    trust: 30,
    status: 'active',
  };
  labelStore.signContract(contract);

  if (offer.terms.advance > 0) {
    usePlayerStore.getState().addMoney(offer.terms.advance);
    useCareerStore.getState().recordLedger({
      week,
      amount: offer.terms.advance,
      kind: 'advance',
      note: 'Signing advance (recoupable)',
    });
  }
  useCareerStore.getState().addHistory({
    id: uid('hist'),
    kind: 'contract',
    week,
    summary: `signed a ${offer.kind} deal`,
    severity: 50,
    tags: ['label', 'contract', offer.kind],
    artistId: null,
    resurfacedCount: 0,
    buried: false,
  });
  return true;
}

/**
 * Weekly label behaviour. This is where "success has a cost" lives:
 * recoupment, release-quota pressure, manipulation, and sabotage scale
 * with the label's exploitation and the artist<->label trust.
 */
export function weeklyLabel(bundle: InfluenceBundle, week: number): void {
  const labelStore = useLabelStore.getState();
  labelStore.expireOffers(week);

  const contract = labelStore.contract;
  if (!contract) return;

  const label = LABELS.find((l) => l.id === contract.labelId);
  if (!label) return;

  // Contract end / breach handling.
  if (week >= contract.expiresWeek) {
    const fulfilled = contract.releasesDelivered >= contract.terms.releaseQuota;
    labelStore.endContract(fulfilled ? 'fulfilled' : 'breached');
    note(
      bundle,
      fulfilled
        ? `Your deal with ${label.name} ended. You delivered. You are free.`
        : `${label.name} dropped you for missing your release obligations.`
    );
    if (!fulfilled) {
      addStat(bundle, 'industryRespect', -8);
      addMental(bundle, 'anxiety', 10);
    }
    bundle.historyRecords.push({
      kind: 'contract',
      week,
      summary: fulfilled
        ? `completed their contract with ${label.name}`
        : `was dropped by ${label.name}`,
      severity: fulfilled ? 40 : 60,
      tags: ['label', 'contract'],
      artistId: null,
    });
    return;
  }

  // Recoupment: the label skims the player's money toward the advance.
  const player = usePlayerStore.getState().player;
  if (player && contract.unrecoupedBalance > 0 && player.money > 0) {
    const skim = Math.round(
      Math.min(player.money * 0.15, contract.unrecoupedBalance)
    );
    if (skim > 0) {
      const taken = labelStore.recoup(skim);
      bundle.moneyDelta -= taken;
      useCareerStore.getState().recordLedger({
        week,
        amount: -taken,
        kind: 'label-recoup',
        note: `${label.name} recouped advance`,
      });
    }
  }

  // Release-quota pressure as the clock runs down.
  const weeksLeft = contract.expiresWeek - week;
  const owed = contract.terms.releaseQuota - contract.releasesDelivered;
  if (owed > 0 && weeksLeft <= owed * 10) {
    labelStore.adjustTrust(-3);
    addMental(bundle, 'burnout', 4);
    addMental(bundle, 'anxiety', 5);
    note(
      bundle,
      `${label.name} is pressuring you to deliver — ${owed} release(s) still owed.`
    );
  }

  // Manipulation: low creative-control + high exploitation labels force
  // commercial trends. Commercial bump, authenticity/creativity cost.
  const exploit = label.exploitation / 100;
  if (
    contract.terms.creativeControl < 45 &&
    chance(0.12 + exploit * 0.15)
  ) {
    addStat(bundle, 'authenticity', -3);
    addStat(bundle, 'creativity', -2);
    bundle.fansDelta += Math.round((player?.stats.fans ?? 0) * 0.01);
    beat(bundle, 'label-forced-trend');
    note(bundle, `${label.name} pushed you onto a trend you did not choose.`);
  }

  // Sabotage: only when trust has collapsed and the label is exploitative.
  if (contract.trust < -30 && exploit > 0.6 && chance(0.1)) {
    addStat(bundle, 'reputation', -5);
    addMental(bundle, 'paranoia', 10);
    beat(bundle, 'label-sabotage');
    note(
      bundle,
      `You are convinced ${label.name} is quietly burying your work.`
    );
    bundle.historyRecords.push({
      kind: 'betrayal',
      week,
      summary: `fell out with ${label.name} amid sabotage suspicions`,
      severity: 65,
      tags: ['label', 'betrayal'],
      artistId: null,
    });
  }
}
