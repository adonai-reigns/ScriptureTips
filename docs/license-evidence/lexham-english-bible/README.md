# Lexham English Bible: license evidence

Original captures of the Lexham English Bible (LEB) license and download pages, as they appeared when the LEB text was obtained.

| File | What it is |
|---|---|
| `License for the Lexham English Bible (captured 2020-02-09).pdf` | The full license page, `https://lexhamenglishbible.com/license/`, with the clarifying questions (2 pages) |
| `Download the Lexham English Bible (captured 2020-02-09).pdf` | The download page, `https://lexhamenglishbible.com/download/`, listing the file formats offered (1 page) |
| `license-text.txt` | Text extracted from the license PDF, for searching and comparing |

## Provenance

- **Captured and committed by:** Antz (the commit author), using Chrome 79 on Linux ("Print to PDF"), on 9 February 2020 (license page 23:26 NZDT, download page 23:28 NZDT). The page date and URL are printed in each page's header and footer.
- **Recovered from git:** the `tex-bible` repository, commit `2ef97e4` ("LEB sources and license", 2020-02-09), path `leb/sources/`. They were removed from the working tree in commit `9d9ed36` (2020-02-12) but remain in history:
  `git -C tex-bible show 2ef97e4:"leb/sources/License for the Lexham English Bible.pdf" > out.pdf`
- **No screenshot images** of these pages exist in any of the repositories' histories. These PDFs are rendered pages (they show the site header, layout and text), not images.
- **Same terms inside the data file:** the license text is also embedded in `LEB.xml`. The original download (`tex-bible` commit `2ef97e4`, `leb/sources/LEB.xml`, 8,645,383 bytes) has SHA-256 `65aaf39c0ffab06196eb8189aad45359a3dfdab40b53e2f387990023d41932d2`. The working copy at `leb/processing/sources/0.raw/LEB.xml` was edited later for typesetting, so its hash (`bce97e5b…0bf0`) differs.
- **The text files themselves** (`LEB.xml`, `LEB.txt`, `LEB.epub`, as originally downloaded) are kept in `source-texts/lexham-english-bible/`, listed in `../source-files.json`.

## Checksums (SHA-256)

```
6847ccf0da30d8a8e67444c66103aa4d3c7216d07788f1bda881dae6d5e70f42  License for the Lexham English Bible (captured 2020-02-09).pdf
eaef2dea5fc028e55ebe5a13f06151897bb33db1d0f0dd2c504ce7eb638d4832  Download the Lexham English Bible (captured 2020-02-09).pdf
```

## The terms that apply

This is the license as of **9 February 2020**, when Logos Bible Software held the rights. The LEB has since moved to Lexham Press, which Baker acquired in 2025. **ScriptureTips uses the copy obtained on that day under this license**, which has no expiry or change clause, so later changes to the published terms don't apply to it (decided 2026-10-25; see `docs/sources.md` §3.4).

The other three pages saved in the same commit (About, Preface, The Translation Process) are descriptive and remain in the `tex-bible` history.
