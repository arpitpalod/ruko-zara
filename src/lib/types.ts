export type Verdict = 'approve' | 'reject';
export type Outcome = 'bought' | 'skipped';

export interface User {
  id: string;
  handle: string;
}

/** One purchase request ("arzi") with live vote counts. Mirrors the `request_feed` view. */
export interface FeedItem {
  id: string;
  user_id: string;
  handle: string;
  item: string;
  price_inr: number;
  category: string;
  reason: string;
  alternative: string | null;
  closes_at: string;
  outcome: Outcome | null;
  created_at: string;
  approve_count: number;
  reject_count: number;
  comment_count: number;
  my_vote: Verdict | null;
}

export interface Comment {
  id: string;
  request_id: string;
  user_id: string;
  handle: string;
  body: string;
  created_at: string;
}

export interface NewRequest {
  item: string;
  price_inr: number;
  category: string;
  reason: string;
  alternative: string | null;
}

export interface Api {
  init(): Promise<User>;
  feed(): Promise<FeedItem[]>;
  mine(): Promise<FeedItem[]>;
  get(id: string): Promise<FeedItem | null>;
  comments(id: string): Promise<Comment[]>;
  create(r: NewRequest): Promise<string>;
  vote(id: string, v: Verdict): Promise<void>;
  comment(id: string, body: string): Promise<void>;
  setOutcome(id: string, o: Outcome): Promise<void>;
  report(type: 'request' | 'comment', id: string, reason?: string): Promise<void>;
  block(userId: string): Promise<void>;
}

export const CATEGORIES = ['Gadgets', 'Fashion', 'Khana', 'Beauty', 'Ghar', 'Travel', 'Fun', 'Other'] as const;
