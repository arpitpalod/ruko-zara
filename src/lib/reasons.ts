import type { Verdict } from './types';

/** Why you voted: one tap from a fixed list (same codes as the database allows). */
export type VoteReason =
  | 'need_it'
  | 'worth_price'
  | 'treat_yourself'
  | 'dont_need'
  | 'wait_sale'
  | 'cheaper_option'
  | 'too_much';

export const REASONS: Record<Verdict, VoteReason[]> = {
  approve: ['need_it', 'worth_price', 'treat_yourself'],
  reject: ['dont_need', 'wait_sale', 'cheaper_option', 'too_much'],
};

export const sideOf = (code: VoteReason): Verdict => (REASONS.approve.includes(code) ? 'approve' : 'reject');

export interface ReasonCount {
  reason: VoteReason;
  n: number;
}
