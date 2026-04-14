---
name: nasol-build
description: 나솔팬즈 기능 개발 에이전트 팀 오케스트레이터. 프론트엔드·백엔드·DB에 걸친 기능 구현, 앱인토스 Phase 2 연동(토스 로그인·mTLS·푸시 알림), 화면 개발, DB 스키마 변경, 통합 QA 요청 시 에이전트 팀을 조율하여 처리. 후속 작업: 기능 수정, 부분 재실행, 업데이트, 보완, 다시 실행, 이전 결과 개선, 앱인토스 준비 점검 요청 시에도 반드시 이 스킬을 사용.
---

# nasol-build Orchestrator

나솔팬즈의 기능 개발 에이전트 팀을 조율하는 통합 스킬.

## 실행 모드: 에이전트 팀

## 에이전트 구성

| 팀원 | 에이전트 타입 | 역할 | 스킬 | 출력 |
|------|-------------|------|------|------|
| frontend-dev | general-purpose | Expo/RN 화면·컴포넌트 | expo-screen | `app/`, `components/` |
| backend-dev | general-purpose | Node.js + mTLS + 토스 API | toss-integration | `backend/` |
| db-dev | general-purpose | Supabase 스키마·RLS·마이그레이션 | supabase-ops | `supabase/migrations/` |
| qa-review | general-purpose | 통합 QA + 앱인토스 컴플라이언스 | appintoss-qa | `_workspace/qa_report.md` |

## 워크플로우

### Phase 0: 컨텍스트 확인 (후속 작업 지원)

`_workspace/` 디렉토리 존재 여부를 확인하여 실행 모드를 결정한다:

- **미존재** → 초기 실행, Phase 1로 진행
- **존재 + 부분 수정 요청** → 부분 재실행, 해당 에이전트만 재호출, 기존 산출물 중 수정 대상만 덮어씀
- **존재 + 새 기능 요청** → 새 실행, 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동 후 Phase 1 진행

### Phase 1: 요구사항 분석

1. 사용자 요청 분석 — 어떤 레이어가 영향을 받는지 파악
   - **프론트만**: `frontend-dev` 단독 실행
   - **DB만**: `db-dev` 단독 실행
   - **백엔드만**: `backend-dev` 단독 실행
   - **크로스 레이어 기능**: 팀 전체 실행
2. `_workspace/` 생성 (초기 실행 시)
3. 요구사항을 `_workspace/00_requirements.md`에 저장

**단순 작업 처리:** 단일 레이어 작업(예: "게시판 화면 스타일 수정")은 해당 에이전트 스킬을 직접 사용하고 팀을 구성하지 않아도 된다.

### Phase 2: 팀 구성

크로스 레이어 기능 개발 시:

```
TeamCreate(
  team_name: "nasol-team",
  members: [
    { name: "frontend-dev", agent_type: "general-purpose", model: "opus",
      prompt: "나솔팬즈 frontend-dev 에이전트 역할을 수행한다. .claude/agents/frontend-dev.md를 읽고 역할을 파악하라. expo-screen 스킬을 참고하여 [작업 내용]을 구현하라." },
    { name: "backend-dev", agent_type: "general-purpose", model: "opus",
      prompt: "나솔팬즈 backend-dev 에이전트 역할을 수행한다. .claude/agents/backend-dev.md를 읽고 역할을 파악하라. toss-integration 스킬을 참고하여 [작업 내용]을 구현하라." },
    { name: "db-dev", agent_type: "general-purpose", model: "opus",
      prompt: "나솔팬즈 db-dev 에이전트 역할을 수행한다. .claude/agents/db-dev.md를 읽고 역할을 파악하라. supabase-ops 스킬을 참고하여 [작업 내용]을 구현하라." },
    { name: "qa-review", agent_type: "general-purpose", model: "opus",
      prompt: "나솔팬즈 qa-review 에이전트 역할을 수행한다. .claude/agents/qa-review.md를 읽고 역할을 파악하라. appintoss-qa 스킬을 참고하여 팀원들의 완료 알림을 기다렸다가 검토하라." }
  ]
)
```

```
TaskCreate(tasks: [
  { title: "DB 스키마 준비", description: "[필요한 스키마 변경]", assignee: "db-dev" },
  { title: "백엔드 API 구현", description: "[API 스펙]", assignee: "backend-dev", depends_on: ["DB 스키마 준비"] },
  { title: "프론트 화면 구현", description: "[화면 스펙]", assignee: "frontend-dev", depends_on: ["백엔드 API 구현"] },
  { title: "통합 QA 검토", description: "모든 구현 완료 후 경계면 검증 및 앱인토스 컴플라이언스 확인", assignee: "qa-review", depends_on: ["프론트 화면 구현"] }
])
```

### Phase 3: 개발 실행

팀원들이 자체 조율하며 개발을 진행한다:

- `db-dev` → DB 마이그레이션 완료 후 `backend-dev`에게 스키마 변경 내용 전달
- `backend-dev` → API 완성 후 `frontend-dev`에게 엔드포인트 스펙 전달
- `frontend-dev` → 화면 완성 후 `qa-review`에게 검토 요청
- `qa-review` → 이슈 발견 시 담당 팀원에게 수정 요청

**리더 모니터링:**
- 팀원 유휴 시 자동 알림 수신
- 막힌 팀원에게 SendMessage로 방향 제시
- TaskGet으로 전체 진행률 확인

### Phase 4: QA 검토

1. `qa-review`의 `_workspace/qa_report.md` 읽기
2. CRITICAL 이슈가 있으면 담당 팀원에게 수정 지시
3. WARNING 이슈는 사용자에게 보고 후 판단 위임

### Phase 5: 정리

1. 팀원들에게 종료 요청 (SendMessage)
2. TeamDelete로 팀 정리
3. `_workspace/` 보존 (삭제하지 않음)
4. 사용자에게 결과 요약 보고:
   - 구현된 파일 목록
   - QA 결과 요약
   - 남은 수동 작업 (환경변수 설정, 토스 콘솔 등록 등)

## 데이터 흐름

```
[리더] → TeamCreate → [db-dev] → 마이그레이션 파일
                   → [backend-dev] ← db-dev의 스키마 알림
                                  → backend/ 코드
                   → [frontend-dev] ← backend-dev의 API 스펙
                                    → app/ 화면
                   → [qa-review] ← 팀원들의 완료 알림
                                 → _workspace/qa_report.md
[리더] ← qa_report.md → 사용자 보고
```

## 에러 핸들링

| 에러 상황 | 처리 방법 |
|----------|----------|
| 팀원이 작업 실패 | 1회 재시도 후 실패 시 이슈 명시하고 진행 |
| 타입 불일치 발견 | qa-review가 담당 팀원에게 수정 요청 |
| mTLS 인증서 미발급 | 백엔드 구조만 구현하고 인증서 적용은 TODO로 표시 |
| Supabase 연결 불가 | 로컬 스키마 파일만 생성하고 적용은 수동으로 안내 |

## 테스트 시나리오

### 정상 흐름: 토스 로그인 연동
1. 사용자: "토스 로그인 연동해줘"
2. db-dev: users 테이블 toss_user_key 마이그레이션
3. backend-dev: OAuth 콜백 엔드포인트 구현
4. frontend-dev: login.tsx를 토스 로그인 UI로 교체
5. qa-review: 기존 닉네임 로그인 제거 확인, 연결 끊기 콜백 구현 확인

### 에러 흐름: 백엔드 없이 프론트 요청
1. 사용자: "토스 로그인 화면만 만들어줘"
2. Phase 1에서 단일 레이어로 판단
3. frontend-dev만 호출 (팀 구성 없음)
4. TODO 주석으로 백엔드 연동 지점 표시
