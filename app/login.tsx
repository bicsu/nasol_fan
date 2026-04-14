import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { appLogin } from '@apps-in-toss/web-framework';
import { colors, fontSize, fontWeight } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'https://api.nasolfans.app';

// 앱인토스 미니앱 환경 여부 체크
function isAppInTossEnv(): boolean {
  if (typeof window === 'undefined') return false;
  // @ts-expect-error - 앱인토스 런타임이 주입하는 전역 플래그
  return Boolean(window.__APPS_IN_TOSS__);
}

export default function LoginScreen() {
  const router = useRouter();
  const loadSession = useAuthStore((s) => s.loadSession);
  const [loading, setLoading] = useState(false);

  const handleTossLogin = async () => {
    if (loading) return;

    // 개발/웹 환경 fallback: 앱인토스 런타임이 아닐 때는 안내만
    if (!isAppInTossEnv()) {
      Alert.alert(
        '안내',
        '토스 앱에서 실행해주세요.\n(앱인토스 미니앱 환경에서만 로그인 가능합니다)',
      );
      return;
    }

    try {
      setLoading(true);

      // 1) 앱인토스 SDK: 인가코드 발급
      const { authorizationCode, referrer } = await appLogin();

      // 2) 자체 백엔드로 인가코드 전달 → 토스 API 토큰 교환 + Supabase 세션 발급
      const res = await fetch(`${BACKEND_URL}/api/auth/toss/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationCode, referrer }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(
          `로그인 서버 오류 (${res.status})${errText ? `: ${errText}` : ''}`,
        );
      }

      const data = await res.json();

      if (!data?.access_token || !data?.refresh_token) {
        throw new Error('세션 토큰이 응답에 포함되지 않았습니다.');
      }

      // 3) Supabase 세션 설정
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      await loadSession();
      router.replace('/consent');
    } catch (e: any) {
      Alert.alert(
        '로그인 실패',
        e?.message ?? '로그인 중 문제가 발생했습니다. 다시 시도해주세요.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>나솔팬즈</Text>
        <Text style={styles.subtitle}>
          나는 솔로 팬들의 실시간 커뮤니티
        </Text>

        <View style={styles.heroBox}>
          <Text style={styles.heroText}>
            방영 시간에 맞춰 열리는 실시간 채팅,{'\n'}
            에피소드별 게시판과 예측 투표까지{'\n'}
            토스 로그인 한 번으로 시작하세요.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.tossButton, loading && styles.buttonDisabled]}
          onPress={handleTossLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.tossButtonText}>토스로 시작하기</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.notice}>
          만 19세 이상만 이용 가능합니다.
        </Text>

        <View style={styles.linkRow}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.linkText}>서비스 이용약관</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>·</Text>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.linkText}>개인정보처리방침</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  heroBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },
  tossButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  tossButtonText: {
    color: colors.white,
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
  },
  notice: {
    marginTop: 16,
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  linkText: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  linkDivider: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
  },
});
