import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../lib/database.types';

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (nickname: string) => Promise<{ error?: string }>;
  signIn: (nickname: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  signUp: async (nickname: string) => {
    const email = `${nickname.toLowerCase().replace(/[^a-z0-9]/g, '')}@nasolfans.app`;
    // TODO(Phase 2): Toss 로그인으로 교체 시 이 임시 비밀번호 방식 제거
    const password = `nasol_${Math.random().toString(36).slice(2)}_${Date.now()}`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) return { error: authError.message };

    if (authData.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        nickname,
        avatar_color: '#D4537E',
        total_points: 0,
        badge_level: 'bronze',
      });

      if (profileError) return { error: profileError.message };

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      set({ user: profile, session: authData.session });
    }

    return {};
  },

  // TODO(Phase 2): Toss 로그인으로 교체. 현재는 닉네임 조회만으로 로그인 (임시)
  signIn: async (nickname: string) => {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('nickname', nickname)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!profile) return { error: '존재하지 않는 닉네임입니다.' };

    set({ user: profile });
    return {};
  },

  refreshUser: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) set({ user: data });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  loadSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      set({ user: profile, session, loading: false });
    } else {
      set({ loading: false });
    }
  },
}));
