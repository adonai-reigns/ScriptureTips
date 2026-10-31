/**
 * A small XML reader for the lexicon files (Strong's, Brown-Driver-Briggs, Abbott-Smith): the
 * element tree, attributes and text, with entities decoded. It reads well-formed files only
 * and ignores the DOCTYPE, comments and processing instructions. (No parser dependency: these
 * files are plain, and this keeps the import free of one.)
 */

export interface XmlElement {
  readonly name: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly children: readonly (XmlElement | string)[];
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decode(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name.startsWith("#x")) return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith("#")) return String.fromCodePoint(Number(name.slice(1)));
    return ENTITIES[name] ?? whole;
  });
}

const ATTRIBUTE = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function attributesOf(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of source.matchAll(ATTRIBUTE)) attrs[m[1] ?? ""] = decode(m[2] ?? m[3] ?? "");
  return attrs;
}

/** Parses a document; throws on a tag that doesn't close. */
export function parseXml(xml: string): XmlElement {
  const root: { name: string; attrs: Record<string, string>; children: (XmlElement | string)[] } = {
    name: "#document",
    attrs: {},
    children: [],
  };
  const stack = [root];
  let i = 0;
  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    const top = stack[stack.length - 1];
    if (!top) throw new Error("XML: unbalanced tags");
    if (lt === -1) {
      top.children.push(decode(xml.slice(i)));
      break;
    }
    if (lt > i) top.children.push(decode(xml.slice(i, lt)));
    if (xml.startsWith("<!--", lt)) {
      i = xml.indexOf("-->", lt) + 3;
    } else if (xml.startsWith("<![CDATA[", lt)) {
      const end = xml.indexOf("]]>", lt);
      top.children.push(xml.slice(lt + 9, end));
      i = end + 3;
    } else if (xml.startsWith("<?", lt)) {
      i = xml.indexOf("?>", lt) + 2;
    } else if (xml.startsWith("<!", lt)) {
      // A DOCTYPE, with its internal subset in [ ] if it has one.
      const bracket = xml.indexOf("[", lt);
      const close = xml.indexOf(">", lt);
      i = bracket !== -1 && bracket < close ? xml.indexOf("]>", bracket) + 2 : close + 1;
    } else if (xml.startsWith("</", lt)) {
      const end = xml.indexOf(">", lt);
      const name = xml.slice(lt + 2, end).trim();
      const done = stack.pop();
      if (!done || done.name !== name)
        throw new Error(`XML: </${name}> doesn't match <${done?.name}>`);
      i = end + 1;
    } else {
      const end = xml.indexOf(">", lt);
      const selfClosing = xml[end - 1] === "/";
      const inner = xml.slice(lt + 1, selfClosing ? end - 1 : end);
      const space = inner.search(/\s/);
      const name = space === -1 ? inner : inner.slice(0, space);
      const element = {
        name,
        attrs: space === -1 ? {} : attributesOf(inner.slice(space)),
        children: [] as (XmlElement | string)[],
      };
      top.children.push(element);
      if (!selfClosing) stack.push(element);
      i = end + 1;
    }
  }
  if (stack.length !== 1) throw new Error(`XML: <${stack[stack.length - 1]?.name}> never closes`);
  const first = root.children.find((c): c is XmlElement => typeof c !== "string");
  if (!first) throw new Error("XML: no root element");
  return first;
}

/** The text inside an element, markup removed, white space collapsed. */
export function textOf(node: XmlElement | string): string {
  const raw = (n: XmlElement | string): string =>
    typeof n === "string" ? n : n.children.map(raw).join("");
  return raw(node).replace(/\s+/g, " ").trim();
}

/** Every descendant element with this name, in document order. */
export function descendants(node: XmlElement, name: string): XmlElement[] {
  const out: XmlElement[] = [];
  const walk = (n: XmlElement) => {
    for (const child of n.children) {
      if (typeof child === "string") continue;
      if (child.name === name) out.push(child);
      walk(child);
    }
  };
  walk(node);
  return out;
}

/** The first child element with this name. */
export function child(node: XmlElement, name: string): XmlElement | undefined {
  return node.children.find((c): c is XmlElement => typeof c !== "string" && c.name === name);
}
