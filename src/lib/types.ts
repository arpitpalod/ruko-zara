export type Verdict = 'approve' | 'reject';
export type Outcome = 'bought' | 'skipped';

export interface User {
  id: string;
  handle: string;
  /** Verified email; null while the user is still anonymous. */
  email: string | null;
}

/** 'link' = add email to the current account (keeps history); 'login' = email already registered, switch to it. */
export type CodeMode = 'link' | 'login';

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
  /** Optional shop link (allowed shopping sites only). */
  link: string | null;
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
  link: string | null;
}

export type FeedKind = 'open' | 'closed';

export interface Api {
  init(): Promise<User>;
  feed(kind: FeedKind): Promise<FeedItem[]>;
  mine(): Promise<FeedItem[]>;
  get(id: string): Promise<FeedItem | null>;
  comments(id: string): Promise<Comment[]>;
  create(r: NewRequest): Promise<string>;
  vote(id: string, v: Verdict): Promise<void>;
  comment(id: string, body: string): Promise<void>;
  setOutcome(id: string, o: Outcome): Promise<void>;
  report(type: 'request' | 'comment', id: string, reason?: string): Promise<void>;
  block(userId: string): Promise<void>;
  sendEmailCode(email: string): Promise<CodeMode>;
  verifyEmailCode(email: string, code: string, mode: CodeMode): Promise<User>;
  /** Deletes the account and all its data, then starts a fresh anonymous session. */
  deleteAccount(): Promise<User>;
}

export const CATEGORIES = ['Gadgets', 'Fashion', 'Khana', 'Beauty', 'Ghar', 'Travel', 'Fun', 'Other'] as const;
