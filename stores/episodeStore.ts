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
    const { data } = await supabase
      .from('episodes')
      .select('*')
      .in('chat_status', ['open', 'extended'])
      .single();

    set({ currentEpisode: data, loading: false });
  },

  fetchNextEpisode: async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('episodes')
      .select('*')
      .gt('air_start', now)
      .order('air_start', { ascending: true })
      .limit(1)
      .single();

    set({ nextEpisode: data });
  },
}));
