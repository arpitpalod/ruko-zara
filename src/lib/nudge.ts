/**
 * Which savings nudge to show. Behavioural basis (19 Nov):
 * - Endowed progress: step 1 ("Pause") is already ticked when you open the app. It's true (you did
 *   pause), so the saved amount stays honest: no made-up rupees.
 * - The next step is always one concrete action: post, or mark what you did once the crowd has voted.
 *   Marking is what makes savings grow (only 4 of 29 posters had marked anything by 19 Nov).
 */
export type NudgeState = 'start' | 'waiting' | 'decide' | 'saved';

export function nudgeState(saved: number, posted: number, toDecide: number): NudgeState {
  if (toDecide > 0) return 'decide'; // the step that moves the number comes first
  if (saved > 0) return 'saved';
  if (posted > 0) return 'waiting';
  return 'start';
}
