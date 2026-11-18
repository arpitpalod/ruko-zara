/// <reference types="jest" />
import { nudgeState } from '../nudge';

it('new person: step 1 done (paused), asks them to post', () => expect(nudgeState(0, 0, 0)).toBe('start'));
it('posted, voting still open: waiting', () => expect(nudgeState(0, 1, 0)).toBe('waiting'));
it('the crowd has voted and they have not said what they did: ask that first', () => {
  expect(nudgeState(0, 2, 1)).toBe('decide');
  expect(nudgeState(5000, 3, 1)).toBe('decide');
});
it('has real savings: show them and ask about the next buy', () => expect(nudgeState(2516, 3, 0)).toBe('saved'));
