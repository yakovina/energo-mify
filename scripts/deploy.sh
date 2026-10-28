#!/usr/bin/env bash
# Збирає сайт для GitHub Pages і викладає out/ у гілку gh-pages.
# Pages налаштовано як legacy: гілка gh-pages, корінь.
# Наприкінці чекає, поки живий сайт почне віддавати саме цю збірку
# (статус Pages «built» може ще належати попередній).
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE=$(git remote get-url origin)
SITE="https://yakovina.github.io/energo-mify/"
npm run build
touch out/.nojekyll
# мітка збірки: buildId (папка в out/_next/static) міняється щоразу, навіть коли стилі ті самі
CSS=$(ls out/_next/static | grep -v '^chunks$' | head -1)
grep -q "$CSS" out/index.html || CSS=$(grep -o '_next/static/chunks/[a-z0-9]*\.css' out/index.html | head -1)

TMP=$(mktemp -d)
cp -R out/. "$TMP"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "Збірка $(date '+%Y-%m-%d %H:%M')"
git push -q -f "$REMOTE" gh-pages
cd - >/dev/null
rm -rf "$TMP"

for i in $(seq 1 60); do
  if curl -fs "${SITE}?v=$(date +%s)" | grep -q "$CSS"; then
    echo "deploy: $SITE (нова збірка вже на сайті)"
    exit 0
  fi
  sleep 10
done
echo "deploy: збірку викладено, але за 10 хвилин сайт ще віддає попередню версію" >&2
exit 1
