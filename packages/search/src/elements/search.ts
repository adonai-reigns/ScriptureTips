import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { SearchElement } from "./base.ts";
import "./input.ts";
import "./results.ts";
import { searchStyles, tokens } from "./styles.ts";

/**
 * `<st-search instance="main">`: the field and the results together, for a page that wants both
 * in one place. A page that wants them apart (a big field at the top, the results in a column
 * elsewhere) uses `<st-search-input>` and `<st-search-results>` with the same `instance`.
 * Its attributes are the elements' (`size`, `placeholder`, `kinds`, `translations` …).
 */
export class StSearch extends SearchElement {
  static override properties = {
    ...SearchElement.properties,
    placeholder: { type: String },
    size: { type: String, reflect: true },
  };
  static override styles = [tokens, searchStyles];

  declare placeholder: string | undefined;
  declare size: string | undefined;

  protected override render() {
    return html`<div class="layout" part="search">
      <st-search-input
        instance=${this.instance}
        size=${ifDefined(this.size)}
        placeholder=${ifDefined(this.placeholder)}
        exportparts="form, input, button, suggestions, suggestion"
      ></st-search-input>
      <st-search-results
        instance=${this.instance}
        exportparts="results, status, group, heading, list, result, label, source, preview, snippet, hit, word, number, gloss, meta, note"
      >
        <slot name="idle" slot="idle"></slot>
      </st-search-results>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "st-search": StSearch;
  }
}
