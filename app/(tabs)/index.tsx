import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';

import { colors, fontSize, fontWeight } from '../../lib/theme';
import { useEpisodeStore } from '../../stores/episodeStore';
import { supabase } from '../../lib/supabase';
import type { Post } from '../../lib/database.types';

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft('방영 예정 없음');
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setIsLive(true);
        setTimeLeft('LIVE');
        return;
      }

      setIsLive(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');

      if (days > 0) {
        setTimeLeft(`D-${days} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      } else {
        setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return { timeLeft, isLive };
}

export default function HomeScreen() {
  const router = useRouter();
  const { currentEpisode, nextEpisode, fetchCurrentEpisode, fetchNextEpisode } =
    useEpisodeStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const isLiveNow = currentEpisode?.chat_status === 'open' || currentEpisode?.chat_status === 'extended';
  const { timeLeft, isLive } = useCountdown(
    isLiveNow ? null : nextEpisode?.air_start ?? null
  );

  const fetchPosts = async () => {
    // NOTE(007_users_public_view): 타인 작성자 프로필 조인은 공개 뷰 users_public 사용 권장.
    // PostgREST 임베드 관계 설정 후 users → users_public 으로 교체 예정.
    const { data } = await supabase
      .from('posts')
      .select('*, user:users(nickname, avatar_color)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setPosts(data as any);
  };

  const loadData = useCallback(async () => {
    await Promise.allSettled([fetchCurrentEpisode(), fetchNextEpisode(), fetchPosts()]);
  }, [fetchCurrentEpisode, fetchNextEpisode]);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Countdown / Live Banner */}
      <View style={styles.countdownCard}>
        {isLiveNow || isLive ? (
          <>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <Text style={styles.liveTitle}>
              시즌 {currentEpisode?.season ?? '?'} {currentEpisode?.episode_num ?? '?'}회 방영 중
            </Text>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => router.push('/(tabs)/chat')}
            >
              <Text style={{ fontSize: 16 }}>💬</Text>
              <Text style={styles.chatButtonText}>채팅방 입장</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.countdownLabel}>다음 방영까지</Text>
            <Text style={styles.countdownTimer}>{timeLeft}</Text>
            {nextEpisode && (
              <Text style={styles.countdownEpisode}>
                시즌 {nextEpisode.season} {nextEpisode.episode_num}회
              </Text>
            )}
          </>
        )}
      </View>

      {/* Recent Posts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최신 게시글</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/board')}>
            <Text style={styles.seeAll}>전체보기</Text>
          </TouchableOpacity>
        </View>

        {posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>아직 게시글이 없어요</Text>
            <Text style={styles.emptySubText}>첫 게시글을 작성해보세요!</Text>
          </View>
        ) : (
          posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.postCard}
              onPress={() => router.push(`/post/${post.id}`)}
            >
              <Text style={styles.postTitle} numberOfLines={1}>
                {post.title}
              </Text>
              <Text style={styles.postContent} numberOfLines={2}>
                {post.content}
              </Text>
              <View style={styles.postMeta}>
                <Text style={styles.postMetaText}>
                  {(post as any).user?.nickname ?? '익명'}
                </Text>
                <View style={styles.postStats}>
                  <Text style={{ fontSize: 11, color: colors.primary }}>&#9829;</Text>
                  <Text style={styles.postMetaText}>{post.likes}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* 서비스 이용약관 */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.push('/terms')}>
          <Text style={styles.footerLink}>서비스 이용약관</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  countdownCard: {
    backgroundColor: colors.primary,
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: fontSize.body,
  },
  countdownTimer: {
    color: colors.white,
    fontSize: 36,
    fontWeight: fontWeight.bold,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  countdownEpisode: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fontSize.meta,
    marginTop: 8,
  },
  liveBadge: {
    backgroundColor: colors.live,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  liveBadgeText: {
    color: colors.white,
    fontSize: fontSize.meta,
    fontWeight: fontWeight.bold,
  },
  liveTitle: {
    color: colors.white,
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
  },
  chatButtonText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  seeAll: {
    fontSize: fontSize.meta,
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  emptySubText: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    marginTop: 4,
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  postTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  postContent: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postMetaText: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  footerLink: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
