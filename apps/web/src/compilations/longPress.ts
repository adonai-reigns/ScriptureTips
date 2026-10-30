import { type MouseEvent, type PointerEvent, useEffect, useRef } from "react";

/** How long a finger rests before it's a long press, and how far it may drift. */
const HOLD_MS = 500;
const SLOP_PX = 10;

/**
 * A long press by touch, as phone apps have it: `bind(key)` gives an element the handlers that
 * call `onPress(key)` once a finger has rested on it. The tap that ends it doesn't follow its
 * link, and the browser's own long-press menu (a link's "Open in new tab") doesn't show.
 * A mouse and a pen are left alone.
 */
export function useLongPress<K>(onPress: (key: K) => void) {
  const press = useRef<{ key: K; x: number; y: number; timer: number } | null>(null);
  // Set once it's fired, until the click that ends the press.
  const fired = useRef(false);

  const cancel = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  const fire = () => {
    const p = press.current;
    if (!p) return;
    cancel();
    fired.current = true;
    navigator.vibrate?.(10);
    onPress(p.key);
  };
  useEffect(
    () => () => {
      if (press.current) window.clearTimeout(press.current.timer);
    },
    [],
  );

  return (key: K) => ({
    onPointerDown: (e: PointerEvent) => {
      cancel();
      fired.current = false;
      if (e.pointerType !== "touch") return;
      press.current = { key, x: e.clientX, y: e.clientY, timer: window.setTimeout(fire, HOLD_MS) };
    },
    onPointerMove: (e: PointerEvent) => {
      const p = press.current;
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLOP_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    // The browser's long press: it may come before the timer.
    onContextMenu: (e: MouseEvent) => {
      if (!press.current && !fired.current) return;
      e.preventDefault();
      fire();
    },
    onClick: (e: MouseEvent) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
    },
  });
}
