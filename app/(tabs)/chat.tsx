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
  Modal,
  Alert,
} from 'react-native';

import { colors, fontSize, fontWeight } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useEpisodeStore } from '../../stores/episodeStore';
import type { ChatMessage } from '../../lib/database.types';

const REPORT_REASONS = [
  { id: 'spam',    label: '스팸 / 도배' },
  { id: 'abuse',   label: '욕설 / 비방 / 혐오' },
  { id: 'illegal', label: '불법 정보 / 사기' },
  { id: 'etc',     label: '기타' },
];

export default function ChatScreen() {
  const user = useAuthStore((s) => s.user);
  const { currentEpisode, fetchCurrentEpisode } = useEpisodeStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [selectedMsg, setSelectedMsg] = useState<ChatMessage | null>(null);
  const [actionModal, setActionModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isChatOpen =
    currentEpisode?.chat_status === 'open' ||
    currentEpisode?.chat_status === 'extended';

  // 차단 목록 로드
  useEffect(() => {
    if (!user) return;
    supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .then(({ data }) => {
        if (data) setBlockedIds(new Set(data.map((b) => b.blocked_id)));
      });
  }, [user?.id]);

  useEffect(() => {
    fetchCurrentEpisode();
  }, []);

  const loadMessages = async (episodeId: string) => {
    // NOTE(007_users_public_view): users 테이블 SELECT 는 본인 행만 허용됨.
    // 타인 작성자 프로필(nickname/avatar_color)은 공개 뷰 users_public 으로 조인해야 하나,
    // PostgREST 임베드 조인은 외래키 관계가 필요하므로 뷰 전환 시
    // chat_messages.user_id → users_public.id 관계 힌트(!inner 또는 FK alias) 추가 필요.
    // TODO(007): 관계 설정 후 users → users_public 으로 교체.
    const { data } = await supabase
      .from('chat_messages')
      .select('*, user:users(nickname, avatar_color)')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) setMessages(data as ChatMessage[]);
  };

  useEffect(() => {
    if (!currentEpisode) return;

    let active = true;

    // 구독 기다리지 않고 즉시 로드
    loadMessages(currentEpisode.id);

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
      .subscribe();

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
      setInput(content);
    }
  };

  const onLongPressMessage = (item: ChatMessage) => {
    // 내 메시지는 신고/차단 불필요
    if (item.user_id === user?.id) return;
    setSelectedMsg(item);
    setActionModal(true);
  };

  const handleBlock = async () => {
    if (!user || !selectedMsg) return;
    setActionModal(false);

    const targetId = selectedMsg.user_id;
    const { error } = await supabase
      .from('blocks')
      .insert({ blocker_id: user.id, blocked_id: targetId });

    if (!error) {
      setBlockedIds((prev) => new Set([...prev, targetId]));
      Alert.alert('차단 완료', '해당 사용자의 메시지가 더 이상 표시되지 않습니다.');
    }
  };

  const handleReport = () => {
    setActionModal(false);
    setReportModal(true);
  };

  const submitReport = async (reason: string) => {
    if (!user || !selectedMsg) return;
    setReportModal(false);

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_user_id: selectedMsg.user_id,
      message_id: selectedMsg.id,
      reason,
    });

    if (!error) {
      Alert.alert('신고 접수', '신고가 접수되었습니다. 검토 후 조치하겠습니다.');
    } else {
      Alert.alert('오류', '신고 접수 중 오류가 발생했습니다.');
    }
    setSelectedMsg(null);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // 차단한 유저 메시지 숨김
    if (blockedIds.has(item.user_id)) return null;

    const isMe = item.user_id === user?.id;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => onLongPressMessage(item)}
        delayLongPress={400}
      >
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
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, isMe && { color: colors.white }]}>
                {item.content}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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

      {isChatOpen && user ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={colors.textSecondary}
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
      ) : isChatOpen && !user ? (
        <View style={styles.closedBar}>
          <Text style={{ fontSize: 12 }}>🔐</Text>
          <Text style={styles.closedText}>토스 로그인 연동 후 채팅 참여 가능합니다</Text>
        </View>
      ) : (
        <View style={styles.closedBar}>
          <Text style={{ fontSize: 12 }}>🔒</Text>
          <Text style={styles.closedText}>채팅이 종료되었습니다 (읽기 전용)</Text>
        </View>
      )}

      {/* 신고/차단 액션 모달 */}
      <Modal visible={actionModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => { setActionModal(false); setSelectedMsg(null); }}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>
              {selectedMsg?.user?.nickname ?? '이 사용자'}
            </Text>
            <TouchableOpacity style={styles.actionItem} onPress={handleReport}>
              <Text style={styles.actionItemText}>🚨 신고하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={handleBlock}>
              <Text style={[styles.actionItemText, { color: '#EF4444' }]}>🚫 차단하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionItem, { borderBottomWidth: 0 }]}
              onPress={() => { setActionModal(false); setSelectedMsg(null); }}
            >
              <Text style={[styles.actionItemText, { color: colors.textSecondary }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 신고 사유 선택 모달 */}
      <Modal visible={reportModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => { setReportModal(false); setSelectedMsg(null); }}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>신고 사유를 선택해주세요</Text>
            {REPORT_REASONS.map((r, i) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.actionItem,
                  i === REPORT_REASONS.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => submitReport(r.id)}
              >
                <Text style={styles.actionItemText}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  // 모달
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
  },
  actionTitle: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionItemText: {
    fontSize: fontSize.sectionTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
