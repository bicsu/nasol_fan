import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { colors, fontSize, fontWeight } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../lib/database.types';

const BADGE_LABELS: Record<string, string> = {
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
  legend: '전설',
};

const BADGE_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#00CED1',
  legend: '#9B59B6',
};

const RANK_MEDALS = ['', '🥇', '🥈', '🥉'];

export default function RankingScreen() {
  const currentUser = useAuthStore((s) => s.user);
  const [rankings, setRankings] = useState<User[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const { data } = await supabase
          .from('users')
          .select('id, nickname, avatar_color, total_points, badge_level')
          .order('total_points', { ascending: false })
          .limit(100);

        if (data) {
          setRankings(data as User[]);
          if (currentUser) {
            const idx = data.findIndex((u) => u.id === currentUser.id);
            setMyRank(idx >= 0 ? idx + 1 : null);
          }
        }
      };

      load();
    }, [currentUser?.id])
  );

  const renderItem = ({ item, index }: { item: User; index: number }) => {
    const rank = index + 1;
    const isMe = item.id === currentUser?.id;

    return (
      <View style={[styles.rankRow, isMe && styles.rankRowMe]}>
        <View style={styles.rankNum}>
          {rank <= 3 ? (
            <Text style={styles.medal}>{RANK_MEDALS[rank]}</Text>
          ) : (
            <Text style={styles.rankText}>{rank}</Text>
          )}
        </View>

        <View
          style={[styles.avatar, { backgroundColor: item.avatar_color }]}
        >
          <Text style={styles.avatarText}>{item.nickname[0]}</Text>
        </View>

        <View style={styles.info}>
          <Text style={[styles.nickname, isMe && styles.nicknameMe]}>
            {item.nickname}
            {isMe ? ' (나)' : ''}
          </Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: BADGE_COLORS[item.badge_level] + '20' },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: BADGE_COLORS[item.badge_level] },
                ]}
              >
                {BADGE_LABELS[item.badge_level]}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.points}>{item.total_points.toLocaleString()}p</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={rankings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>🏆</Text>
            <Text style={styles.emptyText}>아직 랭킹 데이터가 없어요</Text>
          </View>
        }
      />

      {currentUser && myRank && (
        <View style={styles.myRankBar}>
          <Text style={styles.myRankLabel}>내 순위</Text>
          <Text style={styles.myRankValue}>
            {myRank}위 · {currentUser.total_points.toLocaleString()}p
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  rankRowMe: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  rankNum: {
    width: 32,
    alignItems: 'center',
  },
  medal: {
    fontSize: 20,
  },
  rankText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  info: {
    flex: 1,
  },
  nickname: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    fontWeight: fontWeight.bold,
  },
  nicknameMe: {
    color: colors.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  points: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  myRankBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
  },
  myRankLabel: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  myRankValue: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});
