import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl 4.x convention : pointer vers le fichier getRequestConfig
// (Server Components SSR config). Path relatif au workspace app/.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
