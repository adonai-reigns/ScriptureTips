"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { signOut } from "./AccountForm.tsx";

/**
 * The signed-in person's menu at the top right of the header: the handle opens a drop-down with
 * their profile, compilations and settings, and the sign-out button in its footer. It closes on
 * Escape, on a press outside it, and when focus leaves it; the arrow keys move between its items.
 */
export function AccountMenu({ label, compilations }: { label: string; compilations: boolean }) {
  const t = useTranslations("accountMenu");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const items = () => [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      setOpen(false);
      toggle.current?.focus();
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && open) {
      e.preventDefault();
      const all = items();
      const at = all.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === "ArrowDown" ? (at + 1) % all.length : (at - 1 + all.length) % all.length;
      all[next]?.focus();
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: it only handles the menu's keys and focus leaving it.
    <div
      ref={root}
      className="account-menu"
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={toggle}
        type="button"
        className="account-link account-menu-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label}
        <span aria-hidden="true"> ▾</span>
      </button>
      {open ? (
        <div className="account-menu-panel" role="menu" aria-label={label}>
          <a role="menuitem" href="/account">
            {t("profile")}
          </a>
          {compilations ? (
            <a role="menuitem" href="/compilations">
              {t("compilations")}
            </a>
          ) : null}
          <a role="menuitem" href="/account#settings">
            {t("settings")}
          </a>
          <div className="account-menu-footer">
            <button type="button" role="menuitem" onClick={signOut}>
              {t("signOut")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
