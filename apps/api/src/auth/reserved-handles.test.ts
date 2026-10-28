// cspell:disable -- handles written run together, as they are matched
import { describe, expect, it } from "vitest";
import { isReservedHandle, isReservedName, normalize } from "./reserved-handles.ts";

describe("domain-model §1.6: reserved handles", () => {
  it.each([
    // God's names, titles and their variants
    "god",
    "jesus",
    "yeshua",
    "yahweh",
    "yhvh",
    "yehovah",
    "christ",
    "holy-spirit",
    "jesus-christ",
    "theos",
    "the-lord",
    "el-shaddai",
    "lamb-of-god",
    "king",
    "rabbi",
    "light",
    "word",
    "shalom",
    "abba",
    "jesus777",
    "the-real-god",
    "g0d",
    "j3sus",
    "official-yahweh",
    "truemessiah",
    "the-way",
    // Other faiths
    "allah",
    "prophet-muhammad",
    "krishna",
    "buddha",
    "guru-nanak",
    "waheguru",
    // People of the Bible, by title
    "apostle-paul",
    "st-peter",
    "saint-john",
    "king-david",
    "prophet-isaiah",
    "virgin-mary",
    "john-the-baptist",
    // Staff, the site's paths, and the published lists
    "admin",
    "admin1",
    "scripture-tips",
    "read",
    "p",
    "sign-in",
    "postmaster",
    "hostmaster",
    "www",
    "privacy-policy",
  ])("reserve %s", (handle) => {
    expect(isReservedHandle(handle)).toBe(true);
  });

  it.each([
    "godfrey",
    "jesusfollower",
    "plain-words",
    "p1",
    "reader",
    "theophilus",
    "lordship-studies",
    "paul",
    "mary",
    "david",
    "muhammad",
    "father-john",
    "blog-of-ruth",
    "test-of-faith",
    "st-pauls-auckland",
  ])("allow %s", (handle) => {
    expect(isReservedHandle(handle)).toBe(false);
  });

  it("normalize drops hyphens, trailing digits and leading claims, and reads look-alike digits", () => {
    expect(normalize("The-Real-G0d-77")).toBe("god");
  });
});

describe("domain-model §1.6: reserved display names", () => {
  it.each([
    "God",
    "The Lord",
    "Jesus Christ",
    "Holy Spirit",
    "Apostle Paul",
    "Admin",
    "G0D",
    "Allah",
    "\u05d9\u05d4\u05d5\u05d4", // the Name in Hebrew
    "\u05d9\u05b0\u05d4\u05b9\u05d5\u05b8\u05d4", // with vowel points
    "Servant of \u05d9\u05d4\u05d5\u05d4",
    "YHWH is my shepherd",
    "\u0399\u0397\u03a3\u039f\u03a5\u03a3", // Iesous, in Greek capitals
    "\u1f38\u03b7\u03c3\u03bf\u1fe6\u03c2", // with breathing and accent
    "\uff27\uff4f\uff44", // fullwidth letters
  ])("refuse %s", (name) => {
    expect(isReservedName(name)).toBe(true);
  });

  it.each([
    "Godfrey Smith",
    "Paul",
    "Mary of Auckland",
    "Ruth",
    "Father John",
    "Lordship Studies",
    "Music",
  ])("allow %s", (name) => {
    expect(isReservedName(name)).toBe(false);
  });
});
