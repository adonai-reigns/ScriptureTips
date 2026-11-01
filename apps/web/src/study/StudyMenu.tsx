"use client";

import { getSearch } from "@scripturetips/search";
import { useRouter } from "next/navigation";
import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "../hydrated.ts";
import { type Box, clampBox, movedBox, readBox, resizedBox, startBox } from "./box.ts";
import { onOpenStudyMenu } from "./menuBus.ts";
import { STUDY_SEARCH, StudySearch } from "./StudySearch.tsx";
import { holdSelection } from "./selection.ts";

const STORED = "study-menu-box";
/** Whether the colors that show each word's type are on (this browser's choice). */
const TYPES = "study-word-types";

/** The minimized bar's width (the dock in the reading head is the same: globals.css `.study-dock`). */
const DOCK_W = 176;
/** How long the window takes to move between its place and the bar (globals.css `.study-menu.moving`). */
const MOVE_MS = 320;

/** Where the bar goes: the dock at the far left of the reading head (it holds its place there). */
function dockNow(): { x: number; y: number; h: number } | null {
  const r = document.querySelector(".study-dock")?.getBoundingClientRect();
  return r ? { x: r.left, y: r.top, h: r.height } : null;
}

const viewNow = () => ({ w: window.innerWidth, h: window.innerHeight });

/** Where the window was last left (best effort: storage can be unavailable). */
function stored(): Box | null {
  try {
    return readBox(window.localStorage.getItem(STORED));
  } catch {
    return null;
  }
}

function store(box: Box): void {
  try {
    window.localStorage.setItem(STORED, JSON.stringify(box));
  } catch {
    // Not remembered; it still works.
  }
}

/**
 * The Study button and its window. The button turns study mode on and off (study mode is part of
 * the page's address: `href` is the other setting's, and the button is blue while it's on). Turning
 * it on starts the window as its bar (minimized), and turning it off closes it. The window's × minimizes it: it moves to a
 * bar of fixed width at the far left of the reading head (the dock, which the head holds a place
 * for), showing only its header, whose × has become an expand icon. Expanding it, or the selection
 * tooltip's search, moves it back to where it was, which is remembered through the move.
 *
 * The window floats over the page without blocking it: drag it by its header, resize it from its
 * corner, and it keeps where it was left (this browser's storage). Its footer holds a checkbox
 * alone, which shows or hides the word types (the colors on the verses; it doesn't touch study
 * mode, and is remembered), and what the colors mean (`children`) beside it, grey while they're
 * hidden. It stays open through changing chapter, so it can be read while selecting text.
 */
export function StudyMenu({
  on,
  href,
  label,
  switchLabel,
  closeLabel,
  expandLabel,
  searchTranslations,
  children,
}: {
  on: boolean;
  /** The address with study mode the other way round. */
  href: string;
  label: string;
  switchLabel: string;
  /** The × (it minimizes the window). */
  closeLabel: string;
  /** The expand icon, once it's a bar. */
  expandLabel: string;
  /** The translations the window's search covers (catalog IDs): those in view. */
  searchTranslations: readonly string[];
  children?: ReactNode;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [types, setTypes] = useState(true);
  const [box, setBox] = useState<Box | null>(null);
  // Minimized: `min` is where it's heading (the bar), `compact` once it has got there (only the
  // header shows), `moving` while it travels (the CSS animates its place and size then). `dock` is
  // the bar's place, followed while the page scrolls, and `animH` the window's height as a number
  // for the trip, since a height that fits its content can't be animated.
  const [min, setMin] = useState(false);
  const [compact, setCompact] = useState(false);
  const [moving, setMoving] = useState(false);
  const [dock, setDock] = useState<{ x: number; y: number; h: number } | null>(null);
  const [animH, setAnimH] = useState<number | null>(null);
  const minRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heading = useId();
  const button = useRef<HTMLButtonElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const switchBox = useRef<HTMLInputElement>(null);
  // What's being dragged: the window by its header, or its corner.
  const held = useRef<
    | { kind: "move"; grab: { x: number; y: number } }
    | { kind: "size"; from: { x: number; y: number; w: number; h: number } }
    | null
  >(null);

  const later = (ms: number, then: () => void) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(then, ms);
  };

  /** Moves the window to its bar. */
  const minimize = () => {
    if (minRef.current) return;
    minRef.current = true;
    // The height it has now, as a number, so it can shrink smoothly.
    setAnimH(win.current?.offsetHeight ?? null);
    setMoving(true);
    document.documentElement.dataset["studyDocked"] = "on";
    // The next frame, so the dock has its place, and the window sets off from where it is.
    requestAnimationFrame(() => {
      setDock(dockNow());
      setMin(true);
    });
    later(MOVE_MS, () => {
      setCompact(true);
      setMoving(false);
    });
  };

  /** Moves the bar back to where the window was (its place is kept in `box`). */
  const restore = () => {
    if (!minRef.current) return;
    minRef.current = false;
    delete document.documentElement.dataset["studyDocked"];
    setCompact(false);
    setMoving(true);
    setMin(false);
    later(MOVE_MS, () => {
      setMoving(false);
      setAnimH(null);
    });
  };

  // The bar follows the dock as the page scrolls or resizes (the head is sticky, so it moves until
  // it sticks).
  useEffect(() => {
    if (!min) return;
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setDock(dockNow()));
    };
    window.addEventListener("scroll", follow, { passive: true });
    window.addEventListener("resize", follow);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", follow);
      window.removeEventListener("resize", follow);
    };
  }, [min]);

  // The window's search: this instance's scope is set while the window can be opened, so a query
  // sent from elsewhere (the tooltip) is searched in it before the window is even open.
  const translations = searchTranslations.join(",");
  useEffect(() => {
    getSearch(STUDY_SEARCH, {
      scope: {
        kinds: ["reference", "text", "original"],
        translations: translations ? translations.split(",") : [],
        limit: 10,
      },
    });
  }, [translations]);

  // Something else on the page can ask for it to be open: a bar expands to its window again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `restore` only uses refs and setters.
  useEffect(
    () =>
      onOpenStudyMenu(() => {
        setOpen(true);
        restore();
      }),
    [],
  );

  // Study mode on (by the button, or the address, as on a reload) starts the window as its bar, in
  // place with no trip; turned off (the same ways) it closes, bar and all.
  useEffect(() => {
    if (on) {
      // A fresh start: what was searched in an earlier study session goes, and the welcome shows.
      getSearch(STUDY_SEARCH).clear();
      minRef.current = true;
      document.documentElement.dataset["studyDocked"] = "on";
      setOpen(true);
      setDock(dockNow());
      setMin(true);
      setCompact(true);
      return;
    }
    setOpen(false);
    clearTimeout(timer.current);
    minRef.current = false;
    setMin(false);
    setCompact(false);
    setMoving(false);
    setAnimH(null);
    delete document.documentElement.dataset["studyDocked"];
  }, [on]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      delete document.documentElement.dataset["studyDocked"];
    },
    [],
  );

  // The word types: remembered, and applied to the page (the colors are CSS, by this attribute).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(TYPES) === "off") setTypes(false);
    } catch {
      // Not remembered; they're on.
    }
  }, []);
  useEffect(() => {
    document.documentElement.dataset["studyTypes"] = types ? "on" : "off";
    try {
      window.localStorage.setItem(TYPES, types ? "on" : "off");
    } catch {
      // Not remembered.
    }
  }, [types]);
  useEffect(
    () => () => {
      delete document.documentElement.dataset["studyTypes"];
    },
    [],
  );

  // First opened: where it was left, or under the button.
  useLayoutEffect(() => {
    if (!open || box) return;
    const anchor = button.current?.getBoundingClientRect();
    const saved = stored();
    setBox(
      saved
        ? clampBox(saved, viewNow())
        : startBox(anchor ?? { right: window.innerWidth - 8, bottom: 48 }, viewNow()),
    );
  }, [open, box]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `minimize` only uses refs and setters.
  useEffect(() => {
    if (!open) return;
    // Words selected in the page behind the window would show their handles over it (a phone draws
    // them above everything): they're held instead (drawn as a highlight) and the selection let go.
    holdSelection();
    switchBox.current?.focus({ preventScroll: true });
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      minimize();
      button.current?.focus();
    };
    // A smaller window pulls it back on screen.
    const onResize = () => setBox((b) => (b ? clampBox(b, viewNow()) : b));
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const grabMove = (e: PointerEvent<HTMLElement>) => {
    if (!box || min || (e.target as Element).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    held.current = { kind: "move", grab: { x: e.clientX - box.x, y: e.clientY - box.y } };
  };
  const grabSize = (e: PointerEvent<HTMLElement>) => {
    if (!box || min || !win.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    held.current = {
      kind: "size",
      from: { x: e.clientX, y: e.clientY, w: win.current.offsetWidth, h: win.current.offsetHeight },
    };
  };
  const drag = (e: PointerEvent<HTMLElement>) => {
    const h = held.current;
    if (!h || !box) return;
    setBox(
      h.kind === "move"
        ? movedBox(box, h.grab, { x: e.clientX, y: e.clientY }, viewNow())
        : resizedBox(box, h.from, e.clientX - h.from.x, e.clientY - h.from.y, viewNow()),
    );
  };
  const release = () => {
    if (held.current && box) store(box);
    held.current = null;
  };
  const pointer = {
    onPointerMove: drag,
    onPointerUp: release,
    onPointerCancel: release,
  };

  return (
    <div className="study-tools">
      <button
        ref={button}
        type="button"
        className={`study-toggle${on ? " on" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={!hydrated}
        onClick={() => {
          // Study mode on (its window starts as the bar, once the page says so) or off (the
          // window goes with it).
          if (on) setOpen(false);
          start(() => router.replace(href, { scroll: false }));
        }}
      >
        {label}
        {pending ? <span className="spinner link-pending" aria-hidden="true" /> : null}
      </button>
      {open && box
        ? createPortal(
            <div
              ref={win}
              role="dialog"
              aria-labelledby={heading}
              className={`study-menu${min ? " docked" : ""}${compact ? " compact" : ""}${moving ? " moving" : ""}`}
              data-types={types ? "on" : "off"}
              style={
                min && dock
                  ? { left: dock.x, top: dock.y, width: DOCK_W, height: dock.h, maxHeight: dock.h }
                  : {
                      left: box.x,
                      top: box.y,
                      width: box.w,
                      // Never past the bottom of the screen (the dynamic viewport, on a phone).
                      maxHeight: `calc(100dvh - ${box.y + 8}px)`,
                      ...(box.h !== null
                        ? { height: box.h }
                        : animH !== null
                          ? { height: animH }
                          : {}),
                    }
              }
            >
              {/* biome-ignore lint/a11y/noStaticElementInteractions: dragging the window by its header is the pointer's way of moving it; the window's content stays reachable by keyboard. */}
              <header className="study-menu-header" onPointerDown={grabMove} {...pointer}>
                <h3 id={heading}>{label}</h3>
                <button
                  type="button"
                  className="modal-close"
                  aria-label={min ? expandLabel : closeLabel}
                  aria-expanded={!min}
                  onClick={() => {
                    if (min) restore();
                    else minimize();
                  }}
                >
                  {min ? (
                    // Corners pointing out: it opens up again.
                    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                      <path
                        d="M9.5 2H14v4.5M6.5 14H2V9.5M14 2 9 7M2 14l5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    "×"
                  )}
                </button>
              </header>
              <div className="study-menu-body">
                <StudySearch />
              </div>
              <footer className="study-menu-footer">
                <input
                  ref={switchBox}
                  type="checkbox"
                  role="switch"
                  className="study-switch"
                  aria-label={switchLabel}
                  title={switchLabel}
                  aria-checked={types}
                  checked={types}
                  onChange={() => setTypes(!types)}
                />
                {children}
              </footer>
              {/* biome-ignore lint/a11y/noStaticElementInteractions: the corner handle resizes the window by pointer; it has no keyboard use. */}
              <div
                className="study-menu-resize"
                aria-hidden="true"
                onPointerDown={grabSize}
                {...pointer}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
