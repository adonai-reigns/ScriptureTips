"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** apps/api `CompositionView`. */
interface Composition {
  verses: number;
  sources: { id: string; abbreviation: string; name: string; verses: number; share: number }[];
  own: { verses: number; share: number };
}

interface Slice {
  key: string;
  label: string;
  title: string;
  verses: number;
  share: number;
  color: string;
}

/**
 * Categorical colors in a fixed order (checked against the panel color for lightness,
 * contrast and color-blind separation). The base always takes the first; other translations follow in ID order, so a
 * source keeps its color as shares change. Own wording has its own; translations past the fifth
 * fold into "Other".
 */
const BASE_COLOR = "#2a78d6";
const SOURCE_COLORS = ["#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const OWN_COLOR = "#6250d6";
const OTHER_COLOR = "#8a9099";

function slicesOf(c: Composition, base: string, t: (k: string) => string): Slice[] {
  const others = c.sources
    .filter((s) => s.id !== base)
    .map((s) => s.id)
    .sort();
  const colorOf = (id: string) =>
    id === base ? BASE_COLOR : (SOURCE_COLORS[others.indexOf(id)] ?? OTHER_COLOR);
  const slices: Slice[] = [];
  let other: Slice | undefined;
  for (const s of c.sources) {
    const color = colorOf(s.id);
    if (color === OTHER_COLOR) {
      other ??= { key: "other", label: t("other"), title: t("other"), verses: 0, share: 0, color };
      other.verses += s.verses;
      other.share = Math.round((other.share + s.share) * 10) / 10;
    } else
      slices.push({
        key: s.id,
        label: s.abbreviation,
        title: s.name,
        verses: s.verses,
        share: s.share,
        color,
      });
  }
  if (c.own.verses > 0)
    slices.push({
      key: "own",
      label: t("own"),
      title: t("own"),
      verses: c.own.verses,
      share: c.own.share,
      color: OWN_COLOR,
    });
  if (other) slices.push(other);
  return slices.filter((s) => s.verses > 0);
}

/**
 * Where the compilation's verses come from (vision §3.1): one horizontal bar split into each
 * translation's share, with a legend under it naming each and its percentage. Counting reads
 * every verse, so it loads after the page, showing a skeleton until then. `choices` fingerprints
 * the compilation's choices: when a change (such as a book's new translation) alters it, the bar
 * counts again, keeping the last result on show with a spinner until the new one arrives.
 */
export function CompositionChart({
  slug,
  base,
  choices,
}: {
  slug: string;
  base: string;
  choices: string;
}) {
  const t = useTranslations("composition");
  const [data, setData] = useState<Composition | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [active, setActive] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `choices` is what triggers a recount.
  useEffect(() => {
    let live = true;
    setState("loading");
    fetch(`/api/compilations/${slug}/composition`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((c: Composition) => {
        if (!live) return;
        setData(c);
        setState("ready");
      })
      .catch(() => live && setState("failed"));
    return () => {
      live = false;
    };
  }, [slug, choices]);

  const loading = state === "loading";
  const spinner = loading ? <span className="spinner" aria-hidden="true" /> : null;

  if (!data)
    return (
      <figure className="composition" aria-busy={loading}>
        <div className={`composition-bar skeleton${loading ? " pulsing" : ""}`} />
        <div className="composition-legend">
          {loading ? (
            <>
              <span className="skeleton-line" />
              <span className="skeleton-line short" />
              {spinner}
              <span className="visually-hidden">{t("loading")}</span>
            </>
          ) : (
            <span className="composition-status">{t("unavailable")}</span>
          )}
        </div>
      </figure>
    );

  const slices = slicesOf(data, base, t);
  const hover = (key: string) => ({
    onMouseEnter: () => setActive(key),
    onMouseLeave: () => setActive(null),
  });
  return (
    <figure className={`composition${loading ? " stale" : ""}`} aria-busy={loading}>
      <div className="composition-bar" role="img" aria-label={t("chartLabel")}>
        {slices.map((s) => (
          <span
            key={s.key}
            className={active && active !== s.key ? "faded" : undefined}
            style={{ flexGrow: s.verses, background: s.color }}
            title={t("sliceTitle", { source: s.title, count: s.verses })}
            {...hover(s.key)}
          />
        ))}
      </div>
      <ul className="composition-legend">
        {slices.map((s) => (
          <li
            key={s.key}
            className={active === s.key ? "active" : undefined}
            title={t("sliceTitle", { source: s.title, count: s.verses })}
            {...hover(s.key)}
          >
            <span className="swatch" style={{ background: s.color }} />
            <span className="composition-label">{s.label}</span>
            <span className="composition-share">{t("share", { share: s.share })}</span>
          </li>
        ))}
        {spinner ? (
          <li className="composition-busy" aria-hidden="true">
            {spinner}
          </li>
        ) : null}
        {state === "failed" ? <li className="composition-status">{t("unavailable")}</li> : null}
      </ul>
      <figcaption className="visually-hidden">{t("chartLabel")}</figcaption>
      <span role="status" className="visually-hidden">
        {loading ? t("loading") : ""}
      </span>
    </figure>
  );
}
