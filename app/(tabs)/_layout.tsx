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
  const loading = useAuthStore((s) => s.loading);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    // 세션 없음 → 로그인으로 (토스 로그인만 허용)
    const userId = session?.user?.id;
    if (!userId) {
      router.replace('/login');
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
  }, [loading, session, router]);

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
          borderTopColor: 'transparent',
          position: 'absolute' as const,
          bottom: 16,
          left: 16,
          right: 16,
          borderRadius: 24,
          height: 60,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
          ...(Platform.OS === 'web' ? { paddingBottom: 0 } : {}),
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
