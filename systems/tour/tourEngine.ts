import type { Tour, TourStop, VenueScale, InfluenceBundle } from '../../types/industry';
import { venuesForScale, TOUR_SCALES, getVenue } from '../../data/tour/venues';
import { TOUR_INCIDENTS } from '../../data/tour/tourIncidents';
import { useTourStore } from '../../store/tourStore';
import { usePlayerStore } from '../../store/playerStore';
import { useCareerStore } from '../../store/careerStore';
import { addStat, addMental, note, beat } from '../simulation/influenceGraph';
import { uid } from '../../utils/id';
import {
  pick,
  randInt,
  clamp,
  chance,
  weightedPick,
  gaussRand,
} from '../../utils/random';

const CITIES = [
  'Atlanta', 'Los Angeles', 'New York', 'Chicago', 'Houston',
  'Miami', 'Toronto', 'London', 'Berlin', 'Tokyo',
];

export function canTour(scale: VenueScale, fameLevel: number): boolean {
  const venues = venuesForScale(scale);
  return venues.length > 0 && venues.some((v) => fameLevel >= v.minFameLevel);
}

/** Build (but do not start) a tour the player can confirm in the UI. */
export function planTour(scale: VenueScale, startWeek: number): Tour | null {
  const venues = venuesForScale(scale);
  if (venues.length === 0) return null;
  const scaleDef = TOUR_SCALES.find((s) => s.scale === scale);
  const stopCount = scaleDef?.stops ?? 4;

  const player = usePlayerStore.getState().player;
  const hype = player?.stats.fans ?? 0;

  const stops: TourStop[] = [];
  for (let i = 0; i < stopCount; i++) {
    const venue = pick(venues);
    stops.push({
      venueId: venue.id,
      city: pick(CITIES),
      week: startWeek + i + 1,
      played: false,
      ticketsSold: 0,
      capacity: venue.capacity,
      revenue: 0,
      performanceScore: 0,
      incidentId: null,
    });
  }

  const productionCost = Math.round(
    stops.reduce((sum, s) => sum + s.capacity, 0) * 4
  );

  return {
    id: uid('tour'),
    name: `${scaleDef?.label ?? 'Tour'} ${new Date().getFullYear()}`,
    scale,
    status: 'planning',
    stops,
    startWeek,
    currentStopIndex: 0,
    productionCost,
    grossRevenue: 0,
    hypeAtBooking: hype,
  };
}

export function confirmTour(tour: Tour): void {
  useTourStore.getState().startTour({ ...tour, status: 'active' });
  usePlayerStore.getState().addMoney(-tour.productionCost);
  useCareerStore.getState().recordLedger({
    week: tour.startWeek,
    amount: -tour.productionCost,
    kind: 'tour-cost',
    note: `${tour.name} production`,
  });
}

/**
 * Weekly tour progression. Plays every stop whose week has arrived,
 * computing attendance, revenue, performance quality (gated by energy +
 * mental state) and rolling a dramatic incident. All player-facing
 * effects flow through the influence bundle.
 */
export function weeklyTour(bundle: InfluenceBundle, week: number): void {
  const tourStore = useTourStore.getState();
  const tour = tourStore.activeTour;
  if (!tour || tour.status !== 'active') return;

  const player = usePlayerStore.getState().player;
  const mental = useCareerStore.getState().mental;
  if (!player) return;

  let played = false;

  for (let i = tour.currentStopIndex; i < tour.stops.length; i++) {
    const stop = tour.stops[i];
    if (stop.week > week || stop.played) break;

    const venue = getVenue(stop.venueId);
    if (!venue) continue;

    // Demand: hype at booking vs current fans, soft-capped by capacity.
    const reach = Math.min(
      1,
      (player.stats.fans * 0.04 + tour.hypeAtBooking * 0.01) / venue.capacity
    );
    const fillRate = clamp(reach + gaussRand(0, 0.12), 0.15, 1);
    const ticketsSold = Math.round(venue.capacity * fillRate);

    // Performance quality: stage skill blended with energy + mental drag.
    const stagePower =
      player.stats.vocalSkill * 0.4 +
      player.stats.charisma * 0.4 +
      player.stats.talent * 0.2;
    const exhaustion =
      (100 - player.stats.energy) * 0.5 + mental.burnout * 0.5;
    const performanceScore = clamp(
      Math.round(stagePower - exhaustion * 0.4 + gaussRand(0, 6)),
      5,
      100
    );

    const ticketPrice = 18 + venue.prestige * 1.4;
    const revenue =
      Math.round(ticketsSold * ticketPrice) + venue.baseGuarantee;

    // Incident roll, gated by exhaustion / controversy-proneness.
    const controversyProne = player.stats.reputation < 45;
    const eligible = TOUR_INCIDENTS.filter((inc) => {
      if (inc.minExhaustion && exhaustion < inc.minExhaustion) return false;
      if (inc.requiresControversyProne && !controversyProne) return false;
      return true;
    });
    const incident = chance(0.55) ? weightedPick(eligible) : null;

    // Apply stop economics + fame.
    bundle.moneyDelta += revenue;
    const fanGain = Math.round(
      ticketsSold * (0.4 + performanceScore / 200)
    );
    bundle.fansDelta += fanGain;
    addStat(bundle, 'fanLoyalty', performanceScore > 70 ? 2 : 0);
    addStat(bundle, 'energy', -8);
    addMental(bundle, 'burnout', 5);

    useCareerStore.getState().recordLedger({
      week,
      amount: revenue,
      kind: 'touring',
      note: `${venue.name}, ${stop.city}`,
    });

    let incidentId: string | null = null;
    if (incident) {
      incidentId = incident.id;
      bundle.fansDelta += Math.round(
        (incident.positive ? 1 : -1) * ticketsSold * 0.15
      );
      addStat(bundle, 'reputation', incident.reputationDelta);
      addStat(bundle, 'fanLoyalty', incident.fanLoyaltyDelta);
      addMental(bundle, 'burnout', incident.mentalHit * 0.5);
      addMental(bundle, 'anxiety', incident.mentalHit * 0.5);
      bundle.moneyDelta += incident.moneyDelta;
      beat(bundle, incident.socialBeat);
      note(bundle, `${venue.name}: ${incident.summary}.`);

      if (incident.controversyRisk > 0 && chance(incident.controversyRisk)) {
        bundle.addTags.push('tour-incident-controversy');
      }
      if (!incident.positive) {
        bundle.historyRecords.push({
          kind: 'flop',
          week,
          summary: incident.summary.toLowerCase(),
          severity: 40,
          tags: ['tour', 'incident'],
          artistId: null,
        });
      }
    } else {
      note(bundle, `Played ${venue.name} in ${stop.city}. Solid night.`);
    }

    tourStore.applyStopResult(i, {
      played: true,
      ticketsSold,
      revenue,
      performanceScore,
      incidentId,
    });
    tourStore.advanceStop();
    played = true;
  }

  // Tour wrap-up.
  const refreshed = useTourStore.getState().activeTour;
  if (refreshed && refreshed.currentStopIndex >= refreshed.stops.length) {
    const gross = refreshed.grossRevenue;
    note(
      bundle,
      `${refreshed.name} wrapped. Gross: $${gross.toLocaleString('en-US')}.`
    );
    bundle.historyRecords.push({
      kind: gross > refreshed.productionCost * 2 ? 'triumph' : 'flop',
      week,
      summary:
        gross > refreshed.productionCost * 2
          ? `completed a hugely successful ${refreshed.name}`
          : `limped through an underperforming ${refreshed.name}`,
      severity: 50,
      tags: ['tour'],
      artistId: null,
    });
    addStat(bundle, 'industryRespect', gross > refreshed.productionCost * 2 ? 6 : -2);
    useTourStore.getState().completeTour();
  }

  if (played) {
    addMental(bundle, 'isolation', 3);
  }
}
