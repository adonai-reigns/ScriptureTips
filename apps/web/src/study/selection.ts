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

/** Where selecting makes sense: the compare table, or a phone's one column. */
export const SCOPE = ".compare-grid, .compare-list";

/** Words selected in the compare view: their text, the Strong's numbers marked in them, and where. */
export interface StudyPick {
  readonly text: string;
  /** The Strong's numbers of the marked words in the selection, once each, in reading order. */
  readonly strongs: string[];
  readonly range: Range;
}

const elementOf = (node: Node): Element | null =>
  node instanceof Element ? node : node.parentElement;

/** The words the browser has selected in the compare view now, if any are. */
export function readPick(): StudyPick | null {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const text = selection.toString().replace(/\s+/g, " ").trim();
  const scope = elementOf(range.startContainer)?.closest(SCOPE);
  if (!text || !scope || scope !== elementOf(range.endContainer)?.closest(SCOPE)) return null;
  const strongs: string[] = [];
  for (const word of scope.querySelectorAll<HTMLElement>(".study-word")) {
    const strong = word.dataset["strong"];
    if (strong && range.intersectsNode(word) && !strongs.includes(strong)) strongs.push(strong);
  }
  return { text, strongs, range: range.cloneRange() };
}

// ---- The held selection.
//
// Study mode keeps its own selection, apart from the browser's: when the words are handed on (sent
// to the search, say), the browser's selection is let go (a phone draws its handles and toolbar
// over everything, the study window included) but the words stay held here, drawn with the CSS
// Custom Highlight API, for whatever works on them next (linking them, for one). Selecting other
// words, or pressing on the text again, ends it.

/** The name of the highlight (styled in globals.css as `::highlight(study-selection)`). */
export const HELD_HIGHLIGHT = "study-selection";

let held: StudyPick | null = null;
let releasedAt = 0;
const listeners = new Set<() => void>();

const highlights = (): HighlightRegistry | null =>
  typeof CSS !== "undefined" && "highlights" in CSS ? CSS.highlights : null;

/** The words held now, or null. */
export const heldSelection = (): StudyPick | null => held;

/** Hears when the held selection changes. */
export function onHeldSelection(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setHeld(next: StudyPick | null): void {
  held = next;
  const registry = highlights();
  if (registry) {
    if (next) registry.set(HELD_HIGHLIGHT, new Highlight(next.range));
    else registry.delete(HELD_HIGHLIGHT);
  }
  for (const l of [...listeners]) l();
}

/**
 * Holds the words (given, or those the browser has selected) and lets the browser's selection
 * go. Where the browser can't draw the held words, they're held all the same.
 */
export function holdSelection(pick: StudyPick | null = readPick()): void {
  if (!pick) return;
  setHeld(pick);
  releasedAt = Date.now();
  window.getSelection()?.removeAllRanges();
}

/** True just after `holdSelection` let the browser's selection go: that isn't the user's doing. */
export const justReleased = (): boolean => Date.now() - releasedAt < 300;

/** Lets the held words go. */
export function dropHeldSelection(): void {
  if (held) setHeld(null);
}
