"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { StudyWords } from "./types.ts";

const StudyContext = createContext<StudyWords | null>(null);

/** Study mode's words for what's below it; without a provider, text is drawn plain. */
export function StudyProvider({ words, children }: { words: StudyWords; children: ReactNode }) {
  return <StudyContext.Provider value={words}>{children}</StudyContext.Provider>;
}

/** The words study mode draws, or null when it's off. */
export const useStudy = (): StudyWords | null => useContext(StudyContext);
