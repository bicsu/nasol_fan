import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
import { colors, fontSize } from '../../lib/theme';

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{label}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          ...(Platform.OS === 'web' ? { paddingBottom: 20 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: fontSize.meta,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          headerTitle: '나솔팬즈',
          tabBarIcon: ({ color }) => <TabIcon label="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '채팅',
          tabBarIcon: ({ color }) => <TabIcon label="💬" color={color} />,
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: '게시판',
          tabBarIcon: ({ color }) => <TabIcon label="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="vote"
        options={{
          title: '투표',
          tabBarIcon: ({ color }) => <TabIcon label="🗳️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: '랭킹',
          tabBarIcon: ({ color }) => <TabIcon label="🏆" color={color} />,
        }}
      />
    </Tabs>
  );
}
