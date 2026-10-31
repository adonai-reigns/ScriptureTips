/**
 * Stepping to another chapter (the previous and next arrows, or a number in the chapter list)
 * keeps the page where it is, so the sticky head stays put. But someone who has read to the foot
 * of a chapter wants the next one from its first verse: `markStep` notes the step, and the new
 * chapter's `ChapterStart` scrolls the text back up to just under the head.
 */
let steppedAt = 0;

/** How long a step stays pending: a chapter that takes longer than this to arrive isn't scrolled. */
const PENDING_MS = 30_000;

export const markStep = (): void => {
  steppedAt = Date.now();
};

/** True once for each step taken, if the new chapter has arrived in time. */
export function takeStep(): boolean {
  const pending = Date.now() - steppedAt < PENDING_MS;
  steppedAt = 0;
  return pending;
}

/**
 * Scrolls up so the text right after the sticky head (`.reading-head` in the editor, `.reader-head`
 * in the reader) is just under it. Never scrolls down: from near the top, the page stays.
 */
export function scrollToChapterStart(from: Element): void {
  const head = from.closest<HTMLElement>(".reading-head, .reader-head");
  const start = head?.nextElementSibling;
  if (!head || !start) return;
  const top = Math.max(0, start.getBoundingClientRect().top + window.scrollY - head.offsetHeight);
  if (window.scrollY > top) window.scrollTo({ top });
}
