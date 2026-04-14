import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { colors, fontSize, fontWeight } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Post, Comment } from '../../lib/database.types';

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${YYYY}.${MM}.${DD} ${HH}:${mm}`;
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    // NOTE(007_users_public_view): 타인 프로필(nickname/avatar_color)은 users_public 뷰에서 조회해야 함.
    // PostgREST 임베드 관계 힌트 추가 후 users → users_public 으로 교체 예정.
    const loadPost = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, user:users(nickname, avatar_color)')
        .eq('id', id)
        .single();

      if (data) setPost(data as any);
    };

    const loadComments = async () => {
      const { data } = await supabase
        .from('comments')
        .select('*, user:users(nickname, avatar_color)')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (data) setComments(data as any);
    };

    loadPost();
    loadComments();
  }, [id]);

  const handleLike = async () => {
    if (!post) return;
    await supabase
      .from('posts')
      .update({ likes: post.likes + 1 })
      .eq('id', post.id);

    setPost({ ...post, likes: post.likes + 1 });
  };

  const handleComment = async () => {
    if (!commentInput.trim() || !user || !id || submitting) return;

    setSubmitting(true);
    const content = commentInput.trim();

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: id,
        user_id: user.id,
        content,
      })
      .select('*, user:users(nickname, avatar_color)')
      .single();

    if (error) {
      Alert.alert('오류', error.message);
      setSubmitting(false);
      return;
    }

    setCommentInput('');
    if (data) setComments((prev) => [...prev, data as Comment]);

    // 포인트 지급 — RPC로 원자적 처리
    await supabase.rpc('award_points', {
      p_user_id: user.id,
      p_amount: 5,
      p_reason: 'comment',
    });
    await refreshUser();

    setSubmitting(false);
  };

  if (!post) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{post.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {(post as any).user?.nickname ?? '익명'} · {formatDate(post.created_at)}
          </Text>
        </View>
        <Text style={styles.body}>{post.content}</Text>

        <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
          <Text style={{ fontSize: 16 }}>&#9829;</Text>
          <Text style={styles.likeText}>{post.likes}</Text>
        </TouchableOpacity>

        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>댓글 {comments.length}</Text>

          {comments.map((c) => (
            <View key={c.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentNickname}>
                  {(c as any).user?.nickname ?? '익명'}
                </Text>
                <Text style={styles.commentDate}>{formatDate(c.created_at)}</Text>
              </View>
              <Text style={styles.commentContent}>{c.content}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.commentInputRow}>
        <TextInput
          style={styles.commentInput}
          value={commentInput}
          onChangeText={setCommentInput}
          placeholder={user ? '댓글을 입력하세요 (+5p)' : '로그인이 필요합니다'}
          placeholderTextColor={colors.textSecondary}
          editable={!!user}
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!commentInput.trim() || submitting) && styles.sendDisabled]}
          onPress={handleComment}
          disabled={!commentInput.trim() || submitting}
        >
          <Text style={{ fontSize: 16, color: colors.white }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  meta: {
    marginBottom: 16,
  },
  metaText: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
  },
  body: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 20,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 24,
  },
  likeText: {
    fontSize: fontSize.body,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  commentSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  commentTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  commentCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentNickname: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  commentDate: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
  },
  commentContent: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  commentInputRow: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
});
