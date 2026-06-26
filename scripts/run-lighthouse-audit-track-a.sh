#!/usr/bin/env bash
# Track A Lighthouse audit — home, category, PDP, OCC, industry, blog, cart, account
# Usage: npm run dev (or npm run build && npm run start) in one terminal, then:
#   ./scripts/run-lighthouse-audit-track-a.sh
# Requires: npx lighthouse available via npm.
#
# NOTE: this runs against localhost. Re-run with BASE=https://<production-candidate>
# pointed at the real production candidate before sign-off — local dev/build numbers
# are directional, not the launch gate.

set -e
OUTDIR="audit/lighthouse-track-a"
mkdir -p "$OUTDIR"
BASE="${BASE:-http://localhost:3000}"

routes=(
  "/:home"
  "/category/gloves:category"
  "/product/nitrile-exam-gloves-powder-free:pdp"
  "/solutions/occ:occ"
  "/industries/pharmacy:industry"
  "/blog/types-of-needles:blog"
  "/cart:cart"
  "/account:account"
)

for entry in "${routes[@]}"; do
  route="${entry%%:*}"
  slug="${entry##*:}"
  echo "Auditing $BASE$route -> $OUTDIR/$slug.json"
  npx lighthouse "$BASE$route" \
    --emulated-form-factor=mobile \
    --throttling-method=simulate \
    --output=json \
    --output-path="$OUTDIR/$slug.json" \
    --chrome-flags="--headless --no-sandbox" \
    --quiet || echo "  WARNING: failed: $route"
done

echo ""
echo "Done. Reports in $OUTDIR/"
echo "Extract one score: node -e \"const r=require('./$OUTDIR/home.json'); console.log(r.categories.performance.score*100, r.audits['largest-contentful-paint'].displayValue, r.audits['cumulative-layout-shift'].displayValue)\""
