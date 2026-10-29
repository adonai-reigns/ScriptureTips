// The interior (book-designer.md §9): lays out the neutral book description in book.json
// (packages/book). Every page is the trim size plus bleed on all sides, so a full-bleed page
// prints to the trimmed edge. Compile: typst compile --font-path <fonts> book.typ book.pdf

#let book = json("book.json")
#let f = book.format
#let b = f.bleed * 1mm
#let W = f.width * 1mm
#let H = f.height * 1mm
#let gutter = f.gutter * 1mm
#let center-width = 12mm

#set document(title: book.title)
#set page(
  width: W + 2 * b,
  height: H + 2 * b,
  margin: (
    top: f.margins.top * 1mm + b,
    bottom: f.margins.bottom * 1mm + b,
    inside: f.margins.inner * 1mm + b,
    outside: f.margins.outer * 1mm + b,
  ),
  binding: left,
)
#set text(font: book.fonts.body, size: f.fontSize * 1pt, lang: "en", hyphenate: true)
#set par(justify: true, leading: (f.leading - f.fontSize) * 1pt + 0.2em, spacing: (f.leading - f.fontSize) * 1pt + 0.2em)
#set footnote(numbering: "a")
#set footnote.entry(separator: line(length: 25%, stroke: 0.4pt), gap: 0.3em, indent: 0em)
#show footnote.entry: set text(size: 0.78em)
#show footnote.entry: set par(leading: 0.3em, justify: false)

// The verse range of the page: "Genesis 1:1–2:3". Each verse updates `current`; the head reads
// it at the top of the page and at the page's foot (a marker the footer leaves). Querying every
// verse from every page instead is quadratic, and a whole Bible never finishes.
#let current = state("verse", none)
#let page-end() = context [#metadata(here().page())<page-end>]
#let running-head() = context {
  let p = here().page()
  let end = query(<page-end>).find(e => e.value == p)
  let last = if end != none { current.at(end.location()) } else { current.get() }
  if last == none { return }
  let first = current.get()
  // A page that opens a book starts at its first verse, not the last of the book before.
  if first == none or first.book != last.book { first = (book: last.book, cv: last.cv.split(":").first() + ":1") }
  let range = if first.cv == last.cv {
    first.book + " " + first.cv
  } else if first.cv.split(":").first() == last.cv.split(":").first() {
    first.book + " " + first.cv + "–" + last.cv.split(":").last()
  } else {
    first.book + " " + first.cv + "–" + last.cv
  }
  set text(size: 0.85em)
  if calc.even(p) [#str(p) #h(1fr) #smallcaps(range) #h(1fr)] else [#h(1fr) #smallcaps(range) #h(1fr) #str(p)]
}

// Notes in the center column, beside the line of their verse; pushed down so none overlap.
#let center-notes() = context {
  let p = here().page()
  let notes = query(<cnote>).filter(n => n.location().page() == p)
  if notes.len() == 0 { return }
  let x = b + (if calc.even(p) { f.margins.outer } else { f.margins.inner }) * 1mm
  let text-width = W - (f.margins.inner + f.margins.outer) * 1mm
  let cx = x + (text-width - center-width) / 2
  let y = 0pt
  for n in notes {
    let body = block(width: center-width, text(size: 6pt, hyphenate: true, par(justify: false, leading: 0.25em)[*#n.value.ref* #n.value.text]))
    let ny = calc.max(n.location().position().y, y)
    place(top + left, dx: cx, dy: ny, body)
    y = ny + measure(body).height + 1.5pt
  }
}

#let plain(runs) = for r in runs {
  if r.t == "text" { r.text } else if r.t == "style" { plain(r.runs) } else if r.t == "idiom" { plain(r.runs) } else { "" }
}

#let render(runs, name, notes) = for r in runs {
  if r.t == "text" {
    r.text
  } else if r.t == "style" {
    let inner = render(r.runs, name, notes)
    if r.style == "italic" { emph(inner) } else if r.style == "bold" { strong(inner) } else { smallcaps(inner) }
  } else if r.t == "idiom" {
    [⸤#render(r.runs, name, notes)⸥]
  } else if r.t == "chapter" {
    current.update((book: name, cv: str(r.number) + ":1"))
    // A large numeral two lines tall. Typst has no drop cap that text wraps around yet
    // (pdf-engine-trial.md §3, follow-up 1).
    box(height: 0.75em, align(bottom, text(size: 2.3em, weight: "bold", baseline: 0.15em, str(r.number))))
    if r.at("mark", default: none) != none { super(size: 0.62em, r.mark) }
    h(0.2em)
  } else if r.t == "verse" {
    h(0.25em, weak: true)
    current.update((book: name, cv: r.cv))
    [#super(typographic: false, size: 0.62em, text(weight: "bold", r.label + r.at("mark", default: "")))]
    h(0.08em, weak: true)
  } else if r.t == "note" {
    if notes == "foot" {
      footnote[*#r.cv* #render(r.body, name, "none")]
    } else if notes == "center" {
      [#metadata((ref: r.cv, text: plain(r.body)))<cnote>#super(size: 0.6em, sym.dagger)]
    }
  } else if r.t == "designation" {
    [ (#r.text)]
  }
}

#let scripture(el) = {
  set page(columns: 2, header: running-head(), footer: page-end(), foreground: if el.notes == "center" { center-notes() })
  set columns(gutter: if el.notes == "center" { center-width + 2 * gutter } else { gutter })
  place(top + center, scope: "parent", float: true, clearance: 4mm, text(size: 1.8em, smallcaps(el.name)))
  for c in el.chapters {
    counter(footnote).update(0)
    for blk in c.blocks {
      if blk.kind == "heading" {
        block(above: 0.9em, below: 0.4em, sticky: true, align(center, text(style: "italic", render(blk.runs, el.headName, el.notes))))
      } else if blk.kind == "break" {
        v(0.4em)
      } else if blk.kind == "paragraph" {
        par(first-line-indent: (amount: 1em, all: true), render(blk.runs, el.headName, el.notes))
      } else {
        let indent = if blk.kind == "poetry1" { 1em } else { 2em }
        par(justify: false, hanging-indent: 2em, first-line-indent: 0em, [#h(indent)#render(blk.runs, el.headName, el.notes)])
      }
    }
  }
}

#for el in book.body {
  if el.type == "title" {
    set page(header: none, columns: 1)
    align(center + horizon, {
      text(size: 2.4em, smallcaps(book.title))
      v(1em)
      text(size: 1.1em, style: "italic", book.subtitle)
    })
    pagebreak()
  } else if el.type == "credits" {
    set page(header: none, columns: 1)
    align(bottom, {
      set text(size: 0.8em)
      for c in book.credits { par(justify: false, c) }
    })
    pagebreak()
  } else if el.type == "scripture" {
    scripture(el)
  }
}
