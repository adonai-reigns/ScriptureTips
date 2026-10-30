"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import { useErrorText } from "./errors.ts";
import { type BookSourceChoice, type SourceMenuSpec, useSourceChange } from "./SourceMenu.tsx";

/**
 * A translation menu as a phone has it: a modal dialog, opened by a long press on a book or a
 * section's tab (where a computer shows a ⋮ on hover). Its ×, Escape, or a tap on the dimmed
 * page behind it closes it.
 */
export function SourceDialog({
  menu,
  sources,
  onClose,
}: {
  /** What it changes; closed while null. */
  menu: SourceMenuSpec | null;
  sources: BookSourceChoice[];
  onClose: () => void;
}) {
  // A new menu starts afresh (no error or busy state from the last one).
  return menu ? (
    <Dialog key={menu.endpoint} menu={menu} sources={sources} onClose={onClose} />
  ) : null;
}

function Dialog({
  menu,
  sources,
  onClose,
}: {
  menu: SourceMenuSpec;
  sources: BookSourceChoice[];
  onClose: () => void;
}) {
  const t = useTranslations("bookTabs");
  const errorText = useErrorText();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  // Only a tap that starts on the backdrop closes it, not the end of the press that opened it.
  const downOnBackdrop = useRef(false);
  const { busy, error, choose } = useSourceChange(menu, () => dialog.current?.close());

  // Opened once it's drawn. (Not closed on unmount: React's development run mounts it twice, and
  // the close event from the first would arrive after it opened again, and shut it.)
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the backdrop tap adds to Escape and the close button.
    <dialog
      ref={dialog}
      className="modal source-dialog"
      aria-labelledby={heading}
      aria-busy={busy}
      onClose={onClose}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === dialog.current;
      }}
      onClick={(e) => {
        if (e.target === dialog.current && downOnBackdrop.current) dialog.current.close();
      }}
    >
      <div className="modal-body">
        <header className="modal-header">
          <h2 id={heading}>{menu.heading}</h2>
          <button
            type="button"
            className="modal-close"
            aria-label={t("close")}
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </header>
        <ul className="source-dialog-list">
          {sources.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={busy}
                aria-current={s.id === menu.current ? "true" : undefined}
                onClick={() => choose(s)}
              >
                {s.label}
                {s.id === menu.current ? <small> {t("current")}</small> : null}
              </button>
            </li>
          ))}
        </ul>
        {error ? (
          <p role="alert" className="error">
            {errorText(error)}
          </p>
        ) : null}
      </div>
    </dialog>
  );
}
