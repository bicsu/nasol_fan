import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Episode } from '../lib/database.types';

type EpisodeState = {
  currentEpisode: Episode | null;
  nextEpisode: Episode | null;
  loading: boolean;
  fetchCurrentEpisode: () => Promise<void>;
  fetchNextEpisode: () => Promise<void>;
};

export const useEpisodeStore = create<EpisodeState>((set) => ({
  currentEpisode: null,
  nextEpisode: null,
  loading: true,

  fetchCurrentEpisode: async () => {
    try {
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .in('chat_status', ['open', 'extended'])
        .order('air_start', { ascending: false })
        .limit(1);

      if (error) throw error;
      set({ currentEpisode: data?.[0] ?? null, loading: false });
    } catch (e) {
      console.error('fetchCurrentEpisode:', e);
      set({ currentEpisode: null, loading: false });
    }
  },

  fetchNextEpisode: async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .gt('air_start', now)
        .order('air_start', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      set({ nextEpisode: data });
    } catch (e) {
      console.error('fetchNextEpisode:', e);
      set({ nextEpisode: null });
    }
  },
}));
