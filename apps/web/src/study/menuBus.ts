/**
 * Opening the study window from elsewhere on the page (the selection tooltip's "Search for
 * this"). The window listens while it's mounted; asking when none is returns false.
 */

const openers = new Set<() => void>();

/** The window asks to hear when something wants it open. */
export function onOpenStudyMenu(open: () => void): () => void {
  openers.add(open);
  return () => openers.delete(open);
}

/** Makes sure the study window is open; false if there isn't one on the page. */
export function openStudyMenu(): boolean {
  for (const open of [...openers]) open();
  return openers.size > 0;
}
