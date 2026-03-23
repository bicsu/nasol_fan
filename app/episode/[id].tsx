import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors, fontSize, fontWeight } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import type { Episode, Post, VoteItem } from '../../lib/database.types';

export default function EpisodeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [voteItems, setVoteItems] = useState<VoteItem[]>([]);
  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const [episodeRes, postsRes, votesRes, chatRes] = await Promise.all([
        supabase.from('episodes').select('*').eq('id', id).single(),
        supabase
          .from('posts')
          .select('*, user:users(nickname)')
          .eq('episode_id', id)
          .order('likes', { ascending: false })
          .limit(10),
        supabase.from('vote_items').select('*').eq('episode_id', id),
        supabase
          .from('chat_messages')
          .select('id', { count: 'exact' })
          .eq('episode_id', id),
      ]);

      if (episodeRes.data) setEpisode(episodeRes.data as Episode);
      if (postsRes.data) setPosts(postsRes.data as any);
      if (votesRes.data) setVoteItems(votesRes.data as VoteItem[]);
      setChatCount(chatRes.count ?? 0);
    };

    load();
  }, [id]);

  if (!episode) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  const airDate = new Date(episode.air_start);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.seasonText}>시즌 {episode.season}</Text>
        <Text style={styles.episodeTitle}>
          {episode.episode_num}회 {episode.title ?? ''}
        </Text>
        <Text style={styles.airDate}>
          {airDate.getFullYear()}.{airDate.getMonth() + 1}.{airDate.getDate()} 방영
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={{ fontSize: 18 }}>💬</Text>
          <Text style={styles.statValue}>{chatCount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>채팅</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={{ fontSize: 18 }}>📋</Text>
          <Text style={styles.statValue}>{posts.length}</Text>
          <Text style={styles.statLabel}>게시글</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={{ fontSize: 18 }}>🗳️</Text>
          <Text style={styles.statValue}>{voteItems.length}</Text>
          <Text style={styles.statLabel}>투표</Text>
        </View>
      </View>

      {posts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOT 게시글</Text>
          {posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.postCard}
              onPress={() => router.push(`/post/${post.id}`)}
            >
              <Text style={styles.postTitle} numberOfLines={1}>
                {post.title}
              </Text>
              <View style={styles.postMeta}>
                <Text style={styles.metaText}>
                  {(post as any).user?.nickname ?? '익명'}
                </Text>
                <View style={styles.likeRow}>
                  <Text style={{ fontSize: 11, color: colors.primary }}>&#9829;</Text>
                  <Text style={styles.metaText}>{post.likes}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {voteItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>투표 결과</Text>
          {voteItems.map((item) => (
            <View key={item.id} style={styles.voteCard}>
              <Text style={styles.voteQuestion}>{item.question}</Text>
              {item.correct_option_id && (
                <Text style={styles.voteAnswer}>
                  정답: {item.options.find((o) => o.id === item.correct_option_id)?.label ?? '?'}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
  content: {
    padding: 16,
  },
  header: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  seasonText: {
    fontSize: fontSize.meta,
    color: 'rgba(255,255,255,0.7)',
  },
  episodeTitle: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginTop: 4,
  },
  airDate: {
    fontSize: fontSize.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
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
  postCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  postTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  voteQuestion: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  voteAnswer: {
    fontSize: fontSize.meta,
    color: colors.green,
    marginTop: 4,
  },
});
