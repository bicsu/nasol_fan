---
name: appintoss-qa
description: 나솔팬즈 앱인토스 출시 전 품질 검증 가이드. 통합 정합성 검증(API ↔ 프론트 ↔ DB 경계면), 앱인토스 출시 체크리스트 점검, 보안 취약점 탐지, 토스 로그인/광고/외부링크 정책 준수 확인. 출시 전 최종 점검, 컴플라이언스 검토, 코드 통합 QA, 보안 리뷰 요청 시 반드시 이 스킬을 사용할 것.
---

# 앱인토스 QA 가이드

나솔팬즈 앱인토스 출시 전 통합 품질 검증 방법론.

## 검증 원칙: 경계면 교차 비교

단순 "파일 존재 확인"이 아닌, 경계를 넘나드는 **교차 비교**로 실제 통합 버그를 찾는다.

```
프론트 훅의 기대 타입 ↔ 백엔드 API 응답 shape ↔ DB 컬럼 타입
```

예: 프론트가 `user.avatar_color`를 기대하는데 DB 컬럼이 `avatarColor`이면 런타임 에러 발생.

## 이슈 심각도 분류

| 심각도 | 의미 | 예시 |
|--------|------|------|
| `CRITICAL` | 출시 차단 | 토스 외 로그인 UI, mTLS 미적용, RLS 미설정 |
| `WARNING` | 개선 필요 | API 응답 타입 불일치, 인덱스 누락 |
| `INFO` | 참고 사항 | 코드 스타일, 최적화 기회 |

## 앱인토스 컴플라이언스 체크리스트

### 로그인/인증
- [ ] **[CRITICAL]** 토스 로그인만 사용 — 소셜(카카오·네이버·구글) 또는 이메일 로그인 없음
- [ ] **[CRITICAL]** 현재 닉네임 임시 로그인(`app/login.tsx`)이 토스 로그인으로 교체됨
- [ ] `app/login.tsx`에 토스 로그인 버튼만 존재

### 광고
- [ ] **[CRITICAL]** AdMob, 카카오 광고, 네이버 광고 등 외부 광고 SDK 없음
- [ ] 앱인토스 광고만 사용 (Phase 3에서 연동 예정)

### 외부 링크
- [ ] **[CRITICAL]** 다른 앱 설치 유도 없음
- [ ] `Linking.openURL()` 사용처 확인 — 개인정보처리방침, 이용약관만 허용
- [ ] 앱 내 모든 기능이 미니앱 내에서 완결

### 포인트/사행성
- [ ] 약관(`app/terms.tsx`)에 "포인트 현금 교환 불가" 명시
- [ ] 약관에 "만 19세 이상 이용" 명시
- [ ] 투표 = 무료 참여, 금전적 보상 없음 명시

## 통합 정합성 체크포인트

### 프론트 ↔ 백엔드 경계면

```
검증 방법:
1. 프론트 코드에서 백엔드 API 호출부 찾기 (Grep: fetch|axios|api/)
2. 호출 시 전송하는 body 구조 확인
3. 백엔드 라우트 핸들러에서 req.body에서 읽는 필드 확인
4. 타입 불일치 여부 비교
```

### 백엔드 ↔ DB 경계면

```
검증 방법:
1. 백엔드 코드에서 Supabase 쿼리 찾기 (Grep: .from\('|supabase\.)
2. 쿼리하는 컬럼명 확인
3. supabase/schema.sql에서 실제 컬럼명 확인
4. snake_case vs camelCase 불일치 탐지
```

### RLS 정책 검증

```sql
-- 다음 테이블에 RLS가 활성화되어 있는지 확인:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 각 테이블의 정책 확인:
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 있는가
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 프론트(`lib/supabase.ts`) 코드에 없는가
- [ ] mTLS 인증서 파일이 git에 커밋되지 않았는가
- [ ] `Grep: service_role` 결과가 `backend/` 디렉토리에만 있는가

## QA 보고서 형식

```markdown
# QA 보고서 - {날짜}

## 요약
- CRITICAL: {N}건
- WARNING: {N}건
- INFO: {N}건

## CRITICAL 이슈

### [CRITICAL-001] {제목}
- **위치**: `{파일경로}:{라인번호}`
- **현상**: {발견된 문제}
- **권고**: {수정 방법}
- **담당**: {frontend-dev|backend-dev|db-dev}

## WARNING 이슈
...
```

## 검증 순서 (권장)

1. **보안 스캔** → 키 노출, mTLS 미설정
2. **컴플라이언스** → 토스 정책 위반 항목
3. **통합 정합성** → 경계면 타입 불일치
4. **RLS 정책** → 누락된 테이블
5. **약관 내용** → 필수 고지 사항

## 참고 파일

- `.claude/apps-in-toss-checklist.md` — 앱인토스 전체 출시 체크리스트
- `.claude/apps-in-toss-reference.md` — 앱인토스 기술 참조 문서
