import type { InfluenceBundle } from '../../types/industry';
import type { RivalCareer } from '../../types/relationships';
import { RIVALRY_ACTIONS, getRivalryAction } from '../../data/rivalry/rivalryActions';
import { RIVALRY_STORYLINES, getStoryline } from '../../data/rivalry/storylines';
import { useRivalryStore } from '../../store/rivalryStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { usePlayerStore } from '../../store/playerStore';
import { getFameLevelNumber } from '../../utils/statHelpers';
import { addStat, addMental, beat, note } from '../simulation/influenceGraph';
import { pick, chance, weightedPick, gaussRand, clamp } from '../../utils/random';

const ACTION_COOLDOWN = 3;

function evolveCareer(rc: RivalCareer): Partial<RivalCareer> {
  // Random-walk their trajectory; momentum has inertia.
  const momentum = clamp(rc.momentum + gaussRand(0, 14), -100, 100);
  const growth = 1 + momentum / 1000;
  const fans = Math.max(1000, Math.round(rc.fans * growth));
  return { fans, momentum, fameLevel: getFameLevelNumber(fans) };
}

/** Pick a storyline when a rivalry first gets hot. */
function assignStoryline(): string {
  return pick(RIVALRY_STORYLINES).id;
}

function progressStoryline(
  rc: RivalCareer,
  week: number,
  weeksSinceHot: number
): { stage: number; beat: string; rivalActionId: string | null } | null {
  if (!rc.storylineId) return null;
  const sl = getStoryline(rc.storylineId);
  if (!sl) return null;
  const next = sl.stages.find((s) => s.stage === rc.storylineStage + 1);
  if (!next) return null;

  let fire = false;
  if (next.trigger === 'intensity_gte') fire = rc.intensity >= next.value;
  else if (next.trigger === 'weeks_since_start')
    fire = weeksSinceHot >= next.value;
  else if (next.trigger === 'player_lost') fire = rc.momentum > 30;
  else if (next.trigger === 'player_won') fire = rc.momentum < -30;

  if (!fire) return null;
  return {
    stage: next.stage,
    beat: next.beat,
    rivalActionId: next.rivalActionId,
  };
}

/**
 * Weekly rivalry simulation. Rivals are living careers: they grow, gain or
 * lose momentum, escalate or cool feuds, and act against the player. Hot
 * rivalries attach a recurring storyline that escalates over weeks and can
 * become a "legendary" defining feud.
 */
export function weeklyRivalry(bundle: InfluenceBundle, week: number): void {
  const relStore = useRelationshipStore.getState();
  const rivalryStore = useRivalryStore.getState();
  const player = usePlayerStore.getState().player;
  if (!player) return;

  const playerFame = getFameLevelNumber(player.stats.fans);

  for (const artist of relStore.knownArtists) {
    rivalryStore.ensureRival(artist.id, artist.fans, getFameLevelNumber(artist.fans));
    const rc = rivalryStore.getRival(artist.id);
    const rel = relStore.getRelationship(artist.id);
    if (!rc || !rel) continue;

    // 1. Evolve their independent career.
    rivalryStore.updateRival(artist.id, evolveCareer(rc));

    // 2. Rivalry intensity drifts toward the affinity-driven baseline:
    //    hostile relationships + the player closing the fame gap heat up.
    const hostility = rel.affinity < 0 ? -rel.affinity : 0;
    const proximity = clamp(
      30 - Math.abs(rc.fameLevel - playerFame) * 8,
      0,
      30
    );
    const attitudePush =
      artist.attitude === 'aggressive' ? 4
      : artist.attitude === 'volatile' ? gaussRand(0, 6)
      : artist.attitude === 'friendly' ? -3
      : 0;
    const target = clamp(hostility * 0.6 + proximity, 0, 100);
    const cur = rivalryStore.getRival(artist.id)!.intensity;
    rivalryStore.adjustIntensity(
      artist.id,
      (target - cur) * 0.15 + attitudePush
    );

    const live = rivalryStore.getRival(artist.id)!;

    // 3. Attach a storyline once the rivalry crosses into "real" territory.
    if (!live.storylineId && live.intensity >= 25) {
      rivalryStore.updateRival(artist.id, {
        storylineId: assignStoryline(),
        storylineStage: -1,
      });
    }

    // 4. Progress the storyline.
    const fresh = rivalryStore.getRival(artist.id)!;
    const weeksSinceHot = week - fresh.lastActionWeek;
    const step = progressStoryline(fresh, week, weeksSinceHot);
    let forcedActionId: string | null = null;
    if (step) {
      rivalryStore.updateRival(artist.id, { storylineStage: step.stage });
      const sl = getStoryline(fresh.storylineId!);
      note(
        bundle,
        step.beat.replace('{rival}', artist.name)
      );
      bundle.historyRecords.push({
        kind: 'feud',
        week,
        summary: `${sl?.name ?? 'rivalry'} with ${artist.name}: ${step.beat
          .replace('{rival}', artist.name)
          .toLowerCase()}`,
        severity: 50 + step.stage * 12,
        tags: ['rivalry', 'storyline'],
        artistId: artist.id,
      });
      forcedActionId = step.rivalActionId;
      if (step.stage >= 3) {
        rivalryStore.updateRival(artist.id, { legendary: true });
        beat(bundle, 'rivalry-legendary');
      }
    }

    // 5. Rival takes an action against the player.
    const offCooldown = week - fresh.lastActionWeek >= ACTION_COOLDOWN;
    const wantsToAct =
      forcedActionId !== null || (offCooldown && chance(fresh.intensity / 160));

    if (wantsToAct) {
      const action =
        (forcedActionId && getRivalryAction(forcedActionId)) ||
        weightedPick(
          RIVALRY_ACTIONS.filter(
            (a) => fresh.intensity >= a.minIntensity
          ).map((a) => ({ ...a, weight: a.hostile ? fresh.intensity : 20 }))
        );

      if (action) {
        rivalryStore.recordAction(artist.id, action.id);
        rivalryStore.updateRival(artist.id, { lastActionWeek: week });
        rivalryStore.adjustIntensity(artist.id, action.intensityDelta);

        addStat(bundle, 'reputation', action.reputationDelta);
        addStat(bundle, 'fanLoyalty', action.fanLoyaltyDelta);
        addMental(bundle, 'paranoia', action.mentalHit * 0.5);
        addMental(bundle, 'anxiety', action.mentalHit * 0.5);
        beat(bundle, action.socialBeat);
        note(bundle, action.summary.replace('{rival}', artist.name) + '.');

        if (!action.hostile) {
          relStore.updateAffinity(artist.id, 10);
        } else {
          relStore.updateAffinity(artist.id, -4);
        }

        if (action.spawnsControversy && chance(0.5)) {
          bundle.addTags.push('spawn-controversy:ctrl-beef-escalation');
          bundle.historyRecords.push({
            kind: 'feud',
            week,
            summary: `${artist.name} ${action.kind.replace('-', ' ')} against you`,
            severity: 70,
            tags: ['rivalry', 'beef'],
            artistId: artist.id,
          });
        }
      }
    }
  }
}
