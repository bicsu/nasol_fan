#!/bin/bash
set -e

echo "▶ 1/3 웹 빌드..."
npx expo export -p web --clear

echo "▶ 2/3 dist 패치..."
bash "$(dirname "$0")/patch-dist.sh"

echo "▶ 3/3 Vercel 배포..."
npx vercel --prod --yes

echo "✓ 배포 완료"
