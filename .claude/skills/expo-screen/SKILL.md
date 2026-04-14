---
name: expo-screen
description: 나솔팬즈 Expo/React Native 화면 및 컴포넌트 개발 가이드. Expo SDK 54, expo-router 파일 기반 라우팅, 프로젝트 디자인 시스템(#D4537E 핑크 테마, #F5F4F0 배경), Supabase 클라이언트 패턴, Zustand 스토어 연동, 실시간 채팅/투표/게시판 구현. 새 화면·컴포넌트 구현, UI 수정, 탭 추가, 실시간 기능 구현 요청 시 반드시 이 스킬을 사용할 것. 기존 화면 수정, 스타일 변경, 데이터 바인딩 작업도 포함.
---

# Expo Screen 개발 가이드

나솔팬즈 앱의 화면과 컴포넌트를 개발하기 위한 패턴과 컨벤션.

## 파일 구조

```
app/
├── _layout.tsx          # 루트 레이아웃 (Providers, 폰트 로딩)
├── (tabs)/
│   ├── _layout.tsx      # 탭 바 설정
│   ├── index.tsx        # 홈
│   ├── chat.tsx         # 실시간 채팅
│   ├── board.tsx        # 게시판
│   ├── vote.tsx         # 투표
│   └── ranking.tsx      # 랭킹
├── login.tsx
├── profile.tsx
├── terms.tsx
├── write.tsx
├── episode/[id].tsx
└── post/[id].tsx
```

## 화면 기본 구조

```tsx
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ExampleScreen() {
  const { user } = useAuthStore();
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data, error } = await supabase.from('table').select('*');
      if (error) throw error;
      setData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={styles.container}>
      {/* 내용 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4F0',
  },
});
```

## 실시간 구독 패턴 (채팅/상태 변경)

```tsx
useEffect(() => {
  const subscription = supabase
    .channel('chat_messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `episode_id=eq.${episodeId}`,
    }, (payload) => {
      setMessages(prev => [...prev, payload.new as ChatMessage]);
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [episodeId]);
```

## 디자인 토큰

```tsx
// lib/theme.ts 참조
export const theme = {
  colors: {
    primary: '#D4537E',
    background: '#F5F4F0',
    card: '#FFFFFF',
    textPrimary: '#1A1A18',
    textSecondary: '#888888',
    success: '#1D9E75',
  },
  fontSize: {
    appName: 18,
    sectionTitle: 15,
    body: 13,
    meta: 11,
  },
  fontWeight: {
    bold: '600' as const,
    regular: '400' as const,
  },
};
```

## Zustand 스토어 사용

```tsx
// stores/authStore.ts
const { user, setUser, clearUser } = useAuthStore();

// user 타입: { id, nickname, avatar_color, total_points, badge_level }

// stores/episodeStore.ts
const { currentEpisode, setCurrentEpisode } = useEpisodeStore();
// currentEpisode.chat_status: 'closed' | 'open' | 'extended'
```

## 투표 화면 패턴

```tsx
// 투표는 chat_status === 'open' | 'extended'일 때만 활성화
const isVoteActive = currentEpisode?.chat_status !== 'closed';

// 투표 응답 저장 (unique 제약: vote_item_id + user_id)
const { error } = await supabase.from('vote_responses').insert({
  vote_item_id: item.id,
  user_id: user.id,
  selected_option_id: selectedOption,
});
if (error?.code === '23505') {
  // 이미 투표함
}
```

## 게시판 포인트 부여 패턴

게시글 작성 +10p, 댓글 +5p는 Supabase DB Function 또는 백엔드에서 처리한다. 프론트에서는 응답 성공 후 `useAuthStore`의 `total_points`를 업데이트한다.

## 카운트다운 (홈 화면)

```tsx
// D-HH:MM:SS 형식
function formatCountdown(targetTime: Date): string {
  const diff = targetTime.getTime() - Date.now();
  if (diff <= 0) return 'LIVE';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `D-${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
```

## 앱인토스 UI 제약

- 외부 링크(`Linking.openURL`)는 개인정보처리방침, 이용약관 등 법률 고지에만 허용
- 다른 앱 설치 유도 UI 절대 금지
- 로그인 화면에서 토스 로그인 외 다른 로그인 버튼 노출 금지
