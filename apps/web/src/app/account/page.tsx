import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AccountForm, SignOutButton } from "../../account/AccountForm.tsx";
import { currentAccount } from "../../account/api.ts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("account"))("title") };
}

export default async function AccountPage() {
  const account = await currentAccount();
  if (!account) redirect("/sign-in");
  const t = await getTranslations("account");
  return (
    <>
      <h1>{t("title")}</h1>
      {account.handle === null && <p className="welcome">{t("welcome")}</p>}
      <p>{t("emailPrivate", { email: account.email })}</p>
      <AccountForm account={account} />
      <p>
        <SignOutButton />
      </p>
    </>
  );
}
