import { useRef } from 'react';
import type { PointerEvent } from 'react';

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 10;

/**
 * Distinguishes a tap from a long press using pointer events, so it works
 * the same for touch, mouse and pen. Moving the finger (e.g. to scroll)
 * cancels both.
 */
export function useLongPress(onTap: () => void, onLongPress: () => void) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  };

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        start.current = null;
        if (navigator.vibrate) navigator.vibrate(30);
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: PointerEvent) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) {
        clear();
        start.current = null;
      }
    },
    onPointerUp: () => {
      const wasPressing = start.current !== null;
      clear();
      start.current = null;
      if (wasPressing && !fired.current) onTap();
    },
    onPointerCancel: () => {
      clear();
      start.current = null;
    },
    onPointerLeave: () => {
      clear();
      start.current = null;
    },
    // Stop the browser's own long-press menu from appearing.
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  };
}
