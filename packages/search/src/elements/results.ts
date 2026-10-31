import { html, nothing } from "lit";
import type { SearchEngine } from "../engine.ts";
import { fill } from "../strings.ts";
import type { SearchResult } from "../types.ts";
import { SearchElement } from "./base.ts";
import { resultsStyles, tokens } from "./styles.ts";

/**
 * `<st-search-results instance="main">`: the instance's results as a list, grouped by kind, and
 * its status (searching, none, failed). Picking one calls the instance's `select`. Anything put
 * inside shows until a search is made (`slot="idle"`).
 *
 * It passes on the instance's events as DOM events: `st-results`, `st-select`, `st-error`.
 */
export class StSearchResults extends SearchElement {
  static override styles = [tokens, resultsStyles];

  protected override wire(engine: SearchEngine): (() => void)[] {
    return [
      engine.onResults((e) => this.fire("st-results", e)),
      engine.onResultsSelect((e) => this.fire("st-select", e)),
      engine.onError((e) => this.fire("st-error", e)),
    ];
  }

  private item(r: SearchResult, selected: boolean) {
    const engine = this.engine;
    const t = engine?.strings;
    let body: unknown;
    if (r.kind === "reference") {
      body = html`<span class="label" part="label">${r.label}</span
        ><span class="source" part="source">${r.translation.abbreviation}</span
        >${r.preview ? html`<span class="preview" part="preview">${r.preview}</span>` : nothing}`;
    } else if (r.kind === "text") {
      body = html`<span class="label" part="label">${r.label}</span
        ><span class="source" part="source">${r.translation.abbreviation}</span
        ><span class="snippet" part="snippet"
          >${r.snippet.map((p) => (p.hit ? html`<mark part="hit">${p.t}</mark>` : p.t))}</span
        >`;
    } else {
      const hebrew = r.strong.startsWith("H");
      body = html`<span class="word" part="word" lang=${hebrew ? "he" : "grc"} dir=${hebrew ? "rtl" : "ltr"}
          >${r.headword ?? r.strong}</span
        ><span class="number" part="number">${r.strong}</span
        >${r.gloss ? html`<span class="gloss" part="gloss">${r.gloss}</span>` : nothing}<span
          class="meta"
          part="meta"
          >${r.category}${r.occurrences > 0 && t ? ` · ${fill(t.occurrences, { count: r.occurrences })}` : ""}</span
        >`;
    }
    return html`<li>
      <button
        type="button"
        class="result"
        part="result"
        aria-current=${selected ? "true" : nothing}
        @click=${() => engine?.select(r.id)}
      >
        ${body}
      </button>
    </li>`;
  }

  protected override render() {
    const engine = this.engine;
    if (!engine) return nothing;
    const state = engine.getState();
    const t = engine.strings;
    if (state.status === "idle") return html`<slot name="idle"></slot>`;
    // The kinds, in the order the results first come in.
    const kinds = [...new Set(state.results.map((r) => r.kind))];
    return html`<div part="results" aria-live="polite" aria-label=${t.results}>
      ${state.status === "searching" ? html`<p class="status" part="status">${t.searching}</p>` : nothing}
      ${state.status === "error" ? html`<p class="status" part="status" role="alert">${t.failed}</p>` : nothing}
      ${
        state.status === "done" && state.results.length === 0
          ? html`<p class="status" part="status">${t.noResults}</p>`
          : nothing
      }
      ${kinds.map(
        (kind) => html`<section part="group">
          <h3 part="heading">${t.kinds[kind] ?? kind}</h3>
          <ul part="list">
            ${state.results.filter((r) => r.kind === kind).map((r) => this.item(r, r.id === state.selected))}
          </ul>
        </section>`,
      )}
      ${
        state.unavailable.length > 0
          ? html`<p class="note" part="note">${fill(t.unavailable, { kinds: state.unavailable.map((k) => t.kinds[k] ?? k).join(", ") })}</p>`
          : nothing
      }
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "st-search-results": StSearchResults;
  }
}
