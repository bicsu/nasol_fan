# QA 리포트 — Phase 2 앱인토스 연동
> 검토일: 2026-04-14
> 검토자: qa-review 에이전트
> 검토 범위: DB 마이그레이션 1개, 백엔드 9개 파일, 프론트엔드 4개 파일

---

## CRITICAL (즉시 수정 필요)

- [ ] **[DB ↔ 백엔드 스키마 불일치] `notification_tokens.enabled` 컬럼 부재**
  - DB (`006_phase2_auth.sql:76-84`): 테이블에 `is_active boolean` 컬럼만 존재
  - 백엔드 (`server/src/services/supabase.js:31, 79`): `enabled` 필드로 upsert/update 시도
  - 백엔드 (`server/src/routes/push.js:40`): `.eq('enabled', true)` 로 조회 → 항상 0건 반환되어 **브로드캐스트 푸시 전원 미발송 버그**
  - 권고: 둘 중 한쪽으로 통일. DB 컬럼명 `is_active`를 유지하고 백엔드 코드를 `is_active`로 수정하거나, 마이그레이션에서 `enabled`로 변경.

- [ ] **[인증 플로우 치명 결함] Supabase `listUsers` 페이지네이션 오용**
  - 위치: `server/src/routes/auth.js:60-65`
  - 현상: `listUsers({ page: 1, perPage: 1 })` 로 호출하는데, 이는 **전체 유저 중 1명만** 반환. 그 1명의 email이 우연히 일치하지 않으면 항상 `existing=undefined`가 되어 **매 로그인마다 `createUser` 호출 → 중복 유저 생성 시도 → Supabase가 이메일 중복 에러 반환**.
  - 권고: `supabase.auth.admin.getUserByEmail(email)` 또는 적절한 페이지네이션 루프, 혹은 `users` 테이블에서 `toss_user_key`로 선조회 후 `auth.admin.getUserById` 사용.

- [ ] **[인증 플로우 결함] magiclink redirect로 세션 전달 방식의 위험**
  - 위치: `server/src/routes/auth.js:91-103`
  - 현상: `generateLink('magiclink')`의 `action_link`는 Supabase 호스트 URL이며, 이동 시 프론트로 복귀하려면 `redirect_to`를 명시해야 한다. 현재 `redirect_to` 미설정 → 기본 Site URL로만 이동하므로 딥링크 앱 복귀가 끊긴다.
  - 권고: `generateLink({ type: 'magiclink', email, options: { redirectTo: `${FRONTEND_URL}/login?login=success` } })` 로 수정하거나, 커스텀 JWT 발급 방식으로 전환.
  - 추가: 현재 `router.replace('/consent')` 는 URL 파라미터만 보고 이동하므로 실제 Supabase 세션이 쿠키/토큰으로 완결되었는지 검증되지 않음. `loadSession()` 이후 `session?.user?.id` 존재 여부로 라우팅해야 함.

- [ ] **[보안] 인가코드 1회 사용 체크를 `code` 원본으로 Set에 저장**
  - 위치: `server/src/routes/auth.js:19-20, 40-43`
  - 현상: `usedCodes.add(code)` — 토큰 교환 실패 시에도 code가 영구 차단됨. 또한 서버 재시작 / 다중 인스턴스에서 중복 사용 가능. 가장 큰 문제는 **성공 여부와 무관하게 재시도 차단**.
  - 권고: 토큰 교환 성공 후에만 add, 또는 Redis 기반 + TTL 5분.

- [ ] **[보안] `getHttpsServerOptions`의 `rejectUnauthorized: false`**
  - 위치: `server/src/mtls.js:56`
  - 현상: 서버 HTTPS 옵션에서 rejectUnauthorized를 false로 설정. mTLS 서버로 쓰려면 `requestCert: true, rejectUnauthorized: true`가 정상. 현재 `requestCert: false`이므로 **mTLS 역할을 전혀 수행하지 못함** (클라이언트 인증서 검증 없이 HTTPS만 제공).
  - 권고: 토스 → 백엔드 콜백(`/auth/toss/disconnect`)은 mTLS 상호 검증 대상이므로 `requestCert: true, rejectUnauthorized: true`로 설정하고, 토스 CA로 검증. 지금 상태로는 disconnect 엔드포인트가 **인증 없이 누구나 호출 가능 → 임의 유저 강제 연결 해제 가능한 치명적 취약점**.

- [ ] **[보안] `/auth/toss/disconnect` 호출자 검증 부재**
  - 위치: `server/src/routes/auth.js:116-128`
  - 현상: body에 tossUserKey 만 있으면 누구나 타 유저의 연결을 끊어버릴 수 있음. mTLS 미검증 시 공격자가 임의 유저의 토스 연결 강제 해제 가능.
  - 권고: 위 mTLS 서버 설정 수정 + 요청 소스 검증(토스 CA 서명된 클라이언트 인증서 또는 서명 헤더).

- [ ] **[프론트-DB 경계면] `consent.tsx`에서 익명 supabase 클라이언트로 upsert 시도**
  - 위치: `app/consent.tsx:58-64`
  - 현상: RLS 정책 `user_consents_own_insert`는 `auth.uid() = user_id` 조건인데, 프론트 `supabase` 클라이언트가 **토스 로그인 후 실제 Supabase Auth 세션을 보유하지 않은 경우** `auth.uid()`가 null → RLS 차단.
  - 백엔드의 `magiclink` 방식이 제대로 동작해야만 성립 (위 CRITICAL 항목과 연쇄). 현재 플로우에서는 RLS에 의해 insert가 실패할 가능성이 높음.
  - 권고: 인증 플로우 수정 후 E2E 시나리오로 반드시 실제 `auth.uid()`가 바인딩되는지 테스트.

- [ ] **[앱인토스 컴플라이언스] consent 화면 뒤로가기 차단 미흡**
  - 위치: `app/_layout.tsx:52-54`
  - 현상: `headerBackVisible: false` 로 헤더의 뒤로가기만 숨겼음. 안드로이드 하드웨어 백버튼 및 스와이프 제스처(`gestureEnabled`)는 여전히 활성화. 동의 미완료 유저가 뒤로가기로 홈 탭 진입 가능.
  - 권고: `gestureEnabled: false` 추가 + `BackHandler` 로 Android 백 처리. 추가로 `(tabs)` 진입 가드(예: `_layout.tsx`에서 consent 여부 체크 후 redirect) 필요. **현재 `user_consents` 완료 여부를 홈 진입 전에 검증하는 로직 자체가 부재**.

---

## WARNING (출시 전 확인 권장)

- [ ] **[DB] `users.toss_user_key`에 UNIQUE 제약 확인 필요**
  - `000_initial_schema.sql` 파일에 `toss_user_key text unique` 명시되어 있으나, `upsertTossUser`는 `onConflict: 'id'` 로만 처리. 동일 토스키가 다른 `id`로 접근할 경우 unique 위반 가능. 거의 발생하지 않지만 복구 방어로 서비스 레이어에서 선조회 권장.

- [ ] **[백엔드] `exchangeCodeForToken`의 client_secret을 body로 전송**
  - 위치: `server/src/services/tossAuth.js:30-43`
  - 토스 스펙 미확인 TODO 상태. 실제 연동 시 Basic Auth 헤더 방식일 가능성. 콘솔 문서로 최종 확인 필요.

- [ ] **[백엔드] CORS 기본값이 `true` (reflect any origin)**
  - 위치: `server/src/index.js:17-23`
  - `FRONTEND_URL` 미설정 시 `origin: true` → 모든 오리진 허용. 명시적으로 production에서는 빈 배열로 기본값 변경 권장. 하드코딩된 wildcard(`*`)는 아니지만 운영 미설정 시 사실상 동일.

- [ ] **[백엔드] 환경변수 누락 방어 부재**
  - `TOSS_CLIENT_ID`, `TOSS_CLIENT_SECRET`, `TOSS_REDIRECT_URI` 미설정 시 `undefined`로 URL 생성 → 로그인 흐름 중단. 서버 부팅 시 필수 env 검증 로직 추가 권장.
  - `SUPABASE_URL/KEY`는 lazy check라 첫 요청 시 500 에러. 시작 시 즉시 검증 권장.

- [ ] **[cron] `chat_status='closed'` 초기값과 default의 혼선**
  - `cron/episodeStatus.js:31`: 방영 전에도 `closed`로 기록. 스키마 기본값도 `closed`. 의미상 괜찮으나 "종료 후 closed"와 "방영 전 closed" 구분이 불가. `pending` 상태 추가 고려.

- [ ] **[cron] 다중 인스턴스 배포 시 중복 실행**
  - `node-cron`은 프로세스별로 돌므로 HA 구성 시 여러 인스턴스가 같은 에피소드를 동시 업데이트. Supabase Edge Function 또는 단일 leader로 전환 권장.

- [ ] **[프론트] `login.tsx` 딥링크 복귀 미처리**
  - iOS/Android에서 `Linking.openURL(authUrl)`로 외부 브라우저 열면 콜백이 앱으로 돌아오지 않음. Expo에서 `WebBrowser.openAuthSessionAsync` 또는 딥링크 스킴 등록이 필요.
  - 앱인토스 미니앱 환경에서는 WebView라 `window.location.href`로도 가능하나, 네이티브 앱 배포 시 반드시 수정.

- [ ] **[프론트] `terms.tsx`의 고객문의 이메일 = `nasolfans@gmail.com` 노출**
  - 외부 이메일 링크를 탭 가능한 링크로 만들면 메일 앱 실행 = 앱인토스 외부앱 호출 가능성 이슈. 현재 단순 텍스트라 허용 범위(법률 고지). 링크화 시 주의.

- [ ] **[프론트] `/terms` 한 페이지에 이용약관 + 개인정보처리방침 동시 표기**
  - `login.tsx:97-103`: 두 링크 모두 `/terms`로 이동. 법적으로는 각각 별도 페이지 분리 또는 명확한 섹션 앵커 제공 권장. 현재는 동일 페이지 하단에 개인정보처리방침이 나열됨 → 기능상 문제는 없으나 가독성/법적 선명성 보완.

- [ ] **[백엔드] `fetchTossUserInfo`의 필수 필드 검증 부재**
  - `userInfo.tossUserKey`가 undefined면 `tossUserKey.slice(-6)` 에서 TypeError. 가드 추가 권장.

- [ ] **[DB] `users` 테이블 `users_public_read` 정책**
  - `SELECT USING (true)` → 모든 컬럼이 누구에게나 조회 가능. 토스 유저키(CI성 정보)가 노출됨. 뷰로 공개 컬럼만 분리하거나 `toss_user_key` 컬럼은 조회 불가하도록 정책 분리 권장.
  - **검토 항목의 "users: toss_user_key 타인 접근 불가" 요구사항 미충족** — CRITICAL로 격상 가능하나, 공개 커뮤니티 특성상 대부분의 필드(닉네임, 아바타색)는 공개 필요. 최소 `toss_user_key`만 숨기는 정책으로 교체.

---

## PASS (정상 확인)

- [x] **[앱인토스] 토스 로그인 외 다른 로그인 방식 없음** (`app/login.tsx` — 토스 버튼 단일)
- [x] **[앱인토스] 약관 동의 UI 존재** (`consent.tsx` — 이용약관/개인정보/만 19세 3개 항목)
- [x] **[앱인토스] 만 19세 이상 명시** (`login.tsx:93`, `terms.tsx` 제4조)
- [x] **[앱인토스] 외부 앱 설치 유도/외부 광고 없음**
- [x] **[앱인토스] 포인트 무현금 교환 명시** (`terms.tsx` 제9조②, 개인정보처리방침 8조①)
- [x] **[앱인토스] 투표 무료 참여·금전 보상 없음 명시** (`terms.tsx` 제10조③, 8조②)
- [x] **[DB RLS] `user_consents` 본인만 read/write 정책** (006 마이그레이션 57-70)
- [x] **[DB RLS] `notification_tokens` service_role만 write** (insert/update 정책 미선언 → RLS 기본 차단)
- [x] **[DB RLS] `notification_tokens` 본인만 read** (`own_read` 정책)
- [x] **[보안] 인증서 파일 하드코딩 없음** (환경변수 `CERT_PATH/CERT_FILE/KEY_FILE/CA_FILE`)
- [x] **[보안] SQL 인젝션 방어** — Supabase JS 클라이언트 파라미터 바인딩 전면 사용, 원시 SQL 조립 없음
- [x] **[보안] service_role 키는 백엔드 전용** (`services/supabase.js`만 사용)
- [x] **[백엔드] 환경변수 기반 설정** (SUPABASE_URL/KEY, TOSS_*, FRONTEND_URL 등)
- [x] **[DB] `user_consents` UNIQUE(user_id) → 중복 동의 방지**
- [x] **[DB] `notification_tokens` updated_at 자동 갱신 트리거**

---

## 수동 작업 필요 (콘솔/환경변수 설정)

- 앱인토스 개발자센터에서 mTLS 인증서 발급 후 `./certs/` 디렉토리에 배치
  - `nasol_fans_public.crt`, `nasol_fans_private.key`, `toss-ca.crt`
- `.env` 작성 (서버)
  - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
  - `TOSS_CLIENT_ID`, `TOSS_CLIENT_SECRET`, `TOSS_REDIRECT_URI`
  - `TOSS_AUTH_BASE_URL` (토스 실제 호스트 확인)
  - `FRONTEND_URL` (Vercel 배포 URL)
  - `USE_HTTPS=true`, `CERT_PATH=./certs`
  - `PORT`
- `.env` 작성 (Expo)
  - `EXPO_PUBLIC_BACKEND_URL` (프로덕션 백엔드 URL)
- 토스 OAuth 실제 엔드포인트 경로 확인 후 `tossAuth.js`의 TODO 주석 업데이트
  - `/v1/oauth2/authorize`, `/v1/oauth2/token`, `/v1/oauth2/userinfo` — 스펙 재확인
- 토스 푸시 템플릿 콘솔 등록
  - 방영 30분 전 알림, 투표 결과 발표, 인기글 알림 (`templateSetCode` 3종)
- Supabase Auth 설정
  - Site URL / Redirect URL에 앱 딥링크 및 Vercel URL 등록
  - `generateLink` 의 redirectTo 허용 도메인 설정
- 약관 동의 페이지 운영용 별도 URL 준비 (앱인토스 콘솔 등록용)
- 사업자등록증 수령 후 앱인토스 앱 등록 (appName: `nasolFans`)
- `점검 항목 재검증`: CRITICAL 항목 수정 후 재 QA 필수 (특히 notification_tokens 컬럼명, magiclink redirect, mTLS requestCert)

---

## 담당 에이전트 배분

- **db-dev**: notification_tokens 컬럼명 통일(is_active vs enabled), users 공개 뷰 또는 toss_user_key 숨김 정책
- **backend-dev**:
  - `listUsers` → `getUserByEmail` 교체
  - `generateLink` redirectTo 옵션 추가 또는 커스텀 JWT 전환
  - `mtls.js`의 `requestCert/rejectUnauthorized` 운영용 설정
  - `/auth/toss/disconnect` 호출자 검증 강화
  - 환경변수 부팅 시 검증, usedCodes 정책 수정
- **frontend-dev**:
  - consent 뒤로가기 완전 차단(gesture + 하드웨어 백)
  - `(tabs)` 진입 전 `user_consents` 체크 가드
  - 네이티브 환경 딥링크 복귀 처리(WebBrowser.openAuthSessionAsync)
  - 토스 OAuth 성공 시 실제 Supabase 세션 존재 검증
