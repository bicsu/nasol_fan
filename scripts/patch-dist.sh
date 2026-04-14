#!/bin/bash
set -e

DIST_DIR="$(dirname "$0")/../dist"
HTML="$DIST_DIR/index.html"

python3 - "$HTML" "$DIST_DIR" << 'PYEOF'
import sys, re, json

html_path = sys.argv[1]
dist_dir  = sys.argv[2]

with open(html_path, encoding='utf-8') as f:
    html = f.read()

# 1. Title
html = html.replace(
    '<title>나솔팬즈</title>',
    '<title>나솔팬즈 - 나는 솔로 팬 커뮤니티</title>'
)

# 2. 커스텀 CSS 블록 삽입 (html 에 flex 걸지 않도록 body/#root 만 타겟)
custom_css = """
  <style id="nasolfans-custom">
    body {
      margin: 0;
      padding: 0;
      background: #2A2A2A;
      display: flex;
      justify-content: center;
      overflow: hidden;
    }
    #root {
      max-width: 480px;
      width: 100%;
      background: #F5F4F0;
      box-shadow: 0 0 40px rgba(0,0,0,0.3);
      overflow: hidden;
    }
  </style>"""

html = html.replace('</head>', custom_css + '\n</head>')

# 3. meta / PWA 태그 추가
meta_tags = """
  <meta name="description" content="나는 솔로 팬들의 실시간 채팅, 토론, 예측 커뮤니티" />
  <meta property="og:title" content="나솔팬즈" />
  <meta property="og:description" content="나는 솔로 팬들의 실시간 채팅 · 토론 · 예측 커뮤니티" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="나솔팬즈" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#D4537E" />
  <link rel="manifest" href="/manifest.json" />"""

html = html.replace('</head>', meta_tags + '\n</head>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

# 4. manifest.json
manifest = {
    "name": "나솔팬즈",
    "short_name": "나솔팬즈",
    "description": "나는 솔로 팬들의 실시간 채팅 · 토론 · 예측 커뮤니티",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#F5F4F0",
    "theme_color": "#D4537E",
    "orientation": "portrait"
}
with open(dist_dir + '/manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False)

print("dist patched!")
PYEOF
