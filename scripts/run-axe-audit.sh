#!/usr/bin/env bash
# axe-core scan across the 8 ticket routes.
# Usage: npm run dev (in another terminal), then ./scripts/run-axe-audit.sh
# Requires: npx (pulls @axe-core/cli on demand, no project dependency added).

set -e
OUTDIR="audit/axe"
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
  echo "Scanning $BASE$route -> $OUTDIR/$slug.json"
  npx --yes @axe-core/cli "$BASE$route" \
    --save "$OUTDIR/$slug.json" \
    --tags wcag2a,wcag2aa \
    || echo "  WARNING: scan failed or found violations: $route"
done

echo ""
echo "Done. Reports in $OUTDIR/"
