import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOTAL, getLevel } from "../../../data/quiz";
import { ResultPage } from "../../skins";
import { OG_VERSION, scoreShareUrl, SITE_URL } from "../../share";

// Шер-сторінки з точною кількістю балів: /s/0/ … /s/8/, у кожної своя OG-картинка.
export const dynamicParams = false;
export function generateStaticParams() {
  return Array.from({ length: TOTAL + 1 }, (_, i) => ({ score: String(i) }));
}

const parse = (s: string) => {
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n <= TOTAL ? n : null;
};

export async function generateMetadata({ params }: { params: Promise<{ score: string }> }): Promise<Metadata> {
  const n = parse((await params).score);
  if (n === null) return {};
  const lvl = getLevel(n);
  const title = `Мій результат — ${n} з ${TOTAL}, «${lvl.title}» · Міфи про енергетику`;
  const ogImage = `${SITE_URL}/og-s${n}.png?v=${OG_VERSION}`;
  return {
    title,
    description: lvl.description,
    openGraph: {
      title,
      description: lvl.description,
      url: scoreShareUrl(n),
      siteName: "Хмарочос",
      locale: "uk_UA",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${n} з ${TOTAL} — ${lvl.title}` }],
    },
    twitter: { card: "summary_large_image", title, description: lvl.description, images: [ogImage] },
  };
}

export default async function ScoreSharePage({ params }: { params: Promise<{ score: string }> }) {
  const n = parse((await params).score);
  if (n === null) notFound();
  return <ResultPage level={getLevel(n)} score={n} />;
}
