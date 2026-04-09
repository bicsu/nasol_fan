import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSize, fontWeight } from '../lib/theme';
import { useAuthStore } from '../stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { signUp, signIn } = useAuthStore();
  const [nickname, setNickname] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9_]+$/;

  const handleSubmit = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 10) {
      Alert.alert('알림', '닉네임은 2~10자로 입력해주세요.');
      return;
    }
    if (!NICKNAME_REGEX.test(trimmed)) {
      Alert.alert('알림', '닉네임은 한글, 영문, 숫자, _만 사용 가능합니다.');
      return;
    }

    setLoading(true);

    const result = isSignUp
      ? await signUp(trimmed)
      : await signIn(trimmed);

    setLoading(false);

    if (result.error) {
      Alert.alert('오류', result.error);
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>나솔팬즈</Text>
        <Text style={styles.subtitle}>
          나는 솔로 팬들의 실시간 커뮤니티
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="닉네임 (2~10자)"
            placeholderTextColor={colors.textSecondary}
            maxLength={10}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '처리 중...' : isSignUp ? '가입하기' : '로그인'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.toggleText}>
              {isSignUp
                ? '이미 계정이 있나요? 로그인'
                : '처음이신가요? 가입하기'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 40,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: fontSize.sectionTitle,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: fontSize.body,
    color: colors.primary,
  },
});
