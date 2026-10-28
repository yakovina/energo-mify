import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./skins/pixel/pixel.css";
import { OG_VERSION, SITE_URL, TEST_SHARE_TITLE } from "./share";
import { asset } from "./bp";

const TITLE = "Міфи про українську енергетику · Тест Хмарочоса";
const DESC =
  "Вісім тверджень про експорт, тарифи, захист станцій і графіки відключень. Відрізніть правду від міфу.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  applicationName: "Міфи про енергетику",
  icons: {
    icon: [
      { url: asset("/favicon.ico"), sizes: "48x48" },
      { url: asset("/icon-192.png"), sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: asset("/apple-icon.png"), sizes: "180x180" }],
  },
  appleWebApp: { title: "Міфи про енергетику", capable: true, statusBarStyle: "default" },
  openGraph: {
    title: TEST_SHARE_TITLE,
    description: DESC,
    url: `${SITE_URL}/`,
    siteName: "Хмарочос",
    locale: "uk_UA",
    type: "website",
    images: [{ url: `${SITE_URL}/og-test.png?v=${OG_VERSION}`, width: 1200, height: 630, alt: TEST_SHARE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TEST_SHARE_TITLE,
    description: DESC,
    images: [`${SITE_URL}/og-test.png?v=${OG_VERSION}`],
  },
};

export const viewport: Viewport = { themeColor: "#d7ddf2" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
