import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const config: NextConfig = {
  // Workspace packages are TypeScript source.
  transpilePackages: [
    "@scripturetips/passage",
    "@scripturetips/reference",
    "@scripturetips/versification",
  ],
  // Other hosts the dev server answers (`./dev up --lan` sets them): a phone on the network.
  allowedDevOrigins: (process.env["DEV_ORIGINS"] ?? "").split(",").filter(Boolean),
};

export default createNextIntlPlugin("./src/i18n/request.ts")(config);
