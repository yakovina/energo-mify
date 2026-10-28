// Після статичного експорту префіксуємо кореневі url(...) у CSS базовим шляхом
// GitHub Pages (/energo-mify) — Next цього для CSS не робить.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? "/energo-mify";
const root = join(process.cwd(), "out", "_next");

function cssFiles(dir) {
  let acc = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) acc = acc.concat(cssFiles(p));
    else if (e.endsWith(".css")) acc.push(p);
  }
  return acc;
}

const files = cssFiles(root);
if (!files.length) console.log("fix-basepath: css не знайдено, пропускаю");

for (const p of files) {
  const src = readFileSync(p, "utf8");
  // url(/...), url("/..."), url('/...') — але не url(//...) і не data:
  const out = src.replace(/url\((['"]?)\/(?!\/)/g, `url($1${BP}/`);
  if (out !== src) {
    writeFileSync(p, out);
    console.log(`fix-basepath: ${p} оновлено`);
  }
}
