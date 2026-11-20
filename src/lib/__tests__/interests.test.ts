jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import { learnInterests } from '../interests';

const v = (category: string, my_vote: string | null = 'approve') => ({ category, my_vote });

describe('learnInterests', () => {
  it('waits for 3 votes', () => {
    expect(learnInterests([v('Gadgets'), v('Gadgets'), v('Ghar', null)])).toEqual([]);
  });
  it('picks the category most votes went to', () => {
    expect(learnInterests([v('Gadgets'), v('Gadgets'), v('Gadgets'), v('Ghar'), v('Khana'), v('Travel')])).toEqual(['Gadgets']);
  });
  it('keeps at most 2, most-voted first', () => {
    expect(learnInterests([v('Ghar'), v('Gadgets'), v('Gadgets'), v('Ghar'), v('Ghar'), v('Khana'), v('Gadgets', null)])).toEqual(['Ghar', 'Gadgets']);
  });
  it('picks nothing when votes are spread thin', () => {
    expect(learnInterests([v('Gadgets'), v('Ghar'), v('Khana'), v('Travel'), v('Fun'), v('Beauty')])).toEqual([]);
  });
});
