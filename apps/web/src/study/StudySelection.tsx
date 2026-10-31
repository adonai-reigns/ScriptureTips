"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStudy } from "./StudyProvider.tsx";
import { noteDismissal } from "./selection.ts";

/** apps/api `StudyLemma`: a word in full. */
interface Lemma {
  occurrences: number;
  entries: { lexicon: string; name: string; headword: string | null; summary: string }[];
}

interface Picked {
  text: string;
  /** The Strong's numbers of the marked words in the selection, once each, in reading order. */
  strongs: string[];
  range: Range;
}

/** Where selecting makes sense: the compare table, or a phone's one column. */
const SCOPE = ".compare-grid, .compare-list";
/** The most words the tooltip lists; a long selection says how many more. */
const MOST = 6;
/** The tooltip's width, for keeping it in the window. */
const WIDTH = 360;

const elementOf = (node: Node): Element | null =>
  node instanceof Element ? node : node.parentElement;

/** What the user has selected, if it's text inside the compare view. */
function read(): Picked | null {
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

/**
 * Study mode's tooltip: when the mouse is let go after selecting text in the compare view (or
 * a word is double-clicked), it opens by the selection with the marked words in it, each with its
 * Hebrew or Greek word, its number, how often it's used and what the dictionaries say. It closes
 * on Escape, a click elsewhere, or when the selection goes. Clicking in it keeps the selection.
 */
export function StudySelection() {
  const words = useStudy();
  const t = useTranslations("study");
  const tip = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  // Whether it's open, for the mouse handlers (which are set up once).
  const open = useRef(false);
  open.current = picked !== null;
  const [lemmas, setLemmas] = useState<Record<string, Lemma | null>>({});
  const asked = useRef(new Set<string>());
  const [, moved] = useState(0);

  useEffect(() => {
    const inTip = (e: Event) => e.target instanceof Node && tip.current?.contains(e.target);
    // After the browser has finished the selection (a double click selects its word on mouse up).
    const up = (e: MouseEvent) => {
      if (!inTip(e)) window.setTimeout(() => setPicked(read()), 0);
    };
    // A press outside it closes it, and the click that press ends isn't a choice of the verse.
    const down = (e: MouseEvent) => {
      if (inTip(e)) return;
      if (open.current) {
        noteDismissal();
        // Clicking a button doesn't clear the selection: without this, letting go would find
        // the old one and open the tooltip again.
        window.getSelection()?.removeAllRanges();
      }
      setPicked(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPicked(null);
    };
    const change = () => {
      if (window.getSelection()?.isCollapsed) setPicked(null);
    };
    document.addEventListener("mouseup", up);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    document.addEventListener("selectionchange", change);
    return () => {
      document.removeEventListener("mouseup", up);
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
      document.removeEventListener("selectionchange", change);
    };
  }, []);

  // Stays by the selection while the page scrolls or the window changes size.
  useEffect(() => {
    if (!picked) return;
    const again = () => moved((n) => n + 1);
    window.addEventListener("scroll", again, true);
    window.addEventListener("resize", again);
    return () => {
      window.removeEventListener("scroll", again, true);
      window.removeEventListener("resize", again);
    };
  }, [picked]);

  // Each listed word's full entry, asked for once.
  useEffect(() => {
    for (const strong of picked?.strongs.slice(0, MOST) ?? []) {
      if (asked.current.has(strong)) continue;
      asked.current.add(strong);
      fetch(`/api/study/lemma/${strong}`)
        .then((res) => (res.ok ? (res.json() as Promise<Lemma>) : null))
        .catch(() => null)
        .then((lemma) => setLemmas((all) => ({ ...all, [strong]: lemma })));
    }
  }, [picked]);

  if (!picked || !words) return null;
  const rect = picked.range.getBoundingClientRect();
  const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - WIDTH - 8));
  // Below the selection, or above it where there's more room.
  const above = rect.bottom + 300 > window.innerHeight && rect.top > 300;
  const place = above
    ? { left, bottom: window.innerHeight - rect.top + 8 }
    : { left, top: rect.bottom + 8 };
  const listed = picked.strongs.slice(0, MOST);
  const text = picked.text.length > 120 ? `${picked.text.slice(0, 120)}…` : picked.text;

  return createPortal(
    // Mouse down in the tooltip keeps the selection (and so the tooltip).
    // biome-ignore lint/a11y/noStaticElementInteractions: it only keeps the selection from clearing.
    <div
      ref={tip}
      role="dialog"
      aria-label={t("tip.label")}
      className="study-tip"
      style={place}
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="study-tip-text">{`“${text}”`}</p>
      {listed.length === 0 ? (
        <p className="study-tip-empty">{t("tip.none")}</p>
      ) : (
        <ul className="study-tip-words">
          {listed.map((strong) => (
            <WordCard key={strong} strong={strong} lemma={lemmas[strong]} />
          ))}
        </ul>
      )}
      {picked.strongs.length > MOST ? (
        <p className="study-tip-empty">{t("tip.more", { count: picked.strongs.length - MOST })}</p>
      ) : null}
      <CopyButton text={picked.text} />
    </div>,
    document.body,
  );
}

function WordCard({ strong, lemma }: { strong: string; lemma: Lemma | null | undefined }) {
  const words = useStudy();
  const t = useTranslations("study");
  const [open, setOpen] = useState(false);
  const word = words?.[strong];
  if (!word) return null;
  const hebrew = strong.startsWith("H");
  return (
    <li className="study-tip-word">
      <div className="study-tip-head">
        <span className="study-word" data-category={word.category}>
          <span lang={hebrew ? "he" : "grc"} dir={hebrew ? "rtl" : "ltr"}>
            {word.headword ?? strong}
          </span>
        </span>
        <span className="study-tip-number">{strong}</span>
        <span className="study-tip-kind">{t(`category.${word.category}`)}</span>
      </div>
      {word.gloss ? <p className="study-tip-gloss">{word.gloss}</p> : null}
      {lemma ? (
        <p className="study-tip-used">{t("tip.used", { count: lemma.occurrences })}</p>
      ) : null}
      {lemma && lemma.entries.length > 0 ? (
        <>
          <button
            type="button"
            className="study-tip-button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {t("tip.dictionary")}
          </button>
          {open ? (
            <dl className="study-tip-entries">
              {lemma.entries.map((e) => (
                <div key={e.lexicon}>
                  <dt>{e.name}</dt>
                  <dd>{e.summary}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations("study");
  const [copied, setCopied] = useState(false);
  return (
    <div className="study-tip-actions">
      <button
        type="button"
        className="study-tip-button"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => setCopied(true));
        }}
      >
        {copied ? t("tip.copied") : t("tip.copy")}
      </button>
    </div>
  );
}
