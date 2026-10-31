import { canBeBase } from "@scripturetips/licenses";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AccountForm } from "../../account/AccountForm.tsx";
import { currentAccount } from "../../account/api.ts";
import { translations } from "../../reader/api.ts";
import { translationOptions } from "../../translations/menu.ts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("account"))("title") };
}

export default async function AccountPage() {
  const account = await currentAccount();
  if (!account) redirect("/sign-in");
  const t = await getTranslations("account");
  // Every public translation, in the order the person has given (all of them, whatever "only favorites" says).
  const bases = translationOptions(
    (await translations().catch(() => [])).filter((tr) => canBeBase(tr.license)),
    { ...account, favoritesOnly: false },
  );
  return (
    <>
      <h1>{t("title")}</h1>
      {account.handle === null && <p className="welcome">{t("welcome")}</p>}
      <p>{t("emailPrivate", { email: account.email })}</p>
      <AccountForm account={account} translations={bases} />
    </>
  );
}
