import { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { colors, fontSize } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{label}</Text>;
}

export default function TabLayout() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    // 세션 없음 → 로그인으로
    // (임시 닉네임 로그인: session 없이 user만 있을 수 있으므로 user도 허용)
    if (!session?.user?.id && !user?.id) {
      router.replace('/login');
      return;
    }

    // consent 검증 (실제 Supabase 세션이 있을 때만 체크 — RLS 대상)
    const userId = session?.user?.id;
    if (!userId) {
      // 임시 닉네임 로그인 경로: consent 체크 스킵 (Phase 2에서 제거 예정)
      setChecking(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_consents')
          .select('terms_agreed, privacy_agreed, age_verified')
          .eq('user_id', userId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          // RLS/네트워크 에러 시 안전 측면에서 consent로 이동
          router.replace('/consent');
          return;
        }

        const ok =
          !!data &&
          data.terms_agreed === true &&
          data.privacy_agreed === true &&
          data.age_verified === true;

        if (!ok) {
          router.replace('/consent');
          return;
        }

        setChecking(false);
      } catch {
        if (!cancelled) router.replace('/consent');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, session, user, router]);

  if (loading || checking) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          ...(Platform.OS === 'web' ? { paddingBottom: 20 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: fontSize.meta,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          headerTitle: '나솔팬즈',
          tabBarIcon: ({ color }) => <TabIcon label="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '채팅',
          tabBarIcon: ({ color }) => <TabIcon label="💬" color={color} />,
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: '게시판',
          tabBarIcon: ({ color }) => <TabIcon label="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="vote"
        options={{
          title: '투표',
          tabBarIcon: ({ color }) => <TabIcon label="🗳️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: '랭킹',
          tabBarIcon: ({ color }) => <TabIcon label="🏆" color={color} />,
        }}
      />
    </Tabs>
  );
}
