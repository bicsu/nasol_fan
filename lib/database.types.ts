export type Episode = {
  id: string;
  season: number;
  episode_num: number;
  title: string | null;
  air_start: string;
  air_end: string;
  chat_status: 'closed' | 'open' | 'extended';
  created_at: string;
};

export type User = {
  id: string;
  nickname: string;
  avatar_color: string;
  total_points: number;
  badge_level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend';
  created_at: string;
};

export type ChatMessage = {
  id: string;
  episode_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
};

export type Post = {
  id: string;
  episode_id: string | null;
  user_id: string;
  title: string;
  content: string;
  likes: number;
  created_at: string;
  user?: User;
  comment_count?: number;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
};

export type VoteItem = {
  id: string;
  episode_id: string;
  question: string;
  options: { id: string; label: string }[];
  reward_points: number;
  correct_option_id: string | null;
  active_during_broadcast: boolean;
  created_at: string;
};

export type VoteResponse = {
  id: string;
  vote_item_id: string;
  user_id: string;
  selected_option_id: string;
  is_correct: boolean | null;
  points_awarded: number;
  created_at: string;
};

export type PointHistory = {
  id: string;
  user_id: string;
  amount: number;
  reason: 'vote_correct' | 'post' | 'comment' | 'event';
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      episodes: { Row: Episode; Insert: Omit<Episode, 'id' | 'created_at'>; Update: Partial<Episode> };
      users: { Row: User; Insert: Omit<User, 'created_at'>; Update: Partial<User> };
      chat_messages: { Row: ChatMessage; Insert: Omit<ChatMessage, 'id' | 'created_at'>; Update: Partial<ChatMessage> };
      posts: { Row: Post; Insert: Omit<Post, 'id' | 'created_at' | 'likes'>; Update: Partial<Post> };
      comments: { Row: Comment; Insert: Omit<Comment, 'id' | 'created_at'>; Update: Partial<Comment> };
      vote_items: { Row: VoteItem; Insert: Omit<VoteItem, 'id' | 'created_at'>; Update: Partial<VoteItem> };
      vote_responses: { Row: VoteResponse; Insert: Omit<VoteResponse, 'id' | 'created_at'>; Update: Partial<VoteResponse> };
      point_history: { Row: PointHistory; Insert: Omit<PointHistory, 'id' | 'created_at'>; Update: Partial<PointHistory> };
    };
  };
};
