# Міфи про українську енергетику — тест Хмарочоса

Вісім тверджень, відповідь «Правда» чи «Неправда», три рівні результату.
Next.js 15, статичний експорт; піксельний дизайн під ілюстрацію.

- Контент: `data/quiz.ts` (твердження, пояснення, джерела, рівні).
- Рушій: `app/useQuiz.ts`; вигляд: `app/skins/pixel` (`PixelSkin.tsx`, `pixel.css`).
- Ілюстрації: `public/art` (обкладинка, пагорби, лампочка, свічка, батарейки).
- Шер-сторінки рівнів: `/r/hostage/`, `/r/observer/`, `/r/analyst/`.
- Статистика: `app/stats.ts` (вимкнена, поки `FORM` порожній).

## Команди

```bash
npm run dev          # локально на :3000
npm run og           # перемалювати OG-картинки з og-src/og.html (потрібен Google Chrome)
npm run deploy       # зібрати й викласти на GitHub Pages (гілка gh-pages)
npm run build:partner  # збірка під hmarochos.kiev.ua/partner/energo-mify
```

Після зміни OG-картинок підніміть `OG_VERSION` в `app/share.ts`, щоб соцмережі взяли нові.
