// Публічна адреса задеплоєного сайту — шер завжди веде на неї (навіть у dev).
// Перевизначається змінною NEXT_PUBLIC_SITE_URL на етапі збірки.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://yakovina.github.io/energo-mify";

export const TEST_SHARE_TITLE = "Міфи про українську енергетику — тест Хмарочоса";

export const TEST_SHARE_TEXT =
  "Вісім тверджень про українську енергетику: експорт, тарифи, батареї, графіки відключень. Відрізниш правду від міфу?";

/** URL шер-сторінки конкретного результату: /r/{slug}/ */
export function resultShareUrl(slug: string): string {
  return `${SITE_URL}/r/${slug}/`;
}

/** Версія OG-картинок: міняємо, коли картинки перемальовано, щоб соцмережі взяли нові. */
export const OG_VERSION = "1";
