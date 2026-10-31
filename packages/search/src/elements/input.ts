import { html, nothing } from "lit";
import type { SearchEngine } from "../engine.ts";
import type { Suggestion } from "../types.ts";
import { SearchElement } from "./base.ts";
import { inputStyles, tokens } from "./styles.ts";

/**
 * `<st-search-input instance="main">`: the search field, with suggestions as the user types. It
 * draws the instance's query, so setting it through the API fills the field. Attributes:
 * `size="large"` for a big field, `placeholder`, `hide-button`.
 *
 * It passes on the instance's events as DOM events: `st-type`, `st-suggest`, `st-search`.
 */
export class StSearchInput extends SearchElement {
  static override properties = {
    ...SearchElement.properties,
    placeholder: { type: String },
    size: { type: String, reflect: true },
    hideButton: { type: Boolean, attribute: "hide-button" },
    open: { state: true },
    active: { state: true },
  };
  static override styles = [tokens, inputStyles];

  declare placeholder: string | undefined;
  declare size: string | undefined;
  declare hideButton: boolean;
  declare open: boolean;
  declare active: number;

  constructor() {
    super();
    this.hideButton = false;
    this.open = false;
    this.active = -1;
  }

  protected override wire(engine: SearchEngine): (() => void)[] {
    return [
      engine.onType((e) => this.fire("st-type", e)),
      engine.onSuggest((e) => this.fire("st-suggest", e)),
      engine.onSearch((e) => this.fire("st-search", e)),
    ];
  }

  private choose(suggestion: Suggestion): void {
    const engine = this.engine;
    if (!engine) return;
    this.open = false;
    this.active = -1;
    // A book starts a reference, so the user goes on typing; a word is searched.
    if (suggestion.kind === "book") engine.setQuery(`${suggestion.text} `);
    else void engine.setQuery(suggestion.text, { search: true });
  }

  private onKey(e: KeyboardEvent): void {
    const options = this.engine?.getState().suggestions ?? [];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (options.length === 0) return;
      e.preventDefault();
      this.open = true;
      // Down and up go round the suggestions, with "none" (-1) between the last and the first.
      const last = options.length - 1;
      if (e.key === "ArrowDown") this.active = this.active >= last ? -1 : this.active + 1;
      else this.active = this.active <= -1 ? last : this.active - 1;
    } else if (e.key === "Enter" && this.open && this.active >= 0) {
      const picked = options[this.active];
      if (picked) {
        e.preventDefault();
        this.choose(picked);
      }
    } else if (e.key === "Escape") {
      this.open = false;
      this.active = -1;
    }
  }

  protected override render() {
    const engine = this.engine;
    if (!engine) return nothing;
    const state = engine.getState();
    const t = engine.strings;
    const options = state.suggestions;
    const showing = this.open && options.length > 0;
    return html`
      <form
        part="form"
        role="search"
        @submit=${(e: Event) => {
          e.preventDefault();
          this.open = false;
          void engine.doSearch();
        }}
      >
        <input
          part="input"
          type="search"
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          aria-expanded=${showing ? "true" : "false"}
          aria-controls="suggestions"
          aria-activedescendant=${showing && this.active >= 0 ? `s${this.active}` : nothing}
          aria-label=${t.label}
          placeholder=${this.placeholder ?? t.placeholder}
          .value=${state.query}
          @input=${(e: Event) => {
            this.open = true;
            this.active = -1;
            engine.type((e.target as HTMLInputElement).value);
          }}
          @keydown=${(e: KeyboardEvent) => this.onKey(e)}
          @blur=${() => {
            this.open = false;
          }}
        />
        ${this.hideButton ? nothing : html`<button part="button" type="submit">${t.search}</button>`}
        ${
          showing
            ? html`<ul id="suggestions" part="suggestions" role="listbox" aria-label=${t.suggestions}>
                ${options.map(
                  (o, i) => html`<li
                    id=${`s${i}`}
                    part="suggestion"
                    role="option"
                    aria-selected=${i === this.active ? "true" : "false"}
                    @mousedown=${(e: Event) => {
                      e.preventDefault();
                      this.choose(o);
                    }}
                  >
                    ${o.text}${o.kind === "book" ? html`<small>${t.kinds["reference"] ?? ""}</small>` : nothing}
                  </li>`,
                )}
              </ul>`
            : nothing
        }
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "st-search-input": StSearchInput;
  }
}
