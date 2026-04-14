# Phase 2 앱인토스 연동 요구사항

> 작성일: 2026-04-14

## 완료된 선행 작업
- 사업자등록증 수령
- 앱인토스 개발자센터 가입 + 앱 등록 (appName: nasolFans)
- mTLS 인증서 발급 → `server/certs/` 저장 완료

## 구현 대상

### [db-dev] DB 스키마 보완
- `users` 테이블: `toss_user_key` 컬럼 확인 (이미 있으나 RLS 정책 보완)
- `user_consents` 테이블 추가: 약관 동의 이력 저장
- `notification_tokens` 테이블 추가: 토스 푸시 발송용 user_key 저장

### [backend-dev] Node.js 백엔드 서버 (`server/`)
- Express + mTLS 설정 (`server/certs/` 인증서 사용)
- 토스 로그인 OAuth 플로우:
  - `GET /auth/toss` — 인가코드 요청 redirect
  - `GET /auth/toss/callback` — 토큰 교환 → Supabase 유저 생성 → 세션 반환
  - `POST /auth/toss/disconnect` — 연결 끊기 콜백
- 토스 푸시 알림 API:
  - `POST /push/send` — 푸시 발송 (mTLS로 토스 API 호출)
  - `POST /push/schedule` — 방영 30분 전 예약 발송
- cron: 에피소드 chat_status 자동 전환 (open/extended/closed)

### [frontend-dev] 프론트 화면 수정
- `app/login.tsx`: 닉네임 임시 로그인 → 토스 로그인 버튼 + OAuth redirect 처리
- `app/terms.tsx`: 서비스 이용약관 + 개인정보처리방침 페이지 (이미 있음, 내용 보완)
- `app/consent.tsx`: 최초 로그인 시 약관 동의 UI (동의 후 DB 저장)
- 환경변수: `EXPO_PUBLIC_BACKEND_URL` 추가

### [qa-review] 통합 QA
- 토스 로그인 플로우 경계면 검증
- 약관 동의 미완료 시 서비스 접근 차단 확인
- 앱인토스 컴플라이언스 체크리스트 검토

## 일정 계획

| 날짜 | 작업 |
|------|------|
| 2026-04-14 (오늘) | DB 마이그레이션 + 백엔드 서버 기초 + 토스 로그인 플로우 |
| 2026-04-15 | 프론트 토스 로그인 UI + 약관 동의 화면 |
| 2026-04-16 | 토스 푸시 알림 연동 + cron 스케줄러 |
| 2026-04-17 | 통합 QA + 앱인토스 가이드라인 점검 |
| 2026-04-18 | 앱 번들 빌드 + 콘솔 업로드 + QR 테스트 |
| 2026-04-21 | 출시 검수 요청 (영업일 3일 소요 → 4/24 출시 목표) |
