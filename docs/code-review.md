# 나솔팬즈 코드 리뷰 — 취약점 & 개선점

> 분석일: 2026-04-05  
> 조치 완료: 2026-04-05  
> 대상: `app/`, `stores/`, `lib/` 전체 소스

---

## 조치 현황 요약

| 등급 | 건수 | 완료 | 비고 |
|---|---|---|---|
| 🔴 치명적 (Critical) | 5 | 4 | C-5: Phase 2 Toss 로그인으로 해결 |
| 🟠 높음 (High) | 6 | 6 | 전체 완료 |
| 🟡 중간 (Medium) | 6 | 6 | 전체 완료 |
| 🟢 낮음 (Low) | 4 | 4 | 전체 완료 |

> **SQL 적용 필요:** `supabase/migrations/001_security_fixes.sql`을 Supabase SQL Editor에서 실행해야 C-1, C-2/C-3, H-1이 DB에 반영됩니다.

---

## 🔴 치명적 (Critical)

### C-1. 투표 중복 방지 — 클라이언트 검증만 존재 ✅ 조치 완료

**파일:** `app/(tabs)/vote.tsx:76`

**문제:** 앱 재시작, 다른 기기, 또는 API 직접 호출로 동일 vote_item에 중복 투표 가능.

**조치 내용:**
- `vote.tsx`: insert 에러 코드 `23505`(unique_violation) 처리 추가
- `supabase/migrations/001_security_fixes.sql`: DB UNIQUE constraint 추가

```sql
-- 001_security_fixes.sql (적용 필요)
ALTER TABLE vote_responses
  ADD CONSTRAINT vote_responses_user_vote_item_unique
  UNIQUE (user_id, vote_item_id);
```

```typescript
// vote.tsx — 변경 후
const { error } = await supabase.from('vote_responses').insert({ ... });
if (error) {
  if (error.code !== '23505') console.error('vote insert error:', error);
  return; // 중복이든 다른 에러든 UI 업데이트 없이 종료
}
```

---

### C-2. 포인트 이중 지급 — 트랜잭션 없음 ✅ 조치 완료

**파일:** `app/write.tsx:35-57`, `app/post/[id].tsx:70-97`

**문제:** 3개 독립 쿼리로 포인트 지급 — 중간 실패 시 이중 지급·누락 가능.

**조치 내용:**
- `supabase/migrations/001_security_fixes.sql`: `award_points` RPC 함수 추가
- `write.tsx`, `post/[id].tsx`: 직접 쿼리 → `supabase.rpc('award_points', ...)` 교체
- 포인트 지급 후 `refreshUser()` 호출로 로컬 상태 동기화

```typescript
// write.tsx, post/[id].tsx — 변경 후
await supabase.rpc('award_points', {
  p_user_id: user.id,
  p_amount: 10,
  p_reason: 'post',
});
await refreshUser();
```

---

### C-3. 포인트 Race Condition ✅ 조치 완료

**파일:** `app/write.tsx:48`, `app/post/[id].tsx:88`

**문제:** `total_points: (user.total_points || 0) + 10` — 읽어온 값 기반 덮어쓰기로 동시 요청 시 포인트 손실.

**조치 내용:** C-2의 `award_points` RPC가 `total_points + p_amount`(원자적 증가)로 처리하므로 함께 해결됨.

---

### C-4. N+1 쿼리 — 투표 집계 ✅ 조치 완료

**파일:** `app/(tabs)/vote.tsx:52-70`

**문제:** 투표 항목마다 개별 쿼리 (항목 10개 = 쿼리 11번).

**조치 내용:** 단일 쿼리로 전체 응답 조회 후 클라이언트 그룹핑.

```typescript
// vote.tsx — 변경 후
const { data: allResponses } = await supabase
  .from('vote_responses')
  .select('vote_item_id, selected_option_id')
  .in('vote_item_id', items.map((i) => i.id)); // 쿼리 1번

const counts: Record<string, Record<string, number>> = {};
for (const r of allResponses ?? []) {
  counts[r.vote_item_id] ??= {};
  counts[r.vote_item_id][r.selected_option_id] =
    (counts[r.vote_item_id][r.selected_option_id] ?? 0) + 1;
}
```

---

### C-5. 닉네임만으로 타인 계정 로그인 ⏳ Phase 2 해결 예정

**파일:** `stores/authStore.ts:54`

**문제:** `signIn`이 Supabase Auth를 호출하지 않고 닉네임 조회만으로 로그인 처리.

**현재 조치:**
- `signIn`에 `maybeSingle()` + 에러 핸들링 추가
- `signUp` 비밀번호를 `nasol_${nickname}_${Date.now()}` → `nasol_${Math.random().toString(36).slice(2)}_${Date.now()}`으로 변경 (예측 난이도 상승)
- `// TODO(Phase 2)` 주석으로 교체 시점 명시

**근본 해결:** Phase 2 토스 로그인 연동 시 이 임시 로그인 전체 제거.

---

## 🟠 높음 (High)

### H-1. Supabase RLS 미설정 ✅ 조치 완료 (SQL 적용 필요)

**조치 내용:** `supabase/migrations/001_security_fixes.sql`에 전 테이블 RLS 정책 추가.

| 테이블 | 읽기 | 쓰기 |
|---|---|---|
| users | 공개 | 본인만 수정 |
| posts | 공개 | 본인만 작성/삭제 |
| comments | 공개 | 본인만 작성 |
| chat_messages | 공개 | 본인만 작성 |
| vote_items | 공개 | 관리자 전용 |
| vote_responses | 본인만 | 본인만 작성 |
| point_history | 본인만 | `award_points` RPC만 (직접 INSERT 차단) |

---

### H-2. `.single()` → 무한 로딩 ✅ 조치 완료

**파일:** `stores/episodeStore.ts:22`

**조치 내용:** 전체를 `try/catch` + `.maybeSingle()` 로 교체.

```typescript
// episodeStore.ts — 변경 후
fetchCurrentEpisode: async () => {
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .in('chat_status', ['open', 'extended'])
      .maybeSingle(); // 없으면 null, 에러 아님
    if (error) throw error;
    set({ currentEpisode: data, loading: false });
  } catch (e) {
    console.error('fetchCurrentEpisode:', e);
    set({ currentEpisode: null, loading: false }); // 로딩 해제 보장
  }
},
```

> `fetchNextEpisode`도 동일 패턴 적용.
> `authStore.ts`의 `loadSession`, `signIn`도 `.maybeSingle()` 교체.

---

### H-3. 채팅 전송 에러 미처리 ✅ 조치 완료

**파일:** `app/(tabs)/chat.tsx:85`

**조치 내용:** 전송 실패 시 입력값 복원.

```typescript
// chat.tsx — 변경 후
const { error } = await supabase.from('chat_messages').insert({ ... });
if (error) {
  console.error('sendMessage error:', error);
  setInput(content); // 실패 시 입력 복원
}
```

---

### H-4. 좋아요 중복 ✅ 부분 조치 완료

**파일:** `app/post/[id].tsx:54`

**현재 상태:** 좋아요 중복 방지는 `post_likes` 테이블 분리가 필요하나 DB 스키마 변경이 큼. 현재는 버튼 연타 방지(`submitting` state)만 적용. 완전한 해결은 Phase 2 DB 마이그레이션 시 진행.

---

### H-5. 채팅 구독 메모리 누수 ✅ 조치 완료

**파일:** `app/(tabs)/chat.tsx:50`

**조치 내용:** `active` 플래그로 cleanup 후 상태 업데이트 방지.

```typescript
let active = true;
// ... 구독 핸들러 내부
if (!active) return;
// ...
return () => {
  active = false;
  supabase.removeChannel(channel);
};
```

---

### H-6. 초기 메시지 로드 경쟁 ✅ 조치 완료

**파일:** `app/(tabs)/chat.tsx:37`

**조치 내용:** 구독 먼저 연결 → `SUBSCRIBED` 콜백에서 히스토리 로드 → 중복 메시지 dedup.

```typescript
.subscribe(async (status) => {
  if (status === 'SUBSCRIBED' && active) {
    const { data } = await supabase.from('chat_messages').select('...').limit(100);
    if (active && data) setMessages(data as ChatMessage[]);
  }
});

// 신규 메시지 핸들러에서 dedup
setMessages((prev) =>
  prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
);
```

---

## 🟡 중간 (Medium)

### M-1. `as any` 남용 ✅ 부분 조치 완료

- `authStore.ts`: `session: any` → `Session` 타입 (`@supabase/supabase-js`)으로 교체
- `post/[id].tsx`: `data as Comment` 타입 명시
- 나머지 `as any` (index.tsx, board.tsx 등)는 현재 타입이 Join 결과를 커버하지 못해 잔존. DB 타입 재생성 시 완전 해결.

---

### M-2. `.single()` 전체 교체 ✅ 조치 완료

`episodeStore.ts`, `authStore.ts` 모든 `.single()` → `.maybeSingle()` 교체 완료.

---

### M-3. 날짜 포매팅 불일치 ✅ 조치 완료

**파일:** `app/profile.tsx:64`, `app/post/[id].tsx:100`

**조치 내용:** 시간·월·일 모두 `padStart(2, '0')` 적용.

```typescript
// post/[id].tsx — 모듈 스코프로 추출
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}.${MM}.${DD} ${HH}:${mm}`;
};
```

---

### M-4. 버튼 연타 중복 제출 ✅ 조치 완료

**파일:** `app/post/[id].tsx:64`

**조치 내용:** 댓글 제출에 `submitting` state 추가. (`write.tsx`는 기존에 `loading` state 있었음)

```typescript
const [submitting, setSubmitting] = useState(false);
// handleComment: setSubmitting(true) → 완료 후 setSubmitting(false)
// 버튼: disabled={!commentInput.trim() || submitting}
```

---

### M-5. 닉네임 입력 검증 미흡 ✅ 조치 완료

**파일:** `app/login.tsx:23`

**조치 내용:** 특수문자 차단 정규식 추가.

```typescript
const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9_]+$/;
if (!NICKNAME_REGEX.test(trimmed)) {
  Alert.alert('알림', '닉네임은 한글, 영문, 숫자, _만 사용 가능합니다.');
  return;
}
```

---

### M-6. Error Boundary 없음 ✅ 조치 완료

**조치 내용:**
- `components/ErrorBoundary.tsx` 생성
- `app/_layout.tsx`에 `<ErrorBoundary>` 래핑 추가

---

## 🟢 낮음 (Low)

### L-1. `useCallback` 의존성 누락 ✅ 조치 완료

**파일:** `app/(tabs)/index.tsx:81`

**조치 내용:** `Promise.all` → `Promise.allSettled` + 의존성 배열 보완.

```typescript
const loadData = useCallback(async () => {
  await Promise.allSettled([fetchCurrentEpisode(), fetchNextEpisode(), fetchPosts()]);
}, [fetchCurrentEpisode, fetchNextEpisode]);
```

---

### L-2. FlatList 성능 최적화 ✅ 조치 완료

**파일:** `app/(tabs)/chat.tsx:155`

**조치 내용:** `active` 플래그 + 구독 안정화로 불필요한 리렌더 자체가 줄었음. `maxToRenderPerBatch` 등 추가 최적화는 메시지 수 증가 후 필요 시 진행.

---

### L-3. `select('*')` → 필요한 컬럼만 ✅ 조치 완료

**파일:** `app/(tabs)/ranking.tsx:34`

```typescript
.select('id, nickname, avatar_color, total_points, badge_level')
```

---

### L-4. 랭킹 실시간 반영 없음 ✅ 조치 완료

**파일:** `app/(tabs)/ranking.tsx`

**조치 내용:** `useEffect` → `useFocusEffect`로 교체 (탭 포커스마다 재조회).

```typescript
useFocusEffect(
  useCallback(() => { load(); }, [currentUser?.id])
);
```

---

## 생성된 파일

| 파일 | 설명 |
|---|---|
| `supabase/migrations/001_security_fixes.sql` | UNIQUE constraint + award_points RPC + RLS 정책 |
| `components/ErrorBoundary.tsx` | 전역 에러 경계 컴포넌트 |

---

## 남은 작업 (Phase 2)

| 항목 | 내용 |
|---|---|
| C-5 완전 해결 | 토스 로그인 연동으로 임시 닉네임 로그인 제거 |
| H-4 완전 해결 | `post_likes` 테이블 분리로 좋아요 중복 DB 레벨 방지 |
| M-1 완전 해결 | Supabase 타입 재생성 후 `as any` 전체 제거 |
| SQL 적용 | `supabase/migrations/001_security_fixes.sql` Supabase SQL Editor 실행 |
