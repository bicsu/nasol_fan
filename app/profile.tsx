import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, fontSize, fontWeight } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { VoteResponse, PointHistory } from '../lib/database.types';

const BADGE_LABELS: Record<string, string> = {
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
  legend: '전설',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [voteHistory, setVoteHistory] = useState<any[]>([]);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [votesRes, pointsRes] = await Promise.all([
        supabase
          .from('vote_responses')
          .select('*, vote_item:vote_items(question, correct_option_id, options)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('point_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      if (votesRes.data) setVoteHistory(votesRes.data);
      if (pointsRes.data) setPointHistory(pointsRes.data as PointHistory[]);
    };

    load();
  }, [user?.id]);

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>로그인이 필요합니다</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>로그인하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${MM}/${DD} ${HH}:${mm}`;
  };

  const reasonLabels: Record<string, string> = {
    vote_correct: '투표 적중',
    post: '게시글 작성',
    comment: '댓글 작성',
    event: '이벤트',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: user.avatar_color }]}>
          <Text style={styles.avatarText}>{user.nickname[0]}</Text>
        </View>
        <Text style={styles.nickname}>{user.nickname}</Text>
        <Text style={styles.badge}>{BADGE_LABELS[user.badge_level]}</Text>
        <Text style={styles.points}>{user.total_points.toLocaleString()}p</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>예측 기록</Text>
        {voteHistory.length === 0 ? (
          <Text style={styles.emptySection}>아직 투표 기록이 없어요</Text>
        ) : (
          voteHistory.map((v) => (
            <View key={v.id} style={styles.historyCard}>
              <Text style={styles.historyQuestion}>
                {v.vote_item?.question ?? '(삭제된 투표)'}
              </Text>
              <Text style={styles.historyAnswer}>
                선택: {v.vote_item?.options?.find((o: any) => o.id === v.selected_option_id)?.label ?? v.selected_option_id}
              </Text>
              {v.is_correct !== null && (
                <Text style={[styles.historyResult, v.is_correct && styles.correct]}>
                  {v.is_correct ? '적중!' : '미적중'}
                  {v.points_awarded > 0 ? ` +${v.points_awarded}p` : ''}
                </Text>
              )}
              <Text style={styles.historyDate}>{formatDate(v.created_at)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>포인트 내역</Text>
        {pointHistory.length === 0 ? (
          <Text style={styles.emptySection}>아직 포인트 내역이 없어요</Text>
        ) : (
          pointHistory.map((p) => (
            <View key={p.id} style={styles.pointRow}>
              <Text style={styles.pointReason}>{reasonLabels[p.reason] ?? p.reason}</Text>
              <Text style={styles.pointAmount}>+{p.amount}p</Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await signOut();
          router.back();
        }}
      >
        <Text style={styles.logoutText}>로그아웃</Text>
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
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loginButtonText: {
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: fontWeight.bold,
  },
  nickname: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  badge: {
    fontSize: fontSize.meta,
    color: colors.primary,
    marginTop: 4,
  },
  points: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginTop: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  emptySection: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  historyQuestion: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  historyAnswer: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyResult: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    marginTop: 2,
  },
  correct: {
    color: colors.green,
    fontWeight: fontWeight.bold,
  },
  historyDate: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    marginTop: 4,
  },
  pointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  pointReason: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  pointAmount: {
    fontSize: fontSize.body,
    color: colors.green,
    fontWeight: fontWeight.bold,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
});
