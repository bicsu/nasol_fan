import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSize, fontWeight } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function WriteScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('알림', '제목과 내용을 모두 입력해주세요.');
      return;
    }
    if (!user) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
    });

    if (error) {
      Alert.alert('오류', error.message);
      setLoading(false);
      return;
    }

    // Award points
    await supabase.from('point_history').insert({
      user_id: user.id,
      amount: 10,
      reason: 'post',
    });

    await supabase
      .from('users')
      .update({ total_points: (user.total_points || 0) + 10 })
      .eq('id', user.id);

    setLoading(false);
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        style={styles.titleInput}
        value={title}
        onChangeText={setTitle}
        placeholder="제목을 입력하세요"
        placeholderTextColor={colors.textSecondary}
        maxLength={100}
      />

      <TextInput
        style={styles.contentInput}
        value={content}
        onChangeText={setContent}
        placeholder="내용을 입력하세요"
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
        maxLength={5000}
      />

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitText}>
          {loading ? '등록 중...' : '게시글 등록 (+10p)'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  titleInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: fontSize.sectionTitle,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    minHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.white,
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
  },
});
