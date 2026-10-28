/**
 * Email text, in New Zealand English (the default locale, AGENTS.md). Other interface languages
 * come with volunteer UI translation (vision §10); the user's locale picks the text then.
 */
export const signInEmail = (code: string, minutes: number) => ({
  subject: "Your ScriptureTips sign-in code",
  text: [
    `Your sign-in code is ${code}.`,
    "",
    `It works once, within the next ${minutes} minutes.`,
    "",
    "If you didn't ask to sign in, you can ignore this email. Nobody can sign in without the code.",
  ].join("\n"),
});
