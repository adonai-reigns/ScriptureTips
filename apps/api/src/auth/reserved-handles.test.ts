// cspell:disable -- handles written run together, as they are matched
import { describe, expect, it } from "vitest";
import { isReservedHandle, normalize } from "./reserved-handles.ts";

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
