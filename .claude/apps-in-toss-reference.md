# 앱인토스 (Apps in Toss) 개발 레퍼런스

## 개발자센터

- 메인: https://developers-apps-in-toss.toss.im/
- 개발자 커뮤니티: https://techchat-apps-in-toss.toss.im/
- GitHub 예제: https://github.com/toss/apps-in-toss-examples

## 푸시 알림

### 문서
- 이해하기: https://developers-apps-in-toss.toss.im/push/intro.html
- 개발하기: https://developers-apps-in-toss.toss.im/push/develop.html

### API
- 엔드포인트: `POST https://{{domain}}/api-partner/v1/apps-in-toss/messenger/send-message`
- 인증: `X-Toss-User-Key` 헤더 (토스 로그인 연동 필수)
- 요청 본문: `templateSetCode` (사전 등록 템플릿 코드) + `context` (변수 객체)
- 별도 SDK 설치 불필요 — REST API 호출로 발송, 토스 앱이 푸시 전달

### 메시지 종류
- 기능성 메시지: 서비스 이용에 필수적인 정보 (주문, 결제, 배송 등) — 동의 받은 유저
- 광고성 메시지: 마케팅 수신 동의한 유저 대상 프로모션

### 선행 조건
1. 토스 로그인 연동 (카카오 등 다른 OAuth로는 불가)
2. 앱인토스 콘솔에서 미니앱 등록 + 심사
3. 메시지 템플릿 콘솔에서 사전 등록

## 스마트 발송 (Smart Message)

- 이해하기: https://developers-apps-in-toss.toss.im/smart-message/intro.html
- 콘솔 가이드: https://developers-apps-in-toss.toss.im/smart-message/console.html
- sendMessage API: https://developers-apps-in-toss.toss.im/api/sendMessage.html
- 세그먼트 + 발송 시점 최적화를 자동으로 처리하는 마케팅 도구
- 신규 유저 획득, 리텐션 개선 용도

## 기타 문서

- 앱인토스란: https://developers-apps-in-toss.toss.im/intro/overview.html
- 토스 로그인 연동: https://developers-apps-in-toss.toss.im/login/intro.html
- API 사용하기: https://developers-apps-in-toss.toss.im/development/integration-process.html
- AI 개발 가이드 (MCP): https://developers-apps-in-toss.toss.im/development/llms.html
- 미니앱 가이드라인: https://developers-apps-in-toss.toss.im/checklist/miniapp-service.html
- 리텐션 확보: https://developers-apps-in-toss.toss.im/growth/retention.html
- 데이터 기반 인사이트: https://developers-apps-in-toss.toss.im/growth/insight.html
- 릴리즈 노트: https://developers-apps-in-toss.toss.im/release-note.html
- FAQ: https://developers-apps-in-toss.toss.im/faq.html

---
조사일: 2026-03-23
