import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/** The API (compose.yaml sets `API_URL` in the stack). */
const API = process.env["API_URL"] ?? "http://127.0.0.1:3001/api";

const config: NextConfig = {
  // Workspace packages are TypeScript source.
  transpilePackages: [
    "@scripturetips/passage",
    "@scripturetips/reference",
    "@scripturetips/versification",
  ],
  // Account requests go through the web app to the API, so the session cookie belongs to
  // the site the user sees.
  rewrites: async () => [
    { source: "/api/auth/:path*", destination: `${API}/auth/:path*` },
    { source: "/api/account", destination: `${API}/account` },
    { source: "/api/account/:path*", destination: `${API}/account/:path*` },
  ],
  // Other hosts the dev server answers (`./dev up --lan` sets them): a phone on the network.
  allowedDevOrigins: (process.env["DEV_ORIGINS"] ?? "").split(",").filter(Boolean),
};

export default createNextIntlPlugin("./src/i18n/request.ts")(config);
