import React, { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

/**
 * The app draws edge to edge, so Android no longer shrinks the screen when
 * the keyboard opens: anything at the bottom (Share, Post, a reply bar)
 * would sit under it. Put this at the bottom of the screen and it grows
 * with the keyboard, frame by frame, pushing that content up.
 *
 * `inset` is bottom space the screen already leaves (the navigation-bar
 * inset): the keyboard covers that area, so it isn't added twice.
 */
export function KeyboardSpacer({ inset = 0 }: { inset?: number }) {
  const keyboard = useAnimatedKeyboard();
  const style = useAnimatedStyle(() => ({ height: Math.max(0, keyboard.height.value - inset) }));
  return <Animated.View style={style} pointerEvents="none" />;
}

/** For bars pinned with absolute positioning: lifts them above the keyboard. */
export function useKeyboardLift(inset = 0) {
  const keyboard = useAnimatedKeyboard();
  return useAnimatedStyle(() => ({ transform: [{ translateY: -Math.max(0, keyboard.height.value - inset) }] }));
}

/** True while the keyboard is up (Instagram swaps in an "OK" button then). */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}
