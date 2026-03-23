import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '../lib/database.types';

type AuthState = {
  user: User | null;
  session: any | null;
  loading: boolean;
  signUp: (nickname: string) => Promise<{ error?: string }>;
  signIn: (nickname: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  signUp: async (nickname: string) => {
    const email = `${nickname.toLowerCase().replace(/[^a-z0-9]/g, '')}@nasolfans.app`;
    const password = `nasol_${nickname}_${Date.now()}`;

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

  signIn: async (nickname: string) => {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('nickname', nickname)
      .single();

    if (!profile) return { error: '존재하지 않는 닉네임입니다.' };

    set({ user: profile });
    return {};
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
        .single();

      set({ user: profile, session, loading: false });
    } else {
      set({ loading: false });
    }
  },
}));
