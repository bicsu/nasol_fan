#!/bin/bash
# 웹 빌드 후 dist/index.html 패치 스크립트

DIST_DIR="$(dirname "$0")/../dist"
HTML="$DIST_DIR/index.html"

# OG 태그 삽입
sed -i '' 's|<title>나솔팬즈</title>|<title>나솔팬즈 - 나는 솔로 팬 커뮤니티</title>\
    <meta name="description" content="나는 솔로 팬들의 실시간 채팅, 토론, 예측 커뮤니티" />\
    <meta property="og:title" content="나솔팬즈" />\
    <meta property="og:description" content="나는 솔로 팬들의 실시간 채팅 · 토론 · 예측 커뮤니티" />\
    <meta property="og:image" content="https://nasol-fans.vercel.app/og-image.png" />\
    <meta property="og:url" content="https://nasol-fans.vercel.app" />\
    <meta property="og:type" content="website" />\
    <meta property="og:site_name" content="나솔팬즈" />\
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=no" />\
    <meta name="apple-mobile-web-app-capable" content="yes" />\
    <meta name="mobile-web-app-capable" content="yes" />\
    <meta name="theme-color" content="#D4537E" />\
    <link rel="manifest" href="/manifest.json" />|' "$HTML"

# CSS 앱 스타일 적용
sed -i '' 's|html,|html, body { margin:0; padding:0; background:#2A2A2A; } html,|' "$HTML"
sed -i '' 's|body {|body { display:flex; justify-content:center;|' "$HTML"
sed -i '' 's|#root {|#root { max-width:480px; width:100%; background:#F5F4F0; box-shadow:0 0 40px rgba(0,0,0,0.3); overflow:hidden;|' "$HTML"
sed -i '' 's|height: 100%;|height: 100dvh;|g' "$HTML"

# OG 이미지 생성
python3 -c "
import struct, zlib
W, H = 600, 315
r, g, b = 0xD4, 0x53, 0x7E
raw = b''.join(b'\x00' + bytes([r, g, b]) * W for _ in range(H))
def chunk(t, d):
    c = t + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
with open('$DIST_DIR/og-image.png', 'wb') as f:
    f.write(b'\x89PNG\r\n\x1a\n')
    f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0)))
    f.write(chunk(b'IDAT', zlib.compress(raw)))
    f.write(chunk(b'IEND', b''))
"

# manifest.json
cat > "$DIST_DIR/manifest.json" << 'MANIFEST'
{"name":"나솔팬즈","short_name":"나솔팬즈","description":"나는 솔로 팬들의 실시간 채팅 · 토론 · 예측 커뮤니티","start_url":"/","display":"standalone","background_color":"#F5F4F0","theme_color":"#D4537E","orientation":"portrait"}
MANIFEST

echo "dist patched!"
