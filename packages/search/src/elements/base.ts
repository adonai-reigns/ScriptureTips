import { LitElement, type PropertyValues } from "lit";
import type { SearchEngine } from "../engine.ts";
import { DEFAULT_INSTANCE, getSearch } from "../registry.ts";
import type { SearchOptions } from "../types.ts";

const words = (text: string): string[] => text.split(/[\s,]+/).filter(Boolean);

/**
 * What every ScriptureTips search element is: bound to a named instance (the `instance`
 * attribute, "default" without one) whose state it draws, so elements with the same name, wherever
 * they sit on the page, show one search. The scope attributes (`kinds`, `translations`, `limit`,
 * `endpoint`, space or comma separated) set that instance's scope.
 */
export abstract class SearchElement extends LitElement {
  static override properties = {
    instance: { type: String, reflect: true },
    kinds: { type: String },
    translations: { type: String },
    limit: { type: Number },
    previewLength: { type: Number, attribute: "preview-length" },
    endpoint: { type: String },
  };

  declare instance: string;
  declare kinds: string | undefined;
  declare translations: string | undefined;
  declare limit: number | undefined;
  declare previewLength: number | undefined;
  declare endpoint: string | undefined;

  /** The instance this element draws; set while it's connected. */
  protected engine: SearchEngine | null = null;
  private ends: (() => void)[] = [];

  constructor() {
    super();
    this.instance = DEFAULT_INSTANCE;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.attach();
  }

  override disconnectedCallback(): void {
    this.detach();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (!this.isConnected) return;
    if (changed.has("instance") && this.engine?.name !== this.instance) this.attach();
    else if (
      ["kinds", "translations", "limit", "previewLength", "endpoint"].some((k) => changed.has(k))
    )
      this.applyScope();
  }

  /** The events this element passes on as DOM events (`st-…`), so plain markup can listen. */
  protected wire(_engine: SearchEngine): (() => void)[] {
    return [];
  }

  protected fire(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private attach(): void {
    this.detach();
    const engine = getSearch(this.instance);
    this.engine = engine;
    this.applyScope();
    this.ends = [engine.subscribe(() => this.requestUpdate()), ...this.wire(engine)];
    this.requestUpdate();
  }

  private detach(): void {
    for (const end of this.ends) end();
    this.ends = [];
    this.engine = null;
  }

  /** The instance's scope from this element's attributes, where it sets any. */
  private applyScope(): void {
    if (!this.engine) return;
    const scope: {
      kinds?: string[];
      translations?: string[];
      limit?: number;
      previewLength?: number;
    } = {};
    if (this.kinds) scope.kinds = words(this.kinds);
    if (this.translations) scope.translations = words(this.translations);
    if (this.limit !== undefined && !Number.isNaN(this.limit)) scope.limit = this.limit;
    if (this.previewLength !== undefined && !Number.isNaN(this.previewLength))
      scope.previewLength = this.previewLength;
    const options: { -readonly [K in keyof SearchOptions]: SearchOptions[K] } = {};
    if (Object.keys(scope).length > 0) options.scope = scope;
    if (this.endpoint) options.endpoint = this.endpoint;
    if (Object.keys(options).length > 0) this.engine.configure(options);
  }
}
