/** Reading the Open Siddur transcription and applying scan-checked corrections. */

/** One fix to the transcription, checked against the 1917 scan. */
export interface Correction {
  /** Short stable identifier, used in reports. */
  readonly id: string;
  /** Where the fix applies, e.g. "RUT 1:1-18". */
  readonly ref: string;
  /** Scan page(s) the fix was checked against (archive.org `jps1917` PDF page numbers). */
  readonly scanPage: string;
  /** What was wrong and what the scan shows. */
  readonly reason: string;
  /** Text to find. Each run of whitespace matches any run of whitespace. Must occur exactly once. */
  readonly find: string;
  /** Replacement text, in the transcription's own layout (verse numbers glued to the first word). */
  readonly replace: string;
}

/** Decodes the transcription (Windows-1252, CRLF line endings) to a string with LF line endings. */
export function decodeSource(bytes: Uint8Array): string {
  return new TextDecoder("windows-1252").decode(bytes).replace(/\r\n?/g, "\n");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findPattern(find: string): RegExp {
  const parts = find.trim().split(/\s+/).map(escapeRegExp);
  return new RegExp(parts.join("\\s+"), "g");
}

/** Applies each correction in order. Throws if a correction's text isn't found exactly once. */
export function applyCorrections(text: string, corrections: readonly Correction[]): string {
  let result = text;
  for (const correction of corrections) {
    const pattern = findPattern(correction.find);
    const matches = [...result.matchAll(pattern)];
    if (matches.length !== 1) {
      throw new Error(
        `Correction ${correction.id} (${correction.ref}): expected one match, found ${matches.length}`,
      );
    }
    const match = matches[0] as RegExpExecArray;
    result =
      result.slice(0, match.index) +
      correction.replace +
      result.slice(match.index + match[0].length);
  }
  return result;
}
