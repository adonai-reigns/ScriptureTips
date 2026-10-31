/** The text selected in the page now, trimmed ("" if none). */
export const selectedText = (): string =>
  (typeof window === "undefined" ? "" : (window.getSelection()?.toString() ?? "")).trim();

/** When a press last closed the tooltip (ms), or 0. */
let dismissedAt = 0;

/** How long a click after a dismissing press still counts as part of it (ms). */
const CLICK_WINDOW = 1000;

/**
 * Notes that a press outside the study tooltip just closed it. The click that press ends is the
 * user closing the tooltip, not choosing what's under the mouse.
 */
export const noteDismissal = (): void => {
  dismissedAt = Date.now();
};

/**
 * True if a click on a verse in study mode isn't a choice of it: it ends a selection, or it is
 * the click that just closed the tooltip. Each dismissal is answered once.
 */
export function ignoresClick(): boolean {
  const dismissed = dismissedAt > 0 && Date.now() - dismissedAt < CLICK_WINDOW;
  dismissedAt = 0;
  return dismissed || selectedText() !== "";
}
