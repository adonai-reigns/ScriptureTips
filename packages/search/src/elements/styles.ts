import { css } from "lit";

/**
 * The elements' look. Every color and size is a CSS custom property with a fallback, so a page
 * themes the widget without touching its insides: `--st-search-accent`, `--st-search-ink`,
 * `--st-search-muted`, `--st-search-rule`, `--st-search-background`, `--st-search-hit`,
 * `--st-search-radius`. (A page that already defines `--deep`, `--ink`, `--muted`, `--rule` and
 * `--paper`, as the ScriptureTips app does, needs none.) Inner pieces are `part`s too.
 */
export const tokens = css`
  :host {
    --_accent: var(--st-search-accent, var(--deep, #0054a5));
    --_ink: var(--st-search-ink, var(--ink, #1d232a));
    --_muted: var(--st-search-muted, var(--muted, #5b6672));
    --_rule: var(--st-search-rule, var(--rule, #dfe3e6));
    --_background: var(--st-search-background, var(--paper, #fff));
    --_hit: var(--st-search-hit, rgb(237 161 0 / 0.35));
    --_radius: var(--st-search-radius, 0.4rem);
    color: var(--_ink);
    font: inherit;
  }

  [hidden] {
    display: none !important;
  }
`;

export const inputStyles = css`
  :host {
    display: block;
  }

  form {
    position: relative;
    display: flex;
    gap: 0.5rem;
  }

  input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    padding: 0.5rem 0.7rem;
    font: inherit;
    color: var(--_ink);
    background: var(--_background);
    border: 1px solid var(--_muted);
    border-radius: var(--_radius);
  }

  input:focus-visible,
  button:focus-visible,
  [role="option"][aria-selected="true"] {
    outline: 2px solid var(--_accent);
    outline-offset: 1px;
  }

  button {
    font: inherit;
    padding: 0 1rem;
    color: #fff;
    background: var(--_accent);
    border: 1px solid var(--_accent);
    border-radius: var(--_radius);
    cursor: pointer;
  }

  :host([size="large"]) input {
    padding: 0.9rem 1.1rem;
    font-size: 1.5rem;
  }

  :host([size="large"]) button {
    padding: 0 1.6rem;
    font-size: 1.2rem;
  }

  ul {
    position: absolute;
    z-index: 10;
    inset-inline: 0;
    top: 100%;
    margin: 0.2rem 0 0;
    padding: 0.25rem 0;
    list-style: none;
    background: var(--_background);
    border: 1px solid var(--_rule);
    border-radius: var(--_radius);
    box-shadow: 0 0.4rem 1rem rgb(0 30 60 / 0.15);
  }

  li {
    padding: 0.35rem 0.8rem;
    cursor: pointer;
  }

  li:hover,
  li[aria-selected="true"] {
    background: color-mix(in srgb, var(--_accent) 10%, transparent);
  }

  li small {
    margin-inline-start: 0.5rem;
    color: var(--_muted);
  }
`;

export const resultsStyles = css`
  :host {
    display: block;
  }

  .status,
  .note {
    margin: 0.5rem 0;
    color: var(--_muted);
  }

  .status[role="alert"] {
    color: #b42318;
  }

  h3 {
    margin: 1rem 0 0.35rem;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--_muted);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.35rem;
  }

  .result {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 0.5rem 0.7rem;
    font: inherit;
    text-align: start;
    color: inherit;
    background: var(--_background);
    border: 1px solid var(--_rule);
    border-radius: var(--_radius);
    cursor: pointer;
  }

  .result:hover {
    border-color: var(--_accent);
  }

  .result:focus-visible {
    outline: 2px solid var(--_accent);
    outline-offset: 1px;
  }

  .result[aria-current="true"] {
    border-color: var(--_accent);
    background: color-mix(in srgb, var(--_accent) 8%, var(--_background));
  }

  .label {
    font-weight: 600;
  }

  .source,
  .meta,
  .number {
    margin-inline-start: 0.5rem;
    font-size: 0.85rem;
    color: var(--_muted);
  }

  .snippet,
  .preview,
  .gloss {
    display: block;
    margin-top: 0.15rem;
  }

  .word {
    font-size: 1.15rem;
  }

  mark {
    padding: 0 0.1em;
    color: inherit;
    background: var(--_hit);
    border-radius: 0.15em;
  }
`;

export const searchStyles = css`
  :host {
    display: block;
  }

  .layout {
    display: grid;
    gap: 1rem;
  }
`;
