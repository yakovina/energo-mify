import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLevelBySlug, levels } from "../../../data/quiz";
import { ResultPage } from "../../skins";
import { OG_VERSION, SITE_URL, resultShareUrl } from "../../share";

// Статично генеруємо лише три сторінки рівнів.
export const dynamicParams = false;
export function generateStaticParams() {
  return levels.map((l) => ({ level: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }): Promise<Metadata> {
  const { level } = await params;
  const lvl = getLevelBySlug(level);
  if (!lvl) return {};
  const title = `Мій результат — «${lvl.title}» · Міфи про енергетику`;
  const ogImage = `${SITE_URL}/og-${lvl.slug}.png?v=${OG_VERSION}`;
  return {
    title,
    description: lvl.description,
    openGraph: {
      title,
      description: lvl.description,
      url: resultShareUrl(lvl.slug),
      siteName: "Хмарочос",
      locale: "uk_UA",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: lvl.title }],
    },
    twitter: { card: "summary_large_image", title, description: lvl.description, images: [ogImage] },
  };
}

export default async function ResultSharePage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const lvl = getLevelBySlug(level);
  if (!lvl) notFound();
  return <ResultPage level={lvl} />;
}
