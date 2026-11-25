import type { ReasonCount, VoteReason } from './reasons';

export type Verdict = 'approve' | 'reject';
export type Outcome = 'bought' | 'skipped';

export interface User {
  id: string;
  handle: string;
  /** Verified email; null while the user is still anonymous. */
  email: string | null;
  /** Moderator: sees hidden content and can hide/unhide anything. */
  isAdmin: boolean;
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
  /** Demo vote counts (example arzi only) — always shown with a "demo" tag. */
  demo_approve?: number;
  demo_reject?: number;
  /** Only admins (and the owner) ever receive hidden arzi. */
  hidden?: boolean;
  /** Not signed in yet: a read-only preview. Open arzi then carry only the vote total, never the split. */
  preview?: boolean;
  vote_total?: number;
  /** Votes from accounts with a verified email (guests are cheap to fake; these aren't). */
  verified_approve?: number;
  verified_reject?: number;
  /** The poster's OK to feature this arzi on Ruko Zara's social pages (name hidden). */
  feature_ok?: boolean;
}

export interface Comment {
  id: string;
  request_id: string;
  user_id: string;
  handle: string;
  body: string;
  created_at: string;
  hidden?: boolean;
}

export interface NewRequest {
  item: string;
  price_inr: number;
  category: string;
  reason: string;
  alternative: string | null;
  link: string | null;
  /** How long voting stays open: 1 hour to 7 days (168 h). Fixed once posted. */
  duration_hours: number;
  /** OK to feature it on Ruko Zara's social pages (name hidden). Off unless ticked. */
  feature_ok: boolean;
}

/** Choices shown on the posting form. */
export const DURATIONS = [6, 12, 24, 48, 72, 120, 168] as const;

export type FeedKind = 'open' | 'closed';

export interface Api {
  /** Signs in (a guest account on first launch). Runs once; actions that need an account wait for it. */
  init(): Promise<User>;
  /** Called whenever a sign-in finishes, including one started by an action. Returns an unsubscribe. */
  onSignedIn(fn: (u: User) => void): () => void;
  feed(kind: FeedKind): Promise<FeedItem[]>;
  mine(): Promise<FeedItem[]>;
  get(id: string): Promise<FeedItem | null>;
  comments(id: string): Promise<Comment[]>;
  create(r: NewRequest): Promise<string>;
  /** The app always sends a reason; the database also takes none (older app versions). */
  vote(id: string, v: Verdict, reason?: VoteReason): Promise<void>;
  /** How many voters gave each reason. Empty unless you may see the split (voted, own, closed, admin). */
  voteReasons(id: string): Promise<ReasonCount[]>;
  /** Free votes left for a guest (20 max); null once the email is verified. */
  guestVotesLeft(): Promise<number | null>;
  comment(id: string, body: string): Promise<void>;
  setOutcome(id: string, o: Outcome): Promise<void>;
  /** The poster gives or takes back their OK to feature the arzi on our social pages. */
  setFeatureOk(id: string, ok: boolean): Promise<void>;
  /** Records where this person first came from (a short code such as "ig"); kept only the first time. */
  setSource(src: string): Promise<void>;
  report(type: 'request' | 'comment', id: string, reason?: string): Promise<void>;
  block(userId: string): Promise<void>;
  sendEmailCode(email: string): Promise<CodeMode>;
  verifyEmailCode(email: string, code: string, mode: CodeMode): Promise<User>;
  /**
   * Google sign-in (website). A guest keeps their votes and arzi (the Google account is added to the guest
   * account). Leaves the site and returns to `returnTo` already signed in ('redirecting'); the demo signs in at once.
   */
  signInWithGoogle(returnTo: string): Promise<User | 'redirecting'>;
  /** The shop link's product name and photo (null when it couldn't be checked at all). */
  linkPreview(url: string): Promise<LinkPreview | null>;
  /** Deletes the account and all its data, then starts a fresh anonymous session. */
  deleteAccount(): Promise<User>;
  /** Admin only: hide or unhide an arzi or comment for everyone. */
  adminSetHidden(type: 'request' | 'comment', id: string, hide: boolean): Promise<void>;
  /** Admin only: silent ban. The person sees nothing unusual, but nothing they do reaches anyone else. */
  adminSetBanned(userId: string, ban: boolean, reason?: string): Promise<void>;
  /** Admin only: ids of banned people (empty for everyone else). */
  adminBannedIds(): Promise<string[]>;
}

export const CATEGORIES = ['Gadgets', 'Fashion', 'Khana', 'Beauty', 'Ghar', 'Travel', 'Fun', 'Health', 'Other'] as const;

/** What a shop link shows: whether the shop is allowed, and the product's name and photo when the shop lets us read them. */
export type LinkPreview = { allowed: boolean; site: string; title?: string | null; image?: string | null };
