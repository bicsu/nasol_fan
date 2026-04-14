#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▶ 1/3 웹 빌드..."
cd "$ROOT"
npx expo export -p web --clear

echo "▶ 2/3 dist 패치..."
bash "$ROOT/scripts/patch-dist.sh"

echo "▶ 3/3 Vercel 배포..."
npx vercel --prod --yes

echo "✅ 배포 완료"
echo "🔗 https://nasolfans.vercel.app"
