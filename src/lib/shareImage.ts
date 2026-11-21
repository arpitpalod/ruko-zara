import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';

/** Phone apps: a card as a 1080×1920 PNG, handed to the share sheet (WhatsApp, Instagram Story…). */
export async function prepareImage(ref: RefObject<unknown>, _name = 'ruko-zara.png'): Promise<unknown> {
  return captureRef(ref as never, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
}

export async function shareImage(prepared: unknown, opts: { title: string; text: string }): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('SHARE_UNAVAILABLE');
  await Sharing.shareAsync(prepared as string, { mimeType: 'image/png', dialogTitle: opts.title, UTI: 'public.png' });
  return 'shared';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    return await Clipboard.setStringAsync(text);
  } catch {
    return false;
  }
}
