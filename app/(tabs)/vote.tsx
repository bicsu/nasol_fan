import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import { colors, fontSize, fontWeight } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useEpisodeStore } from '../../stores/episodeStore';
import type { VoteItem, VoteResponse } from '../../lib/database.types';

export default function VoteScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentEpisode, fetchCurrentEpisode } = useEpisodeStore();
  const [voteItems, setVoteItems] = useState<VoteItem[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<string, number>>>({});

  const isLive =
    currentEpisode?.chat_status === 'open' ||
    currentEpisode?.chat_status === 'extended';

  useEffect(() => {
    fetchCurrentEpisode();
  }, []);

  useEffect(() => {
    if (!currentEpisode) return;

    const load = async () => {
      const { data: items } = await supabase
        .from('vote_items')
        .select('*')
        .eq('episode_id', currentEpisode.id)
        .order('created_at', { ascending: true });

      if (items) setVoteItems(items as VoteItem[]);

      if (user) {
        const { data: responses } = await supabase
          .from('vote_responses')
          .select('*')
          .eq('user_id', user.id);

        if (responses) {
          const map: Record<string, string> = {};
          responses.forEach((r: VoteResponse) => {
            map[r.vote_item_id] = r.selected_option_id;
          });
          setMyVotes(map);
        }
      }

      // Get vote counts
      if (items) {
        const counts: Record<string, Record<string, number>> = {};
        for (const item of items) {
          const { data: responses } = await supabase
            .from('vote_responses')
            .select('selected_option_id')
            .eq('vote_item_id', item.id);

          if (responses) {
            const itemCounts: Record<string, number> = {};
            responses.forEach((r: any) => {
              itemCounts[r.selected_option_id] = (itemCounts[r.selected_option_id] || 0) + 1;
            });
            counts[item.id] = itemCounts;
          }
        }
        setVoteCounts(counts);
      }
    };

    load();
  }, [currentEpisode?.id, user?.id]);

  const handleVote = async (voteItemId: string, optionId: string) => {
    if (!user || myVotes[voteItemId]) return;

    await supabase.from('vote_responses').insert({
      vote_item_id: voteItemId,
      user_id: user.id,
      selected_option_id: optionId,
    });

    setMyVotes((prev) => ({ ...prev, [voteItemId]: optionId }));
    setVoteCounts((prev) => ({
      ...prev,
      [voteItemId]: {
        ...prev[voteItemId],
        [optionId]: (prev[voteItemId]?.[optionId] || 0) + 1,
      },
    }));
  };

  if (!isLive) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ fontSize: 40 }}>🗳️</Text>
        <Text style={styles.emptyTitle}>투표가 열려있지 않아요</Text>
        <Text style={styles.emptySubText}>방영 중에만 예측 투표에 참여할 수 있어요</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {voteItems.map((item) => {
        const totalVotes = Object.values(voteCounts[item.id] || {}).reduce(
          (a, b) => a + b,
          0
        );
        const hasVoted = !!myVotes[item.id];
        const isResolved = !!item.correct_option_id;

        return (
          <View key={item.id} style={styles.voteCard}>
            <View style={styles.voteHeader}>
              <Text style={styles.voteQuestion}>{item.question}</Text>
              <View style={styles.pointBadge}>
                <Text style={styles.pointBadgeText}>+{item.reward_points}p</Text>
              </View>
            </View>

            {item.options.map((option) => {
              const count = voteCounts[item.id]?.[option.id] || 0;
              const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isSelected = myVotes[item.id] === option.id;
              const isCorrect = item.correct_option_id === option.id;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionSelected,
                    isResolved && isCorrect && styles.optionCorrect,
                  ]}
                  onPress={() => handleVote(item.id, option.id)}
                  disabled={hasVoted || !user}
                >
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {hasVoted && (
                      <Text style={styles.optionPercent}>{percent}%</Text>
                    )}
                  </View>
                  {hasVoted && (
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${percent}%`,
                          backgroundColor: isSelected
                            ? colors.primary + '30'
                            : colors.border,
                        },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {totalVotes > 0 && (
              <Text style={styles.totalVotes}>{totalVotes}명 참여</Text>
            )}
          </View>
        );
      })}

      {voteItems.length === 0 && (
        <View style={styles.emptyInline}>
          <Text style={styles.emptySubText}>아직 투표 항목이 없어요</Text>
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
  content: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptySubText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  emptyInline: {
    alignItems: 'center',
    paddingTop: 40,
  },
  voteCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  voteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  voteQuestion: {
    flex: 1,
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginRight: 8,
  },
  pointBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointBadgeText: {
    fontSize: fontSize.meta,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  optionCorrect: {
    borderColor: colors.green,
    backgroundColor: colors.green + '10',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  optionLabel: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  optionPercent: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },
  totalVotes: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
});
