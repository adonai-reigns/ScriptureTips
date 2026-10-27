/**
 * A small XML reader for LEB.xml: elements, attributes, text and the five predefined entities.
 * The file has no comments, CDATA, DOCTYPE or namespaces; anything it doesn't expect is an error.
 */

export interface XmlElement {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly XmlNode[];
}

export type XmlNode = string | XmlElement;

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (entity, name: string) => {
    if (name.startsWith("#x")) return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith("#")) return String.fromCodePoint(Number(name.slice(1)));
    const value = ENTITIES[name];
    if (value === undefined) throw new Error(`Unknown entity ${entity}`);
    return value;
  });
}

const TAG = /<(\/?)([A-Za-z][\w.-]*)((?:\s+[\w.-]+\s*=\s*"[^"]*")*)\s*(\/?)>/y;
const ATTRIBUTE = /([\w.-]+)\s*=\s*"([^"]*)"/g;

/** The document's root element. */
export function parseXml(source: string): XmlElement {
  const text = source.replace(/^\uFEFF/, "").replace(/^<\?xml[^>]*\?>/, "");
  const root: { name: string; attributes: Record<string, string>; children: XmlNode[] } = {
    name: "",
    attributes: {},
    children: [],
  };
  const stack = [root];
  let at = 0;
  while (at < text.length) {
    const lt = text.indexOf("<", at);
    const end = lt < 0 ? text.length : lt;
    const top = stack.at(-1);
    if (!top) throw new Error("Unbalanced XML");
    if (end > at) top.children.push(decode(text.slice(at, end)));
    if (lt < 0) break;
    TAG.lastIndex = lt;
    const tag = TAG.exec(text);
    if (!tag) throw new Error(`Unreadable tag at ${text.slice(lt, lt + 40)}`);
    const [whole, closing, name = "", attributeText = "", selfClosing] = tag;
    if (closing) {
      if (top.name !== name) throw new Error(`</${name}> closes <${top.name}>`);
      stack.pop();
    } else {
      const attributes: Record<string, string> = {};
      for (const [, key = "", value = ""] of attributeText.matchAll(ATTRIBUTE))
        attributes[key] = decode(value);
      const element = { name, attributes, children: [] as XmlNode[] };
      top.children.push(element);
      if (!selfClosing) stack.push(element);
    }
    at = lt + whole.length;
  }
  if (stack.length !== 1) throw new Error(`<${stack.at(-1)?.name}> is never closed`);
  const elements = root.children.filter((n): n is XmlElement => typeof n !== "string");
  const [document] = elements;
  if (!document || elements.length !== 1) throw new Error("Expected one root element");
  return document;
}

/** All the text in a node. */
export function textOf(node: XmlNode): string {
  return typeof node === "string" ? node : node.children.map(textOf).join("");
}
