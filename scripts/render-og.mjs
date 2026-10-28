// Рендерить OG-картинки з og-src/og.html системним Chrome у headless-режимі.
// Запускати після заміни ілюстрацій: npm run og
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const root = process.cwd();
const page = pathToFileURL(join(root, "og-src", "og.html")).href;

const jobs = [
  { out: "og-test.png", q: "" },
  { out: "og-hostage.png", q: "?l=hostage" },
  { out: "og-observer.png", q: "?l=observer" },
  { out: "og-analyst.png", q: "?l=analyst" },
];

for (const j of jobs) {
  const target = join(root, "public", j.out);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--virtual-time-budget=2000",
    "--window-size=1200,630",
    `--screenshot=${target}`,
    page + j.q,
  ], { stdio: "ignore" });
  console.log(`og: public/${j.out}`);
}
