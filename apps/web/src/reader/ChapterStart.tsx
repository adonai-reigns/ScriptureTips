"use client";

import { useEffect, useRef } from "react";
import { scrollToChapterStart, takeStep } from "./stepScroll.ts";

/**
 * Put in the chapter bar, keyed by the chapter, so it mounts with each new chapter: when the
 * chapter was reached by a step, the text scrolls back up to its first verse.
 */
export function ChapterStart() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!takeStep() || !marker.current) return;
    const el = marker.current;
    // After the new chapter is laid out.
    requestAnimationFrame(() => scrollToChapterStart(el));
  }, []);
  return <span ref={marker} hidden />;
}
