import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../../account/api.ts";
import { SignInForm } from "../../account/SignInForm.tsx";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("account"))("signInTitle") };
}

export default async function SignInPage() {
  if (await currentAccount()) redirect("/account");
  const t = await getTranslations("account");
  return (
    <>
      <h1>{t("signInTitle")}</h1>
      <p>{t("signInIntro")}</p>
      <SignInForm />
    </>
  );
}
