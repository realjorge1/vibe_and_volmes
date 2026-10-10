import React, { createContext, useContext } from 'react';
import { AmbientBackground } from './AmbientBackground';

const BackdropContext = createContext(false);

/** Marks a subtree whose layout already paints the ambient stage behind it. */
export function BackdropProvided({ children }: { children: React.ReactNode }) {
  return <BackdropContext.Provider value>{children}</BackdropContext.Provider>;
}

/**
 * The ambient stage for a screen, unless a parent layout already paints a
 * shared one (the tabs do, so switching tabs never restarts the light show).
 */
export function ScreenBackdrop({ tint }: { tint?: string }) {
  const provided = useContext(BackdropContext);
  if (provided) return null;
  return <AmbientBackground tint={tint} />;
}
