/** The parts of usfm-grammar (a CommonJS package without types) that the import uses. */
declare module "usfm-grammar" {
  export class USFMParser {
    constructor(usfm: string);
    /** Errors found while parsing; empty when the USFM is valid. */
    readonly errors: readonly unknown[];
    toUSJ(excludeMarkers?: null, includeMarkers?: null, ignoreErrors?: boolean): unknown;
  }
  const grammar: { USFMParser: typeof USFMParser };
  export default grammar;
}
