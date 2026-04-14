import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSize, fontWeight } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

type ConsentKey = 'terms' | 'privacy' | 'age';

const ITEMS: { key: ConsentKey; label: string; hasLink: boolean }[] = [
  { key: 'terms', label: '[필수] 서비스 이용약관 동의', hasLink: true },
  { key: 'privacy', label: '[필수] 개인정보처리방침 동의', hasLink: true },
  { key: 'age', label: '[필수] 만 19세 이상입니다', hasLink: false },
];

export default function ConsentScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const [checked, setChecked] = useState<Record<ConsentKey, boolean>>({
    terms: false,
    privacy: false,
    age: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // Android 하드웨어 백 버튼 차단 (약관 미동의 상태로 탭 진입 방지)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true
    );
    return () => backHandler.remove();
  }, []);

  // 세션 유효성 사전 검증 (RLS upsert 실패 방지)
  useEffect(() => {
    if (!session?.user?.id) {
      Alert.alert('오류', '로그인 정보가 없습니다. 다시 로그인해주세요.');
      router.replace('/login');
    }
  }, [session, router]);

  const allChecked = useMemo(
    () => checked.terms && checked.privacy && checked.age,
    [checked]
  );

  const toggle = (key: ConsentKey) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleAll = () => {
    const next = !allChecked;
    setChecked({ terms: next, privacy: next, age: next });
  };

  const handleSubmit = async () => {
    if (!allChecked) return;
    const userId = session?.user?.id;
    if (!userId) {
      Alert.alert('오류', '로그인 정보가 없습니다. 다시 로그인해주세요.');
      router.replace('/login');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from('user_consents').upsert({
        user_id: userId,
        terms_agreed: true,
        privacy_agreed: true,
        age_verified: true,
        agreed_at: new Date().toISOString(),
      });

      if (error) {
        Alert.alert('오류', error.message);
        return;
      }

      router.replace('/');
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '동의 처리 중 문제가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>서비스 이용 동의</Text>
        <Text style={styles.subtitle}>
          나솔팬즈 이용을 위해 아래 항목에 동의해주세요.
        </Text>

        <TouchableOpacity
          style={styles.allRow}
          onPress={toggleAll}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.checkbox,
              allChecked && styles.checkboxChecked,
            ]}
          >
            {allChecked && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.allLabel}>전체 동의</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {ITEMS.map((item) => (
          <View key={item.key} style={styles.itemRow}>
            <TouchableOpacity
              style={styles.itemLeft}
              onPress={() => toggle(item.key)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.checkbox,
                  checked[item.key] && styles.checkboxChecked,
                ]}
              >
                {checked[item.key] && (
                  <Text style={styles.checkMark}>✓</Text>
                )}
              </View>
              <Text style={styles.itemLabel}>{item.label}</Text>
            </TouchableOpacity>
            {item.hasLink && (
              <TouchableOpacity onPress={() => router.push('/terms')}>
                <Text style={styles.viewLink}>보기</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <Text style={styles.note}>
          포인트는 랭킹 및 뱃지 산정에만 사용되며, 현금으로 교환되지 않습니다.
          투표는 무료로 참여할 수 있으며 금전적 보상이 없습니다.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!allChecked || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!allChecked || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>시작하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: 12,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 24,
  },
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allLabel: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    marginLeft: 12,
    flexShrink: 1,
  },
  viewLink: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkMark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: fontWeight.bold,
    lineHeight: 14,
  },
  note: {
    marginTop: 24,
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
  },
});
