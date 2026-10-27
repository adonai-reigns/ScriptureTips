/**
 * Every USFM marker the import accepts, by what it does. A marker on no list stops the import
 * of that book: it is never dropped silently. Add a marker here only after deciding what it
 * means for the reader view.
 */

const markers = (list: string): ReadonlySet<string> => new Set(list.trim().split(/\s+/));

/** Book identification and names: `\h` and `\toc1`–`\toc3` give the translation's book names. */
export const IDENTIFICATION = markers("id ide h toc1 toc2 toc3 usfm rem sts");

/** Book titles, introductions and front matter: not verse text; counted, not imported yet. */
export const INTRODUCTION = markers(`
  mt1 mt2 mt3 mt4 mte1 mte2 imt1 imt2 imt3 ip ipi im imi ipq imq ipr iq1 iq2 ib ili ili1 ili2
  iex ie is1 is2 iot io1 io2
`);

/**
 * Headings before a verse: section headings, references, speakers, acrostic letters; and
 * `lit`, a liturgical note (JPS: the verse repeated after a book's last verse).
 */
export const HEADING = markers("s s1 s2 s3 s4 ms ms1 ms2 ms3 mr sr r sp qa d sd1 lit");

/** Paragraphs, poetry lines and lists: each starts a new block in the verse it falls in. */
export const BLOCK = markers(`
  p m po pr cls pmo pm pmc pmr pi pi1 pi2 pi3 mi nb pc ph1 ph2 q q1 q2 q3 q4 qr qc qm qm1 qm2
  qm3 qd lh li li1 li2 li3 li4 lf lim1 lim2 b
`);

/** Character styles kept as markup in the verse. */
export const CHARACTER = markers(`
  w wh wg wa
  add nd wj qs qt tl k bk pn png addpn ord sig sls dc rq qac lit ref jmp
  bd it bdit em sc sup no
  th1 th2 th3 th4 thr1 thr2 tc1 tc2 tc3 tc4 tcr1 tcr2 tcr3
`);

/** Footnotes and cross-references, kept with their content. */
export const NOTE = markers("f fe ef x ex");

/** Character styles inside a note. */
export const NOTE_CHARACTER = markers(`
  fr ft fq fqa fk fl fw fp fv fdc fm xo xt xq xta xk xop xot xnt xdc xrc
`);

/**
 * Milestones: word alignment to the original language (`zaln`, in the ULT and UST), and
 * translation sections (`ts`). Their content is kept; the milestones themselves are counted,
 * not imported (alignment comes with TranslationAlignment, domain-model §2.4).
 */
export const MILESTONE = markers("zaln-s zaln-e ts ts-s ts-e qt-s qt-e");

/** Chapter labels and published chapter numbers. */
export const CHAPTER_LABEL = markers("cl cp cd");
