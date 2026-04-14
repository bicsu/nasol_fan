import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../lib/theme';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function RootLayout() {
  const loadSession = useAuthStore((s) => s.loadSession);

  useEffect(() => {
    loadSession();
  }, []);

  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerBackTitle: '뒤로',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="post/[id]"
          options={{ title: '게시글', headerBackTitle: '뒤로' }}
        />
        <Stack.Screen
          name="episode/[id]"
          options={{ title: '회차 아카이브' }}
        />
        <Stack.Screen
          name="profile"
          options={{ title: '내 프로필' }}
        />
        <Stack.Screen
          name="write"
          options={{ title: '글쓰기', presentation: 'modal' }}
        />
        <Stack.Screen
          name="terms"
          options={{ title: '서비스 이용약관' }}
        />
        <Stack.Screen
          name="consent"
          options={{
            title: '약관 동의',
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </ErrorBoundary>
  );
}
