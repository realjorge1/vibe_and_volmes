import { AppState } from 'react-native';
import type { NotificationDraft } from '../../types/notifications';
import { deliver } from './deliver';

/**
 * PACING.
 *
 * Notifications trickle in like they do on a real phone: a few seconds apart,
 * never a wall of them at once. A queued ping is written when it fires, so it
 * reflects the game as it is then. Nothing is delivered while the game is in
 * the background; the queue waits for the player to come back.
 */

type Maker = () => NotificationDraft | null | undefined;

interface Item {
  due: number;
  make: Maker;
}

const MIN_GAP_MS = 3500;
const MAX_QUEUE = 12;

let queue: Item[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastAt = 0;
let waitingForActive = false;

/** Node timers would hold a test process open; RN timers are plain numbers. */
function later(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
  const t = setTimeout(fn, ms);
  (t as unknown as { unref?: () => void }).unref?.();
  return t;
}

export function schedule(delayMs: number, make: Maker): void {
  queue.push({ due: Date.now() + delayMs, make });
  queue.sort((a, b) => a.due - b.due);
  if (queue.length > MAX_QUEUE) queue = queue.slice(0, MAX_QUEUE);
  arm();
}

/** Drop everything pending (a career ended, the player switched it off). */
export function clearSchedule(): void {
  queue = [];
  if (timer) clearTimeout(timer);
  timer = null;
}

export function pendingCount(): number {
  return queue.length;
}

function arm(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  const next = queue[0];
  if (!next) return;
  const at = Math.max(next.due, lastAt + MIN_GAP_MS);
  timer = later(fire, Math.max(0, at - Date.now()));
}

/** Hold the queue until the game is in front again. */
function waitForActive(): void {
  if (waitingForActive) return;
  waitingForActive = true;
  const sub = AppState.addEventListener('change', (s) => {
    if (s !== 'active') return;
    sub?.remove?.();
    waitingForActive = false;
    arm();
  });
}

function fire(): void {
  timer = null;
  if (AppState.currentState !== 'active') {
    waitForActive();
    return;
  }
  const item = queue.shift();
  if (item) {
    let draft: NotificationDraft | null | undefined = null;
    try {
      draft = item.make();
    } catch {
      draft = null;
    }
    if (draft) {
      lastAt = Date.now();
      void deliver(draft);
    }
  }
  arm();
}
