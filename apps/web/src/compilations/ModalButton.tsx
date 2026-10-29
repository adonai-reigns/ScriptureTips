"use client";

import { type ReactNode, useId, useRef } from "react";
import { useHydrated } from "../hydrated.ts";

/**
 * A button that opens its content in a modal dialog (the native `<dialog>`, so focus stays
 * inside it and Escape closes it). A click on the backdrop or the close button closes it too.
 * The content stays mounted while closed, so its state (a build being followed) carries on.
 */
export function ModalButton({
  label,
  title,
  closeLabel,
  danger = false,
  children,
}: {
  label: string;
  title: string;
  closeLabel: string;
  /** Red, for an action that can't be undone. */
  danger?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const hydrated = useHydrated();
  return (
    <>
      <button
        type="button"
        className={`action-button${danger ? " danger" : ""}`}
        aria-haspopup="dialog"
        disabled={!hydrated}
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </button>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the backdrop click adds to Escape and the close button. */}
      <dialog
        ref={dialog}
        className="modal"
        aria-labelledby={heading}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="modal-body">
          <header className="modal-header">
            <h2 id={heading}>{title}</h2>
            <button
              type="button"
              className="modal-close"
              aria-label={closeLabel}
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </header>
          {children}
        </div>
      </dialog>
    </>
  );
}
