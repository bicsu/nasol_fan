import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { colors, fontSize, fontWeight } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useEpisodeStore } from '../../stores/episodeStore';
import type { ChatMessage } from '../../lib/database.types';

export default function ChatScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentEpisode, fetchCurrentEpisode } = useEpisodeStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const isChatOpen =
    currentEpisode?.chat_status === 'open' ||
    currentEpisode?.chat_status === 'extended';

  useEffect(() => {
    fetchCurrentEpisode();
  }, []);

  useEffect(() => {
    if (!currentEpisode) return;

    let active = true;

    // 구독 먼저 연결 → SUBSCRIBED 상태 확인 후 히스토리 로드 (메시지 누락 방지)
    const channel = supabase
      .channel(`chat:${currentEpisode.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `episode_id=eq.${currentEpisode.id}`,
        },
        async (payload) => {
          if (!active) return;
          const { data: newMsg } = await supabase
            .from('chat_messages')
            .select('*, user:users(nickname, avatar_color)')
            .eq('id', payload.new.id)
            .maybeSingle();

          if (newMsg && active) {
            setMessages((prev) =>
              prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg as ChatMessage]
            );
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && active) {
          const { data } = await supabase
            .from('chat_messages')
            .select('*, user:users(nickname, avatar_color)')
            .eq('episode_id', currentEpisode.id)
            .order('created_at', { ascending: true })
            .limit(100);

          if (active && data) setMessages(data as ChatMessage[]);
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [currentEpisode?.id]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !currentEpisode || !isChatOpen) return;

    const content = input.trim();
    setInput('');

    const { error } = await supabase.from('chat_messages').insert({
      episode_id: currentEpisode.id,
      user_id: user.id,
      content,
    });

    if (error) {
      console.error('sendMessage error:', error);
      setInput(content); // 실패 시 입력 복원
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.user_id === user?.id;

    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View
            style={[
              styles.avatar,
              { backgroundColor: item.user?.avatar_color ?? colors.primary },
            ]}
          >
            <Text style={styles.avatarText}>
              {item.user?.nickname?.[0] ?? '?'}
            </Text>
          </View>
        )}
        <View style={styles.messageBubbleWrap}>
          {!isMe && (
            <Text style={styles.nickname}>{item.user?.nickname ?? '익명'}</Text>
          )}
          <View
            style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                isMe && { color: colors.white },
              ]}
            >
              {item.content}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!currentEpisode) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ fontSize: 40 }}>💬</Text>
        <Text style={styles.emptyTitle}>채팅방이 열려있지 않아요</Text>
        <Text style={styles.emptySubText}>방영 시간에 맞춰 자동으로 열려요</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {currentEpisode.chat_status === 'extended' && (
        <View style={styles.extendedBanner}>
          <Text style={styles.extendedText}>연장 채팅 중 (방영 종료 후 1시간)</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {isChatOpen ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={user ? '메시지를 입력하세요...' : '로그인이 필요합니다'}
            placeholderTextColor={colors.textSecondary}
            editable={!!user}
            maxLength={200}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim()}
          >
            <Text style={{ fontSize: 18, color: colors.white }}>➤</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.closedBar}>
          <Text style={{ fontSize: 12 }}>🔒</Text>
          <Text style={styles.closedText}>채팅이 종료되었습니다 (읽기 전용)</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  extendedBanner: {
    backgroundColor: '#FFF3CD',
    padding: 8,
    alignItems: 'center',
  },
  extendedText: {
    fontSize: fontSize.meta,
    color: '#856404',
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSize.meta,
    fontWeight: fontWeight.bold,
  },
  messageBubbleWrap: {
    maxWidth: '75%',
  },
  nickname: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    padding: 10,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  closedBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closedText: {
    fontSize: fontSize.meta,
    color: colors.textSecondary,
  },
});
