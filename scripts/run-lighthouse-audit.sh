#!/usr/bin/env bash
# B6 Lighthouse audit — runs against localhost:3000
# Usage: npm run dev (in separate terminal), then ./scripts/run-lighthouse-audit.sh
# Requires: npx lighthouse available via npm

set -e
OUTDIR="audit/lighthouse"
mkdir -p "$OUTDIR"
BASE="http://localhost:3000"

routes=(
  "/:homepage"
  "/blog:blog-hub"
  "/blog/types-of-needles:blog-types-of-needles"
  "/blog/types-of-sutures:blog-types-of-sutures"
  "/partners:partners-directory"
  "/partners/dawn-mist:partners-dawn-mist"
  "/partners/graham-field:partners-graham-field"
  "/industries/pharmacy:industry-pharmacy"
  "/industries/dental:industry-dental"
  "/solutions/occ:solutions-occ"
  "/products/nitrile-exam-gloves-powder-free:product-nitrile-gloves"
)

for entry in "${routes[@]}"; do
  route="${entry%%:*}"
  slug="${entry##*:}"
  echo "Auditing $BASE$route → $OUTDIR/$slug.json"
  npx lighthouse "$BASE$route" \
    --emulated-form-factor=mobile \
    --throttling-method=simulate \
    --output=json \
    --output-path="$OUTDIR/$slug.json" \
    --chrome-flags="--headless --no-sandbox" \
    --quiet || echo "  ⚠️  Failed: $route"
done

echo ""
echo "Done. Reports in $OUTDIR/"
echo "Extract scores: node -e \"const r=require('./$OUTDIR/homepage.json'); console.log('perf:', r.categories.performance.score*100, 'a11y:', r.categories.accessibility.score*100)\""
