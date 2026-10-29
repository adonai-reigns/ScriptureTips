/**
 * The trial's LaTeX renderer (book-designer.md §9): writes the neutral book description as a
 * LuaLaTeX document. Every page is the trim size plus bleed on all sides, with the PDF's TrimBox
 * and BleedBox set for the printer. Notes in a center column are placed in a second pass, from
 * the positions LuaTeX records while shipping out the first.
 */

import type { Block, Book, Element, InterlinearVerse, Run } from "./book.ts";

const ESCAPES: Readonly<Record<string, string>> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  $: "\\$",
  "&": "\\&",
  "#": "\\#",
  "^": "\\textasciicircum{}",
  _: "\\_",
  "%": "\\%",
  "~": "\\textasciitilde{}",
};

export const texEscape = (text: string) => text.replace(/[\\{}$&#^_%~]/g, (c) => ESCAPES[c] ?? c);

const bp = (mm: number) => ((mm * 72) / 25.4).toFixed(2);

function preamble(book: Book, fonts: string, paperWidth: number): string {
  const f = book.format;
  const dir = `${fonts}/`;
  return String.raw`\documentclass[twoside]{article}
\usepackage[paperwidth=${paperWidth}mm, paperheight=${f.height + 2 * f.bleed}mm,
  top=${f.margins.top + f.bleed}mm, bottom=${f.margins.bottom + f.bleed}mm,
  inner=${f.margins.inner + f.bleed}mm, outer=${f.margins.outer + f.bleed}mm,
  columnsep=${f.gutter}mm, headsep=3mm, headheight=12pt, footskip=0mm]{geometry}
\usepackage[bidi=basic, english]{babel}
\babelprovide[import]{hebrew}
\babelfont{rm}[Path=${dir}, UprightFont=Gentium-Regular.ttf, ItalicFont=Gentium-Italic.ttf, BoldFont=Gentium-Bold.ttf, BoldItalicFont=Gentium-BoldItalic.ttf]{Gentium}
\babelfont[hebrew]{rm}[Path=${dir}]{SILEOT.ttf}
\usepackage{graphicx, xcolor, lettrine, fancyhdr, alphalph}
% Character protrusion and font expansion even out the narrow justified columns.
\usepackage{microtype}
\setlength{\emergencystretch}{1.5em}
\pdfvariable pageattr{/TrimBox [${bp(f.bleed)} ${bp(f.bleed)} ${bp(f.width + f.bleed)} ${bp(f.height + f.bleed)}] /BleedBox [0 0 ${bp(paperWidth)} ${bp(f.height + 2 * f.bleed)}]}
% \normalsize is reset at \begin{document}, so the body size is set there.
\AtBeginDocument{\fontsize{${f.fontSize}pt}{${f.leading}pt}\selectfont}
\setlength{\parskip}{0pt}
\setlength{\parindent}{1em}
`;
}

function runs(
  list: readonly Run[],
  notes: "foot" | "center" | "none",
  ids: { n: number; book: string },
): string {
  return list
    .map((r): string => {
      switch (r.t) {
        case "text":
          return texEscape(r.text);
        case "style": {
          const inner = runs(r.runs, notes, ids);
          return r.style === "italic"
            ? `\\textit{${inner}}`
            : r.style === "bold"
              ? `\\textbf{${inner}}`
              : `\\textsc{${inner}}`;
        }
        case "idiom":
          return `⸤${runs(r.runs, notes, ids)}⸥`;
        case "chapter":
          return `\\versemark{${texEscape(ids.book)}|${r.number}:1}\\noindent\\lettrine[lines=2, findent=0.25em, nindent=0pt]{${r.number}}{}`;
        case "verse":
          return `\\versemark{${texEscape(ids.book)}|${texEscape(r.ref.split(" ").at(-1) ?? "")}}\\versenum{${texEscape(r.label)}}`;
        case "note":
          if (notes === "foot")
            return `\\footnote{\\textbf{${texEscape(r.ref)}} ${runs(r.body, "none", ids)}}`;
          if (notes === "center") {
            ids.n += 1;
            return `\\expandafter\\def\\csname cnotetext-${ids.n}\\endcsname{\\textbf{${texEscape(r.ref)}} ${runs(r.body, "none", ids)}}\\cnote{${ids.n}}`;
          }
          return "";
      }
      return "";
    })
    .join("");
}

function block(b: Block, notes: "foot" | "center", ids: { n: number; book: string }): string {
  if (b.kind === "break") return "\\par\\vspace{0.4em}\n";
  if (b.kind === "heading") return `\\sechead{${runs(b.runs, "none", ids)}}\n`;
  if (b.kind === "paragraph") return `\\par ${runs(b.runs, notes, ids)}\n`;
  const indent = b.kind === "poetry1" ? "1em" : "2em";
  return `\\par\\hangindent=2em\\hangafter=1\\noindent\\hspace*{${indent}}${runs(b.runs, notes, ids)}\n`;
}

function interlinear(verses: readonly InterlinearVerse[]): string {
  return verses
    .map(
      (v) =>
        `\\par\\vspace{0.6em}\\noindent\\foreignlanguage{english}{\\small\\textbf{${v.ref}}}\\quad ` +
        v.words
          .map((w) => `\\ilword{${texEscape(w.hebrew)}}{${texEscape(w.gloss)}}{${w.strong}}`)
          .join(" "),
    )
    .join("\n");
}

function element(
  book: Book,
  el: Element,
  ids: { n: number; book: string },
  bookName: { current: string },
): string {
  const f = book.format;
  switch (el.type) {
    case "title":
      return String.raw`\onecolumn\thispagestyle{empty}\null\vfill
\begin{center}{\fontsize{24}{28}\selectfont\textsc{${texEscape(book.title)}}}\par\vspace{1em}{\large\itshape ${texEscape(book.subtitle)}}\end{center}
\vfill\null\newpage
`;
    case "credits":
      return `\\thispagestyle{empty}\\null\\vfill{\\small ${book.credits.map(texEscape).join("\\par\\medskip ")}\\par}\\newpage\n`;
    case "scripture": {
      bookName.current = el.name;
      ids.book = el.name;
      const title = el.opensBook
        ? `\\twocolumn[{\\centering{\\Large\\textsc{${texEscape(el.name)}}}\\par\\vspace{4mm}}]`
        : el.notes === "center"
          ? "\\twocolumn"
          : "";
      const gutter =
        el.notes === "center"
          ? `\\clearpage\\setlength{\\columnsep}{${12 + 2 * f.gutter}mm}`
          : `\\setlength{\\columnsep}{${f.gutter}mm}`;
      const body = el.chapters
        .map(
          (c) =>
            "\\setcounter{footnote}{0}\n" + c.blocks.map((b) => block(b, el.notes, ids)).join(""),
        )
        .join("");
      return `${gutter}\\def\\bookname{${texEscape(el.name)}}${title}\n\\pagestyle{bible}\n${body}\\par\n`;
    }
    case "spread": {
      const w = 2 * f.width + 2 * f.bleed;
      const h = f.height + 2 * f.bleed;
      return String.raw`\onecolumn\clearpage\ifodd\value{page}\thispagestyle{empty}\null\newpage\fi
\AddToHookNext{shipout/background}{\setlength{\unitlength}{1mm}\put(0,-${h}){\includegraphics[width=${w}mm, height=${h}mm]{${el.image.pdf}}}}
\thispagestyle{empty}\null\newpage
\AddToHookNext{shipout/background}{\setlength{\unitlength}{1mm}\put(-${f.width},-${h}){\includegraphics[width=${w}mm, height=${h}mm]{${el.image.pdf}}}}
\thispagestyle{empty}\null\newpage
`;
    }
    case "interlinear":
      return String.raw`\onecolumn\clearpage\thispagestyle{empty}
\begin{center}\large ${texEscape(el.title)}\end{center}
\begin{otherlanguage}{hebrew}
${interlinear(el.verses)}
\end{otherlanguage}
\par\vspace{1em}\noindent{\footnotesize ${texEscape(el.credit)}\par}
`;
  }
  return "";
}

const MACROS = String.raw`
\makeatletter
\renewcommand{\thefootnote}{\alphalph{\value{footnote}}}
\renewcommand{\@makefntext}[1]{\noindent\makebox[1em][l]{\@thefnmark}#1}
\newcommand{\versenum}[1]{\unskip\hspace{0.25em}\textsuperscript{\bfseries #1}\hspace{0.08em}}
% Each verse marks the page with "Book|chapter:verse"; the head shows the page's first to last.
\NewMarkClass{verse}
\newcommand{\versemark}[1]{\InsertMark{verse}{#1}}
\newcommand{\sechead}[1]{\par\addvspace{0.9em}{\centering\itshape #1\par}\nopagebreak\vspace{0.3em}}
\newcommand{\ilword}[3]{\mbox{\begin{tabular}[t]{@{}c@{}}{\fontsize{15}{18}\selectfont #1}\\[-1pt]\foreignlanguage{english}{\fontsize{6.5}{8}\selectfont #2}\\[-3pt]\foreignlanguage{english}{\fontsize{5.5}{7}\selectfont\color{gray}#3}\end{tabular}}\hspace{4pt}}
\directlua{dofile("trial.lua")}
\fancypagestyle{bible}{\fancyhf{}\renewcommand{\headrulewidth}{0pt}
  \fancyhead[LE,RO]{\small\thepage}
  \fancyhead[C]{\small\textsc{\directlua{tex.sprint(verserange("\luaescapestring{\FirstMark{verse}}", "\luaescapestring{\LastMark{verse}}"))}}}}
% Center-column notes: the first pass records where each mark was shipped out (cnotes.pos); the
% second places each note at its line, pushed down so none overlap.
\newcommand{\cnote}[1]{\latelua{cnotesout:write("#1 " .. tex.count["ReadonlyShipoutCounter"] .. " " .. select(2, pdf.getpos()) .. "\string\n")}\textsuperscript{\dag}}
\newdimen\cnotebottom
\newdimen\cnotetop
\newbox\cnotebox
\newcommand{\cnoteplace}[2]{%
  \setbox\cnotebox\vtop{\hsize=12mm\fontsize{6}{7}\selectfont\raggedright\csname cnotetext-#1\endcsname}%
  \cnotetop=\dimexpr\paperheight-#2\relax
  \ifdim\cnotetop<\cnotebottom \cnotetop=\cnotebottom\fi
  \put(\strip@pt\dimexpr\cnotex\relax,-\strip@pt\cnotetop){\box\cnotebox}%
  \setbox\cnotebox\vtop{\hsize=12mm\fontsize{6}{7}\selectfont\raggedright\csname cnotetext-#1\endcsname}%
  \cnotebottom=\dimexpr\cnotetop+\ht\cnotebox+\dp\cnotebox+2pt\relax}
\AddToHook{shipout/background}{\setlength{\unitlength}{1pt}\cnotebottom=0pt
  \edef\cnotex{\the\dimexpr\ifodd\value{page}\oddsidemargin\else\evensidemargin\fi+1in+(\textwidth-12mm)/2\relax}%
  \directlua{cnotesfor(tex.count["ReadonlyShipoutCounter"])}}
\makeatother
`;

/** Lua for the head's verse range and the center-column notes, kept out of TeX's catcodes. */
export const LUA = String.raw`  function verserange(first, last)
    local fb, fc = first:match("^(.*)|(.*)$")
    local lb, lc = last:match("^(.*)|(.*)$")
    if not fb or not lb then return "" end
    if fb ~= lb then return fb .. " " .. fc .. "–" .. lb .. " " .. lc end
    if fc == lc then return fb .. " " .. fc end
    if fc:match("^(%d+):") == lc:match("^(%d+):") then return fb .. " " .. fc .. "–" .. lc:match(":(.*)$") end
    return fb .. " " .. fc .. "–" .. lc
  end
  cnotes = {}
  local old = io.open("cnotes.pos", "r")
  if old then
    for line in old:lines() do
      local n, page, y = line:match("(%d+) (%d+) (%-?%d+)")
      if n then table.insert(cnotes, { n = tonumber(n), page = tonumber(page), y = tonumber(y) }) end
    end
    old:close()
  end
  cnotesout = io.open("cnotes.pos", "w")
  function cnotesfor(page)
    for _, c in ipairs(cnotes) do
      if c.page == page then tex.sprint("\\cnoteplace{" .. c.n .. "}{" .. c.y .. "sp}") end
    end
  end
`;

function cover(book: Book, fonts: string, pages: number): string {
  const f = book.format;
  const spine = pages * f.caliper;
  const width = 2 * f.width + spine + 2 * f.bleed;
  const h = f.height + 2 * f.bleed;
  return `${preamble(book, fonts, width)}\\pagecolor[HTML]{1F3A5F}\\color{white}
\\begin{document}\\thispagestyle{empty}
\\AddToHookNext{shipout/foreground}{\\setlength{\\unitlength}{1mm}%
\\put(${f.bleed + 14},-${f.bleed + 40}){\\parbox[t]{${f.width - 28}mm}{\\small ${texEscape(book.subtitle)}}}%
\\put(${f.bleed + f.width + spine / 2},-${h / 2}){\\makebox(0,0){\\rotatebox{-90}{\\fontsize{${Math.min(14, spine * 0.6).toFixed(1)}}{16}\\selectfont\\textsc{${texEscape(book.title)}}}}}%
\\put(${f.bleed + f.width + spine + f.width / 2},-${h / 2}){\\makebox(0,0){\\parbox{${f.width}mm}{\\centering{\\fontsize{30}{36}\\selectfont\\textsc{${texEscape(book.title)}}}\\par\\vspace{8mm}{\\itshape ${texEscape(book.subtitle)}}}}}%
\\color[HTML]{88AACC}\\linethickness{0.1mm}\\put(${f.bleed + f.width},0){\\line(0,-1){${h}}}\\put(${f.bleed + f.width + spine},0){\\line(0,-1){${h}}}}
\\null
\\end{document}
`;
}

/** The interior, or with \`coverPages\` the cover for an interior of that many pages. */
export function renderLatex(book: Book, fonts: string, coverPages?: number): string {
  if (coverPages !== undefined) return cover(book, fonts, coverPages);
  const ids = { n: 0, book: "" };
  const bookName = { current: "" };
  const body = book.body.map((el) => element(book, el, ids, bookName)).join("\n");
  return `${preamble(book, fonts, book.format.width + 2 * book.format.bleed)}${MACROS}\\def\\bookname{}\n\\begin{document}\n${body}\n\\end{document}\n`;
}
