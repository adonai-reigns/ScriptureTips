import { getRequestConfig } from "next-intl/server";

/** One UI language so far: New Zealand English (vision §3.16). */
export const LOCALE = "en-NZ";

export default getRequestConfig(async () => ({
  locale: LOCALE,
  messages: (await import(`../../messages/${LOCALE}.json`)).default,
}));
