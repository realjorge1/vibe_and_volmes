import type { GameDialog, World } from './types';
import { newId } from './types';

const LOG_CAP = 60;

export function logMsg(world: World, icon: string, text: string): void {
  world.log.push({ at: world.totalMinutes, text, icon });
  if (world.log.length > LOG_CAP) world.log.splice(0, world.log.length - LOG_CAP);
}

export function pushDialog(
  world: World,
  dialog: Omit<GameDialog, 'id'>
): GameDialog {
  const d: GameDialog = { ...dialog, id: newId(world, 'dlg') };
  world.dialogs.push(d);
  return d;
}
