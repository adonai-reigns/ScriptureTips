// The cover (book-designer.md §6.1): back, spine and front as one spread with bleed. The
// spine width comes from the interior's page count and the paper's thickness.

#let book = json("book.json")
#let f = book.format
#let pages = int(sys.inputs.at("pages", default: "100"))
#let b = f.bleed * 1mm
#let W = f.width * 1mm
#let H = f.height * 1mm
#let spine = pages * f.caliper * 1mm

#set page(width: 2 * W + spine + 2 * b, height: H + 2 * b, margin: 0pt, fill: rgb("#1f3a5f"))
#set text(font: book.fonts.body, fill: white)

// Back cover.
#place(top + left, dx: b + 14mm, dy: b + 30mm, block(width: W - 28mm, text(size: 10pt, book.subtitle)))
// Spine: the title, rotated, centered on the spine.
#place(top + left, dx: b + W, dy: b, box(width: spine, height: H, align(center + horizon,
  rotate(90deg, reflow: true, text(size: calc.min(14, spine / 1mm * 0.6) * 1pt, smallcaps(book.title)))))))
// Front cover.
#place(top + left, dx: b + W + spine, dy: b, box(width: W, height: H, align(center + horizon, {
  text(size: 30pt, smallcaps(book.title))
  v(8mm)
  text(size: 12pt, style: "italic", book.subtitle)
})))
