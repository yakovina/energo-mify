// basePath для статичних асетів: Next підставляє префікс лише в роутинг,
// тож у <img src> додаємо його самі. Значення — з NEXT_PUBLIC_BASE_PATH
// (інлайниться на етапі збірки), за замовчуванням — GitHub Pages.
export const BP =
  process.env.NODE_ENV === "production"
    ? (process.env.NEXT_PUBLIC_BASE_PATH ?? "/energo-mify")
    : "";

export const asset = (p: string) => `${BP}${p}`;
