/**
 * Fixes to Open Siddur's transcription, each checked against the 1917 printing.
 *
 * The scan is the Internet Archive item `jps1917` (`source-texts/jps-tanakh-1917/archive-org-jps1917/JPS 1917.pdf`);
 * page numbers are PDF page numbers in that file. Replacement text follows the transcription's
 * own layout, so the parser treats it like the rest: verse numbers glued to the first word,
 * blank lines between paragraphs.
 */

import type { Correction } from "./source.ts";

export const CORRECTIONS: readonly Correction[] = [
  {
    id: "ruth-1-1-to-17",
    ref: "RUT 1:1-17",
    scanPage: "995",
    reason:
      'The page with Ruth\'s heading and 1:1-17 (to "the LORD do so to me,") is missing from the transcription; the text resumes at "and more also". Transcribed from the scan.',
    find: "Upon the mountains of spices. and more also, if aught but",
    replace: `Upon the mountains of spices.

RUTH

And it came to pass in the days when the judges judged, that there was a famine in the land. And a certain man of Beth-lehem in Judah went to sojourn in the field of Moab, he, and his wife, and his two sons. 2And the name of the man was Elimelech, and the name of his wife Naomi, and the name of his two sons Mahlon and Chilion, Ephrathites of Beth-lehem in Judah. And they came into the field of Moab, and continued there. 3And Elimelech Naomi’s husband died; and she was left, and her two sons. 4And they took them wives of the women of Moab: the name of the one was Orpah, and the name of the other Ruth; and they dwelt there about ten years. 5And Mahlon and Chilion died both of them; and the woman was left of her two children and of her husband. 6Then she arose with her daughters-in-law, that she might return from the field of Moab; for she had heard in the field of Moab how that the LORD had remembered His people in giving them bread. 7And she went forth out of the place where she was, and her two daughters-in-law with her; and they went on the way to return unto the land of Judah. 8And Naomi said unto her two daughters-in-law: ‘Go, return each of you to her mother’s house; the LORD deal kindly with you, as ye have dealt with the dead, and with me. 9The LORD grant you that ye may find rest, each of you in the house of her husband.’ Then she kissed them; and they lifted up their voice, and wept. 10And they said unto her: ‘Nay, but we will return with thee unto thy people.’ 11And Naomi said: ‘Turn back, my daughters; why will ye go with me? have I yet sons in my womb, that they may be your husbands? 12Turn back, my daughters, go your way; for I am too old to have a husband. If I should say: I have hope, should I even have a husband to-night, and also bear sons; 13would ye tarry for them till they were grown? would ye shut yourselves off for them and have no husbands? nay, my daughters; for it grieveth me much for your sakes, for the hand of the LORD is gone forth against me.’ 14And they lifted up their voice, and wept again; and Orpah kissed her mother-in-law; but Ruth cleaved unto her. 15And she said: ‘Behold, thy sister-in-law is gone back unto her people, and unto her god; return thou after thy sister-in-law.’ 16And Ruth said: ‘Entreat me not to leave thee, and to return from following after thee; for whither thou goest, I will go; and where thou lodgest, I will lodge; thy people shall be my people, and thy God my God; 17where thou diest, will I die, and there will I be buried; the LORD do so to me,
and more also, if aught but`,
  },
  {
    id: "jer-23-40-full-stop",
    ref: "JER 23:40",
    scanPage: "618",
    reason: "The full stop that ends the chapter is missing.",
    find: "shame, which shall not be forgotten",
    replace: "shame, which shall not be forgotten.",
  },
  {
    id: "2sa-4-9-number",
    ref: "2SA 4:9",
    scanPage: "392-393",
    reason: 'A stray "200" is glued to the verse number: "2009And". The printing has 9.',
    find: "his seed.’ 2009And David answered",
    replace: "his seed.’ 9And David answered",
  },
  {
    id: "isa-9-4-number",
    ref: "ISA 9:4",
    scanPage: "510",
    reason: "The verse number 4 is missing.",
    find: "For every boot stamped with",
    replace: "4For every boot stamped with",
  },
  {
    id: "psa-119-153-number",
    ref: "PSA 119:153",
    scanPage: "890",
    reason: "The verse number reads 53; the printing has 153.",
    find: "53O see mine affliction",
    replace: "153O see mine affliction",
  },
  {
    id: "job-9-35-number",
    ref: "JOB 9:35",
    scanPage: "954",
    reason: "The verse number reads 5; the printing has 35.",
    find: "5Then would I speak, and not fear",
    replace: "35Then would I speak, and not fear",
  },
  {
    id: "ezr-2-40-number",
    ref: "EZR 2:40",
    scanPage: "1050",
    reason: 'The digits of the verse number 40 are split across lines: "4" and "0The Levites".',
    find: "and seventeen. 4 0The Levites: the children of Jeshua",
    replace: "and seventeen.\n\n40The Levites: the children of Jeshua",
  },
  {
    id: "1ch-5-36-number",
    ref: "1CH 5:36",
    scanPage: "1086",
    reason: 'A stray "1" at a line end joins the verse number 36 into "136".',
    find: "Azariah begot Johanan; 1 36and Johanan",
    replace: "Azariah begot Johanan; 36and Johanan",
  },
  {
    id: "1ch-25-26-number",
    ref: "1CH 25:26",
    scanPage: "1109",
    reason: 'The digits of the verse number 26 are split across lines: "2" and "6For".',
    find: "brethren, twelve; 2 6For the nineteenth",
    replace: "brethren, twelve;\n\n26For the nineteenth",
  },
  {
    id: "1ki-5-5-number",
    ref: "1KI 5:5",
    scanPage: "430",
    reason: "The verse number reads 2; the printing has 5.",
    find: "round about him. 2And Judah and Israel dwelt",
    replace: "round about him. 5And Judah and Israel dwelt",
  },
  {
    id: "1ki-5-7-number",
    ref: "1KI 5:7",
    scanPage: "430",
    reason: "The verse number reads 2; the printing has 7.",
    find: "twelve thousand horsemen. 2And those",
    replace: "twelve thousand horsemen. 7And those",
  },
  {
    id: "psa-13-6-stray-number",
    ref: "PSA 13:6",
    scanPage: "805-806",
    reason: 'A stray verse number 6 before "I will sing unto the LORD", which continues verse 6.',
    find: "6I will sing unto the LORD, Because He hath dealt bountifully",
    replace: "I will sing unto the LORD,\n\nBecause He hath dealt bountifully",
  },
  {
    id: "psa-70-numbers",
    ref: "PSA 70:2-6",
    scanPage: "846",
    reason:
      "The verse numbers are one lower than the printing's (verse 2 is unnumbered and the rest read 2-5); the printing numbers them 2-6.",
    find: "O God, to deliver me, O LORD, to help me, make haste. 2Let them be ashamed and abashed That seek after my soul; Let them be turned backward and brought to confusion That delight in my hurt. 3Let them be turned back by reason of their shame That say: 'Aha, aha.' 4Let all those that seek Thee rejoice and be glad in Thee; And let such as love Thy salvation say continually: 'Let God be magnified.' 5But I am poor and needy;",
    replace: `2O God, to deliver me,

O LORD, to help me, make haste.

3Let them be ashamed and abashed

That seek after my soul;

Let them be turned backward and
brought to confusion

That delight in my hurt.

4Let them be turned back by reason
of their shame

That say: 'Aha, aha.'

5Let all those that seek Thee rejoice
and be glad in Thee;

And let such as love Thy salvation
say continually:

'Let God be magnified.'

6But I am poor and needy;`,
  },
  {
    id: "isa-6-10-doubled",
    ref: "ISA 6:10",
    scanPage: "508",
    reason: "The first letter of the line is doubled.",
    find: "Rreturn, and be healed",
    replace: "Return, and be healed",
  },
  {
    id: "isa-14-20-doubled",
    ref: "ISA 14:20",
    scanPage: "517",
    reason: "The first letter of the line is doubled.",
    find: "Bbecause thou hast destroyed",
    replace: "Because thou hast destroyed",
  },
  {
    id: "isa-15-2-doubled",
    ref: "ISA 15:2",
    scanPage: "518",
    reason: "The first letter of the line is doubled.",
    find: "Tto the high places, to weep",
    replace: "To the high places, to weep",
  },
  {
    id: "isa-19-4-doubled",
    ref: "ISA 19:4",
    scanPage: "521",
    reason: "The first letter of the line is doubled.",
    find: "Iinto the hand of a cruel lord",
    replace: "Into the hand of a cruel lord",
  },
  {
    id: "isa-30-24-doubled",
    ref: "ISA 30:24",
    scanPage: "535",
    reason: "The first letter of the line is doubled.",
    find: "Wwhich hath been winnowed",
    replace: "Which hath been winnowed",
  },
  {
    id: "jer-23-20-doubled",
    ref: "JER 23:20",
    scanPage: "617",
    reason: "The first letter of the line is doubled.",
    find: "Iin the end of days ye shall consider",
    replace: "In the end of days ye shall consider",
  },
  {
    id: "jer-51-52-doubled",
    ref: "JER 51:52",
    scanPage: "662",
    reason: "The first letter of the line is doubled.",
    find: "Aand through all her land the",
    replace: "And through all her land the",
  },
  {
    id: "psa-51-11-doubled",
    ref: "PSA 51:11",
    scanPage: "834",
    reason: "The first letter of the line is doubled.",
    find: "Aand blot out all mine iniquities",
    replace: "And blot out all mine iniquities",
  },
  {
    id: "psa-116-1-doubled",
    ref: "PSA 116:1",
    scanPage: "882",
    reason: "The first letter of the line is doubled.",
    find: "Mmy voice and my supplications",
    replace: "My voice and my supplications",
  },
  {
    id: "isa-29-13-soft-hyphen",
    ref: "ISA 29:13",
    scanPage: "533",
    reason: 'A soft hyphen from a line break in the printing ("command-/ment") is kept mid-line.',
    find: "command-ment of men learned",
    replace: "commandment of men learned",
  },
  {
    id: "isa-47-9-soft-hyphen",
    ref: "ISA 47:9",
    scanPage: "558",
    reason: 'A soft hyphen from a line break in the printing ("widow-/hood") is kept mid-line.',
    find: "and widow-hood;",
    replace: "and widowhood;",
  },
  {
    id: "jer-47-1-soft-hyphen",
    ref: "JER 47:1",
    scanPage: "650",
    reason: 'A soft hyphen from a line break in the printing ("con-/cerning") is kept mid-line.',
    find: "prophet con-cerning the Philistines",
    replace: "prophet concerning the Philistines",
  },
  {
    id: "isa-54-10-compassion",
    ref: "ISA 54:10",
    scanPage: "567",
    reason: 'The printing breaks "compas-/sion"; the transcription has "compass-/sion".',
    find: "hath compass- sion on thee",
    replace: "hath compassion on thee",
  },
  {
    id: "pro-1-16-and",
    ref: "PRO 1:16",
    scanPage: "905",
    reason: '"A nd" for "And".',
    find: "A nd they make haste to shed blood",
    replace: "And they make haste to shed blood",
  },
  {
    id: "job-6-3-therefore",
    ref: "JOB 6:3",
    scanPage: "950",
    reason: 'The first letter of "Therefore" is at the end of the previous line.',
    find: "the sand of the seas; t Herefore are my words broken",
    replace: "the sand of the seas;\n\nTherefore are my words broken",
  },
  {
    id: "2ki-23-17-question",
    ref: "2KI 23:17",
    scanPage: "496",
    reason: "The question mark and the space after the quotation are missing.",
    find: "which I see’And the",
    replace: "which I see?’ And the",
  },
  {
    id: "lev-18-15-possessive",
    ref: "LEV 18:15",
    scanPage: "163",
    reason: '"son’wife" for "son’s wife".',
    find: "is thy son’wife;",
    replace: "is thy son’s wife;",
  },
  {
    id: "gen-49-6-not",
    ref: "GEN 49:6",
    scanPage: "83",
    reason: '"not" is repeated.',
    find: "let my glory not be not united",
    replace: "let my glory not be united",
  },
  {
    id: "gen-49-29-he",
    ref: "GEN 49:29",
    scanPage: "85",
    reason: '"be" for "he".',
    find: "29And be charged them",
    replace: "29And he charged them",
  },
  {
    id: "exo-4-18-return",
    ref: "EXO 4:18",
    scanPage: "90",
    reason: 'The word "return" is missing.',
    find: "I pray thee, and unto my brethren",
    replace: "I pray thee, and return unto my brethren",
  },
  {
    id: "exo-6-3-divine-name",
    ref: "EXO 6:3",
    scanPage: "92",
    reason:
      "The Hebrew name, printed unpointed with the footnote caller before it, was lost (dots in the transcription).",
    find: "by My name ....a I made",
    replace: "by My name aיהוה I made",
  },
  {
    id: "exo-16-29-day",
    ref: "EXO 16:29",
    scanPage: "107",
    reason: '"clay" for "day".',
    find: "seventh clay",
    replace: "seventh day",
  },
  {
    id: "lev-1-1-small-capitals",
    ref: "LEV 1:1",
    scanPage: "140",
    reason:
      'The opening words are set in capitals and small capitals; the transcription has "tHE".',
    find: "And tHE LORD called",
    replace: "And the LORD called",
  },
  {
    id: "lev-4-9-the",
    ref: "LEV 4:9",
    scanPage: "142",
    reason: 'The word "the" is missing.',
    find: "take away by kidneys, 10as",
    replace: "take away by the kidneys, 10as",
  },
  {
    id: "lev-11-26-to",
    ref: "LEV 11:26",
    scanPage: "152",
    reason: 'A stray "to".',
    find: "that to toucheth them shall be unclean",
    replace: "that toucheth them shall be unclean",
  },
  {
    id: "num-1-1-they",
    ref: "NUM 1:1",
    scanPage: "194",
    reason: '"the" for "they".',
    find: "second year after the were come out",
    replace: "second year after they were come out",
  },
  {
    id: "deu-32-8-their-inheritance",
    ref: "DEU 32:8",
    scanPage: "275",
    reason: 'The words "their inheritance," at the end of the line are missing.',
    find: "gave to the nations",
    replace: "gave to the nations their inheritance,",
  },
  {
    id: "jdg-1-8-against",
    ref: "JDG 1:8",
    scanPage: "315",
    reason: 'The word "against" is missing.',
    find: "Judah fought Jerusalem, and took it",
    replace: "Judah fought against Jerusalem, and took it",
  },
  {
    id: "2sa-22-8-they",
    ref: "2SA 22:8",
    scanPage: "417",
    reason: '"Tey" for "They".',
    find: "Tey were shaken",
    replace: "They were shaken",
  },
  {
    id: "1ki-18-18-he",
    ref: "1KI 18:18",
    scanPage: "453",
    reason: '"be" for "he".',
    find: "18And be answered",
    replace: "18And he answered",
  },
  {
    id: "1ki-20-36-hearkened",
    ref: "1KI 20:36",
    scanPage: "458",
    reason: '"heartened" for "hearkened".',
    find: "hast not heartened to",
    replace: "hast not hearkened to",
  },
  {
    id: "isa-10-14-the",
    ref: "ISA 10:14",
    scanPage: "512",
    reason: 'The word "the" is missing.',
    find: "Or that opened mouth, or",
    replace: "Or that opened the mouth, or",
  },
  {
    id: "isa-11-7-shall",
    ref: "ISA 11:7",
    scanPage: "514",
    reason: 'The word "shall" is missing.',
    find: "the cow and the bear feed;",
    replace: "the cow and the bear shall feed,",
  },
  {
    id: "isa-17-3-saith",
    ref: "ISA 17:3",
    scanPage: "520",
    reason: '"Sith" for "Saith".',
    find: "Sith the LORD of hosts.",
    replace: "Saith the LORD of hosts.",
  },
  {
    id: "isa-65-12-when",
    ref: "ISA 65:12",
    scanPage: "579",
    reason: '"Ehen" for "When".',
    find: "Ehen I spoke, ye did not hear;",
    replace: "When I spoke, ye did not hear;",
  },
  {
    id: "jer-9-17-and",
    ref: "JER 9:17",
    scanPage: "598",
    reason: 'The opening "And" is missing.',
    find: "17let them make haste",
    replace: "17And let them make haste",
  },
  {
    id: "jer-23-31-their",
    ref: "JER 23:31",
    scanPage: "618",
    reason: '"there" for "their".',
    find: "that use there tongues",
    replace: "that use their tongues",
  },
  {
    id: "2sa-22-6-caller",
    ref: "2SA 22:6",
    scanPage: "417",
    reason: 'The footnote caller on "Sheol" is missing; the note serves both "Belial" and "Sheol".',
    find: "The cords of Sheol surrounded me",
    replace: "The cords of aSheol surrounded me",
  },
  {
    id: "ezk-21-4-and",
    ref: "EZK 21:4",
    scanPage: "689",
    reason: 'The opening "And" is missing.',
    find: "thereby. 4all flesh shall",
    replace: "thereby. 4And all flesh shall",
  },
  {
    id: "ezk-21-8-and",
    ref: "EZK 21:8",
    scanPage: "689",
    reason: 'The opening "and" is missing.',
    find: "land of Israel; 8say to the",
    replace: "land of Israel; 8and say to the",
  },
  {
    id: "zep-3-2-to",
    ref: "ZEP 3:2",
    scanPage: "777",
    reason: 'The word "to" is missing.',
    find: "She hearkened not the voice",
    replace: "She hearkened not to the voice",
  },
  {
    id: "zec-7-6-did",
    ref: "ZEC 7:6",
    scanPage: "785",
    reason: 'A stray "did".',
    find: "and when ye did drink",
    replace: "and when ye drink",
  },
  {
    id: "psa-27-9-far",
    ref: "PSA 27:9",
    scanPage: "815",
    reason: 'A stray "far".',
    find: "Hide not Thy face far from me;",
    replace: "Hide not Thy face from me;",
  },
  {
    id: "psa-30-4-keep",
    ref: "PSA 30:4",
    scanPage: "817",
    reason: '"kept" for "keep".',
    find: "Thou didst kept me alive",
    replace: "Thou didst keep me alive",
  },
  {
    id: "psa-69-11-with",
    ref: "PSA 69:11",
    scanPage: "845",
    reason: 'A stray "with".',
    find: "I wept with my soul with fasting,",
    replace: "I wept with my soul fasting,",
  },
  {
    id: "psa-77-2-and",
    ref: "PSA 77:2",
    scanPage: "852",
    reason: '"an" for "and".',
    find: "my voice unto God, an",
    replace: "my voice unto God, and",
  },
  {
    id: "psa-89-11-scatter",
    ref: "PSA 89:11",
    scanPage: "862",
    reason: '"scattered" for "scatter".',
    find: "Thou didst scattered Thine enemies",
    replace: "Thou didst scatter Thine enemies",
  },
  {
    id: "psa-110-6-the",
    ref: "PSA 110:6",
    scanPage: "880",
    reason: 'A stray "the".',
    find: "He filleth it with the dead bodies,",
    replace: "He filleth it with dead bodies,",
  },
  {
    id: "psa-124-6-who",
    ref: "PSA 124:6",
    scanPage: "892",
    reason: '"Wo" for "Who".',
    find: "Wo hath not given us",
    replace: "Who hath not given us",
  },
  {
    id: "pro-16-30-that",
    ref: "PRO 16:30",
    scanPage: "925",
    reason: 'The word "that" is missing.',
    find: "30He shutteth his eyes",
    replace: "30He that shutteth his eyes",
  },
  {
    id: "pro-20-10-an",
    ref: "PRO 20:10",
    scanPage: "929",
    reason: 'The word "an" is missing.',
    find: "Both of them alike are abomination",
    replace: "Both of them alike are an abomination",
  },
  {
    id: "pro-28-7-but",
    ref: "PRO 28:7",
    scanPage: "940",
    reason: '"ut" for "But".',
    find: "ut he that is a companion of",
    replace: "But he that is a companion of",
  },
  {
    id: "pro-31-11-safely",
    ref: "PRO 31:11",
    scanPage: "944",
    reason: '"aafely" for "safely".',
    find: "aafely trust in her,",
    replace: "safely trust in her,",
  },
  {
    id: "lam-4-8-a",
    ref: "LAM 4:8",
    scanPage: "1006",
    reason: 'A stray "a".',
    find: "blacker than a coal;",
    replace: "blacker than coal;",
  },
  {
    id: "dan-2-23-w",
    ref: "DAN 2:23",
    scanPage: "1031",
    reason: 'A stray "w" at the end of the line.',
    find: "O Thou God of my fathers, w",
    replace: "O Thou God of my fathers,",
  },
  {
    id: "lam-5-22-repeat",
    ref: "LAM 5:22",
    scanPage: "1008",
    reason:
      'The repeated verse reads "Turn us unto Thee, O Lord"; the printing has "Turn Thou us unto Thee, O LORD".',
    find: "Turn us unto Thee, O Lord, and we shall be turned;",
    replace: "Turn Thou us unto Thee, O LORD, and we shall be turned;",
  },
  {
    id: "gen-25-31-birthright",
    ref: "GEN 25:31",
    scanPage: "52",
    reason:
      'The printing breaks "birth-/right" at a line end; the transcription has "birth right".',
    find: "thy birth right.",
    replace: "thy birthright.",
  },
  {
    id: "gen-26-12-hundredfold",
    ref: "GEN 26:12",
    scanPage: "52",
    reason: 'The printing has "hundredfold" solid.',
    find: "a hundred-fold;",
    replace: "a hundredfold;",
  },
  {
    id: "hos-13-14-nether-world",
    ref: "HOS 13:14",
    scanPage: "741",
    reason: 'The printing has "nether-world".',
    find: "O netherworld!",
    replace: "O nether-world!",
  },
  {
    id: "jdg-18-30-note-hebrew",
    ref: "JDG 18:30",
    scanPage: "340",
    reason:
      'The note\'s Hebrew is lost ("Heb. .... With . suspended"); the printing has "Heb. מנשה, with נ suspended" (restored unpointed).',
    find: "Heb. .... With . suspended,",
    replace: "Heb. מנשה, with נ suspended,",
  },
];

/**
 * Where a chapter's first verse starts, when the parser's rule picks the wrong block.
 * Keyed by "BOOK chapter"; the value is the start of verse 1's text (the last block that starts
 * so). Each was checked against the scan; the comment gives the PDF page.
 */
export const CHAPTER_STARTS: ReadonlyMap<string, string> = new Map([
  ["JER 52", "Zedekiah was one and twenty"], // 663: "Thus far are the words of Jeremiah." ends 51:64
  ["HOS 6", "Come, and let us return"],
  ["HOS 7", "When I would heal Israel"],
  ["PSA 105", "O give thanks unto the"], // "Hallelujah." ends 104:35
  ["PSA 150", "Hallelujah."], // 149:9 ends with "Hallelujah." and 150:1 starts with it
  ["JOB 22", "Then answered Eliphaz"],
  ["SNG 7", "Return, return, O Shulammite"],
]);

/**
 * Compounds the printing always hyphenates: in the scan's text layer each appears hyphenated
 * within a line and never solid. The transcription sometimes joins them ("firstborn"); these are
 * restored, and a line-end hyphen in one of them is kept.
 */
export const HYPHENATED_COMPOUNDS: readonly string[] = [
  "first-born",
  "to-morrow",
  "to-day",
  "whole-hearted",
  "store-houses",
  "Beth-el",
  "threshing-floor",
  "evil-doers",
  "evil-doer",
  "Kiriath-arba",
  "turtle-doves",
  "pruning-hooks",
  "nether-world",
  "Beer-sheba",
  "Beth-horon",
  "maid-servant",
  "man-servant",
  "home-born",
  "sea-shore",
  "bed-chamber",
  "Malchi-shua",
  "day-time",
  "Hazar-shual",
  "reed-grass",
  "life-time",
  "Pi-hahiroth",
  "grape-vine",
  "Col-hozeh",
];
