import { useCallback, useRef } from 'react';
import type { EventChoice, GameEvent, SocialReactionType } from '../types/events';
import { useGameStore } from '../store/gameStore';
import { applyConsequence } from '../systems/events/consequenceApplicator';
import { getAvailableChoices, hiddenByTrait } from '../systems/events/eventEngine';
import { runWeekTransition } from '../systems/weekEngine';
import { saveProgress } from '../systems/persistence';
import { checkIdentityNow, consumeSeed } from '../systems/identity/identityTick';

/**
 * Drives the week loop: resolving each decision, then rolling the world
 * forward. Mount once wherever the loop lives (the Deck) — the reaction
 * accumulators survive across every event the player resolves so social and
 * the chart pipeline see the whole week at transition time.
 */
export function useWeekEngine() {
  const week = useGameStore((s) => s.week);
  const playerTags = useGameStore((s) => s.playerTags);
  const activeEvents = useGameStore((s) => s.activeEvents);
  const pendingIndex = useGameStore((s) => s.pendingEventIndex);

  const reactions = useRef<SocialReactionType[]>([]);
  const eventIds = useRef<string[]>([]);
  /**
   * The week `finishWeek` has already rolled. Guards a double-advance from a
   * double-tap without latching shut: the Deck keeps this hook mounted for
   * the whole session, so a one-shot boolean would freeze time after week one.
   */
  const closedWeek = useRef<number | null>(null);

  const currentEvent: GameEvent | null = activeEvents[pendingIndex] ?? null;

  const availableChoices: EventChoice[] = currentEvent
    ? getAvailableChoices(currentEvent, playerTags)
    : [];

  // Choices only another personality would see stay hidden, not locked.
  const lockedChoices: EventChoice[] = currentEvent
    ? currentEvent.choices.filter((c) => !availableChoices.includes(c) && !hiddenByTrait(c, playerTags))
    : [];

  const isWeekComplete = !currentEvent;

  /**
   * Resolve the decision in front of the player. Reads live store state
   * rather than closing over the render's values, so the callback stays
   * stable for the lifetime of the Deck.
   */
  const choose = useCallback((choiceId: string) => {
    const game = useGameStore.getState();
    const event = game.activeEvents[game.pendingEventIndex];
    if (!event) return;
    const choice = event.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    const result = applyConsequence(choice.consequences, game.week);
    reactions.current.push(result.socialReaction);
    eventIds.current.push(event.id);

    game.resolveCurrentEvent(choiceId, {
      eventId: event.id,
      choiceId,
      week: game.week,
      flavorText: result.flavorText,
      category: event.category,
    });
    // The past came back and this was its payoff: the seed is spent.
    if (event.seedId) consumeSeed(event.seedId);
    // A choice can fulfil a want (or make a fear come true) on the spot.
    checkIdentityNow();
    // Persist the decision now, so a relaunch mid-week resumes here.
    saveProgress();
  }, []);

  /** Roll the world to next week using everything that just happened. */
  const finishWeek = useCallback(() => {
    const current = useGameStore.getState().week;
    if (closedWeek.current === current) return;
    closedWeek.current = current;

    runWeekTransition(reactions.current, eventIds.current);
    reactions.current = [];
    eventIds.current = [];
  }, []);

  return {
    week,
    currentEvent,
    availableChoices,
    lockedChoices,
    isWeekComplete,
    eventsThisWeek: activeEvents.length,
    eventNumber: pendingIndex + 1,
    pendingCount: Math.max(0, activeEvents.length - pendingIndex),
    choose,
    finishWeek,
  };
}
