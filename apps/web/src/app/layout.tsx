import type { Metadata } from "next";
import Image from "next/image";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site");
  return {
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("tagline"),
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations("site");
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <header className="site-header">
            <a href="/" className="brand">
              <Image src="/brand/logo-48.png" width={48} height={48} alt="" priority />
              <span>{t("name")}</span>
            </a>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <a href="/credits">{t("credits")}</a>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
