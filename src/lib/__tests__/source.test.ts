jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendSourceOnce, sourceFrom } from '../source';

const HOST = 'arpitpalod.github.io';

describe('where someone came from', () => {
  it('takes a tagged link first, in lower case', () => {
    expect(sourceFrom('?src=IG', 'https://www.reddit.com/', HOST)).toBe('ig');
    expect(sourceFrom('?utm_source=peerlist', '', HOST)).toBe('peerlist');
    expect(sourceFrom('?src=rd-sideproject', '', HOST)).toBe('rd-sideproject');
  });

  it('ignores tags that are not short codes and falls back to the sending site', () => {
    expect(sourceFrom('?src=ig%20reels!', 'https://old.reddit.com/r/x', HOST)).toBe('reddit');
    expect(sourceFrom('?src=x', 'https://l.instagram.com/', HOST)).toBe('ig');
    expect(sourceFrom(`?src=${'a'.repeat(40)}`, '', HOST)).toBeNull();
  });

  it('knows the usual sending sites', () => {
    expect(sourceFrom('', 'https://t.co/abc', HOST)).toBe('x');
    expect(sourceFrom('', 'https://www.linkedin.com/feed/', HOST)).toBe('li');
    expect(sourceFrom('', 'https://news.ycombinator.com/item?id=1', HOST)).toBe('hn');
    expect(sourceFrom('', 'https://www.google.co.in/', HOST)).toBe('google');
    expect(sourceFrom('', 'https://m.youtube.com/watch', HOST)).toBe('yt');
  });

  it('records nothing for our own pages, unknown sites or a broken referrer', () => {
    expect(sourceFrom('', `https://${HOST}/ruko-zara/`, HOST)).toBeNull();
    expect(sourceFrom('', 'https://example.org/', HOST)).toBeNull();
    expect(sourceFrom('', 'not a url', HOST)).toBeNull();
    expect(sourceFrom('', '', HOST)).toBeNull();
  });

  it('is not fooled by look-alike sites', () => {
    expect(sourceFrom('', 'https://notreddit.com/', HOST)).toBeNull();
    expect(sourceFrom('', 'https://instagram.com.evil.io/', HOST)).toBeNull();
  });
});

describe('saving the source', () => {
  beforeEach(() => AsyncStorage.clear());

  it('saves the remembered source once per phone', async () => {
    await AsyncStorage.setItem('rz.src', 'ig');
    const save = jest.fn().mockResolvedValue(undefined);
    await sendSourceOnce(save);
    await sendSourceOnce(save);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('ig');
  });

  it('tries again next time if saving failed', async () => {
    await AsyncStorage.setItem('rz.src', 'wa');
    const save = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    await sendSourceOnce(save);
    await sendSourceOnce(save);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('does nothing when no source was seen', async () => {
    const save = jest.fn();
    await sendSourceOnce(save);
    expect(save).not.toHaveBeenCalled();
  });
});
