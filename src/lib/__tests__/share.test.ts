/// <reference types="jest" />
// WhatsApp sharing must carry the whole message, not just the link.
import { Linking, Platform } from 'react-native';
import { shareOnWhatsApp } from '../share';

const MSG = 'Kisi ko *Phone* (₹9,999) chahiye 🤔\nVote karo 👇\nhttps://arpitpalod.github.io/ruko-zara/request/r1';

function loadShare(os: 'web' | 'android') {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
  return { shareOnWhatsApp };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

it('Android app opens WhatsApp directly with the full message', () => {
  loadShare('android').shareOnWhatsApp(MSG);
  expect(Linking.openURL).toHaveBeenCalledWith(`whatsapp://send?text=${encodeURIComponent(MSG)}`);
});

it('falls back to wa.me when WhatsApp is not installed', async () => {
  (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no app'));
  loadShare('android').shareOnWhatsApp(MSG);
  await new Promise((r) => setTimeout(r, 0));
  expect(Linking.openURL).toHaveBeenLastCalledWith(`https://wa.me/?text=${encodeURIComponent(MSG)}`);
});

it('phone browsers use the share sheet with text only (no separate url)', () => {
  const share = jest.fn().mockResolvedValue(undefined);
  const nav = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', share };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: nav });
  loadShare('web').shareOnWhatsApp(MSG);
  expect(share).toHaveBeenCalledWith({ text: MSG });
  expect(Linking.openURL).not.toHaveBeenCalled();
});

it('computers use wa.me', () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' } });
  loadShare('web').shareOnWhatsApp(MSG);
  expect(Linking.openURL).toHaveBeenCalledWith(`https://wa.me/?text=${encodeURIComponent(MSG)}`);
});
