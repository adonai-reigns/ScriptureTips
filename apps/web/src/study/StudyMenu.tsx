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

const STORED = "study-menu-box";

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
 * The Study button and its window. The window floats over the page without blocking it: drag it
 * by its header, resize it from its corner, and it keeps where it was left (this browser's
 * storage). Its footer holds the study mode switch, a checkbox alone, and what the colors mean
 * (`children`) beside it, grey until the switch is on. It stays open until it's closed (its × or Escape), through turning study mode
 * on and off and through changing chapter, so it can be read while selecting text. Study mode
 * is part of the page's address (`href` is the other setting's).
 */
export function StudyMenu({
  on,
  href,
  label,
  switchLabel,
  closeLabel,
  searchTranslations,
  children,
}: {
  on: boolean;
  /** The address with study mode the other way round. */
  href: string;
  label: string;
  switchLabel: string;
  closeLabel: string;
  /** The translations the window's search covers (catalog IDs): those in view. */
  searchTranslations: readonly string[];
  children?: ReactNode;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
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

  // Something else on the page can ask for it to be open.
  useEffect(() => onOpenStudyMenu(() => setOpen(true)), []);

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

  useEffect(() => {
    if (!open) return;
    switchBox.current?.focus({ preventScroll: true });
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
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
    if (!box || (e.target as Element).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    held.current = { kind: "move", grab: { x: e.clientX - box.x, y: e.clientY - box.y } };
  };
  const grabSize = (e: PointerEvent<HTMLElement>) => {
    if (!box || !win.current) return;
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
        onClick={() => setOpen(!open)}
      >
        {label}
      </button>
      {open && box
        ? createPortal(
            <div
              ref={win}
              role="dialog"
              aria-labelledby={heading}
              className="study-menu"
              data-on={on}
              style={{
                left: box.x,
                top: box.y,
                width: box.w,
                ...(box.h === null ? {} : { height: box.h }),
              }}
            >
              {/* biome-ignore lint/a11y/noStaticElementInteractions: dragging the window by its header is the pointer's way of moving it; the window's content stays reachable by keyboard. */}
              <header className="study-menu-header" onPointerDown={grabMove} {...pointer}>
                <h3 id={heading}>{label}</h3>
                <button
                  type="button"
                  className="modal-close"
                  aria-label={closeLabel}
                  onClick={() => {
                    setOpen(false);
                    button.current?.focus();
                  }}
                >
                  ×
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
                  aria-checked={on}
                  checked={on}
                  disabled={pending}
                  onChange={() => start(() => router.replace(href, { scroll: false }))}
                />
                {pending ? <span className="spinner link-pending" aria-hidden="true" /> : null}
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
