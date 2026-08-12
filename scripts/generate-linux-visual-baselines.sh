#!/usr/bin/env bash
# Generates Linux Playwright screenshot baselines inside the official
# Playwright Docker image. Screenshots are platform-suffixed
# (*-darwin.png / *-linux.png), so a Windows/macOS dev machine cannot
# produce the *-linux.png files CI (ubuntu-latest) needs to compare
# against — this must run in a real Linux environment.
#
# Requires: Docker Desktop running locally.
# Usage: ./scripts/generate-linux-visual-baselines.sh
set -euo pipefail

if ! command -v docker >/dev/null; then
  echo "Docker is required to generate Linux Playwright baselines." >&2
  exit 1
fi

PW_VERSION=$(npx playwright --version | awk '{print $2}')
IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}-jammy"

echo "Generating Linux visual baselines with ${IMAGE} ..."

docker run --rm \
  -v "$(pwd)":/work \
  -v /work/node_modules \
  -v /work/.next \
  -w /work \
  --env-file .env.local \
  "$IMAGE" \
  bash -c "npm ci && npx playwright test e2e/visual.spec.ts --update-snapshots"

echo ""
echo "Done. New/changed snapshot files:"
git status --porcelain e2e/visual.spec.ts-snapshots/
