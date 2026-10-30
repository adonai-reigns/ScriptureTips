import { type RefObject, useEffect } from "react";

/**
 * A popup's closing, while it's open: Escape (focus back on its toggle) or a tap outside both.
 * Focuses the first `focus` element inside it when it opens.
 */
export function usePopupClose(
  open: boolean,
  close: () => void,
  toggle: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
  focus: string,
) {
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
    const outside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!toggle.current?.contains(target) && !panel.current?.contains(target)) close();
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, close, toggle, panel, focus]);
}
