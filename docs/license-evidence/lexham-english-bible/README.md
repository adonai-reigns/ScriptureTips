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

## Conversion to USFM

`LEB.xml` was converted to USFM 3 by `tools/source-conversion` (`pnpm --filter @scripturetips/source-conversion leb`). The downloaded file isn't changed; the converter reads it and writes 66 USFM files plus `conversion-report.txt` into `source-texts/lexham-english-bible/converted/`. The words of every book match the XML exactly (notes and headings included).

- **Idioms:** the 11,146 idiomatic phrases (lower corner brackets in print) are carried as `\w …|x-idiom="N"\w*`, so the import can anchor the note that follows to the span (domain-model §2.6).
- **Left out:** 2,736 empty `<p />` elements and 2,698 U+FEFF characters, which carry no text.
- **Screen-only notes** (`NOT_FOR_PRINT`, 3,103) are kept, tagged `\cat screen\cat*`.

SHA-256 of the output (`converted/`):

```
6f7b70adbffb7f82b4aadd3387b50866a3ad533a10eb148a765a5b5a9ab4d962  01-GEN.usfm
ac48547ee650f14eb42ba29ad8adad1681dc22ad4079da47e9c6dca3c14598dc  02-EXO.usfm
9e154ccf755f98469ea7a808f0a6de50d058ac74ec7d63b400b2ac546bd53170  03-LEV.usfm
bd5bde7a63a1a5fa010fd1fd481429079ee1e67469bbfa8639ac3efedb7f2867  04-NUM.usfm
aa1ffff3ad56501921068b3099b4ae69ccc34a3fbc5042fd49dc7cff892b38c3  05-DEU.usfm
7bd42a8ad192ba39161b77fc84b0ac20334abfc7c2f2f51a0cc1b076310de5df  06-JOS.usfm
298a977145ec6c5bdd1a89cc33a5a43a198bc09080c9e66568be1ccaa5510e92  07-JDG.usfm
de8496d79089a3f59bc0d7f72611bcf896baada1436505287b8385ff2374ea82  08-RUT.usfm
97c65f9bf792cc5097ff9d0348b6023d1a10bd387ca3ba3025d1db8f6eee35b1  09-1SA.usfm
4b17b67d8462e045680048d1492e4926b10b6488aa80d7985cac4c3479ee8a1d  10-2SA.usfm
46e865dfecb58ce94270462621428c4ff94218b914ce5aff3eca048887966fcc  11-1KI.usfm
6e92802d91a94088807c1e790924471fd13285e85fcc93caa00c1761bbea8e1f  12-2KI.usfm
c5a34d6754beeaca0127ac440080bc6c481fb7dd940b42156396723816fe13fa  13-1CH.usfm
200aceb8202abdeda339887efbb644d2df1cf5a2e5133ec846e430abd7e2c3b8  14-2CH.usfm
02ff529c497c44d075fadf5b643983a4939f45c0b91c85435e62a30c3095ffc7  15-EZR.usfm
2e57437ad16f23936c12cdd924af93f35ced6f9b10a06d255fec48b2ff5c3027  16-NEH.usfm
978d0e8cbb1f0d491770ec78d818856e45f10d51f8c395f2c6bd3b2695497d03  17-EST.usfm
8762151efd4945c7ecd7b52789bfb1b61bbbe300a95fb05ee1eeab6422ce886c  18-JOB.usfm
cc153443a4f2a6ca32d185704c02c320fb611f2a33558fd07fb9c9a2ac062a87  19-PSA.usfm
a73b76481131867dea13b7747f06dad80aad74246b08a9523c1c9829dc4e2964  20-PRO.usfm
30f06bd4df6cb1854da6d31ed6476899882c6afabd5a7f0ea37873387760e43d  21-ECC.usfm
e1b6aa57045b8633b41886ae3f93481740259d36527bd302de9894b5402e4692  22-SNG.usfm
555ec9fd90798951984531985277360711ca187ce363dc3a77aa2a0cb94f764c  23-ISA.usfm
76517bb755751626343975dcba68ba818c3a1b21e2ff63282723e32088687878  24-JER.usfm
a75d9cdcbd3cb7352f8d704c01ba98306cfae408129705a9ce99c166f8ddbd88  25-LAM.usfm
60c07cf4ccae425cde653a1d75643fdeb841bcb6dd675c5eabcacabd896521ad  26-EZK.usfm
666adafcd0934752eda17175fb7e4988f82945e7abc5bcb566c9fc6ec7d664b9  27-DAN.usfm
ce25c99511494be27a14f515fab1cb03b99679634c52c6b4cd99086b81b516e5  28-HOS.usfm
1b3da681c7d269e6835ef3900da9e43dc3b9e4e59704b1a854f6022f4c409458  29-JOL.usfm
0efaae1ee8bed34ae8395eee4750dd228ae09cc398043d0f1d527ae5f0c727b0  30-AMO.usfm
a74edfa7ad3314f8115e81f7f7eb4f94ab11ee2bdc20d2dd7f64b00868ec797e  31-OBA.usfm
276793d8a6a15354f1da6daf96502112a27bdb22d887a2686add3eb470bac748  32-JON.usfm
0cc3af078945987654a0988c2204bc0289ca3c59a4db6ff22f035636f140ef7a  33-MIC.usfm
f63f37f8f23a52bf6ad13d5bb91711c75ae9f8768579dd0fc94b3cb64d01007b  34-NAM.usfm
380ed1346b65ed722f04468843c7ec7df5b9d09c082fb491b75a3c2b6f9eb022  35-HAB.usfm
3b8352147a37981e9883b9b61bf930c5f2b26be171581b2fe61eadd77e0413eb  36-ZEP.usfm
673feae936819f460ac8cf60c50bf0c61579740257243b7924c7e0e929fe1fa0  37-HAG.usfm
29e9e99736194849cbf3a9b5713b75adc3b961661c156bca4a0ff40f67f964a1  38-ZEC.usfm
54db610af6e46e84fc545dcfc2353bb55bea660200e94b7c7725f0dfc24d3350  39-MAL.usfm
490675211792cae43b0fdd1b14af0b2da9fd9860ce50c6f9b2a95c71b984c484  40-MAT.usfm
5bf92dc49867cb89d37d67cdadec2ace0bc81d9b4b29aab14f366c4e56fa23e7  41-MRK.usfm
8142b56a3e1f5df1bb7fdee40b77c656bfec2025b194fec62e3ff80dabf7a0d0  42-LUK.usfm
e84bd641861ae344c65e6f92ad89427365dd65f1bf8c22a1e4cf609b38d79517  43-JHN.usfm
155d340b636e1b3bb9ca305488748f2c5d21de1b0273863ec99b9b6ac76e9da3  44-ACT.usfm
c77316b8bbfc348afe1ba960e20bf747ecd40424f2f8283eee82151d2c8e25d4  45-ROM.usfm
fa6b6574a13adec95d819defe243807fc32e994d5131ae88b9e609a37454903f  46-1CO.usfm
0bea387ff2610bc036c9790ee1555b7171463211fd7deef7c72c042fb5fba0b0  47-2CO.usfm
f5b6dd8effa8ae7b82974509ac2cd1b6c4c21c730cb1356920695af14514ea6d  48-GAL.usfm
2d66494f9dda5a539354cf69b7dd8752eb3072a27efacac36275497b13babaa0  49-EPH.usfm
10a356371c84ecd0414e1b5d0cfe9e529371ff19ecd501c37817378e81576a50  50-PHP.usfm
39cea4744ebc756a8887e8b126a25fe77d00ba2126214746a61953194a62c9cb  51-COL.usfm
8c057e8a8c652a8528e25d5e0c84e7e930c58e22ca1b4c3f014f72f5591b36ed  52-1TH.usfm
770b71f72802995cf5d12cd6943c9b6d6c8c2dd75c3cb2b42ba5e68e6c71d822  53-2TH.usfm
cd75aa7c2f85741e0cd0527a7b4cb7e08af99413615d8dc0b551e6d9dbb500ec  54-1TI.usfm
0d818cd73a73d2da5d708d61024ac96ba1413e435e3709fc5c12f06d23a71f68  55-2TI.usfm
6f579421932a73eeeac7c35653da3285785dad32f552a7918a5104d5f85d7fb0  56-TIT.usfm
549e1b15481dac33289046bc54694c01cb971e33dfc89c90c69894cfe312f8f4  57-PHM.usfm
1a2259c6a91c36b5e6d96ab9f78d8aa788d11cd39dce02dff4800494c2e80b37  58-HEB.usfm
a8daa18ff4b954815c9a05813e000fad39b28320ae9680a0261d60b652289472  59-JAS.usfm
d26fe44672e8c3a05e381b484101b5f74eb03e8996e46c11cf850afad401a743  60-1PE.usfm
7908a96960dd42572af6d3de1f20c5447b50761b6feed6cffe66ee0c4ecf5f97  61-2PE.usfm
abffd28569572971a9e013630f539a95017a8bdd57215c4d7e2fb2084a1b39cc  62-1JN.usfm
779049b97585d5073faa3ca146bd1bd19910c979b93d5db7522287d7d08212a7  63-2JN.usfm
2aab19eccba2dbba122cccf4f15188f73924adc074a61690aa9cf0c0bc8d17f9  64-3JN.usfm
a8e72f9038d185f8470217367253d99753e209778a7a809780bf8469a108abb5  65-JUD.usfm
4d81b916e4f8b420a8e06ae187d13c377a9c657216cdde1647b47d00228664e4  66-REV.usfm
7172a48eb156c257216d331fc0544d31d43574d0265fc406b5708d9fb9595718  conversion-report.txt
```

The output is regenerated from the source and the converter, so these hashes change whenever the converter changes.
