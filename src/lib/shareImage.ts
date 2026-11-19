import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';

/** Phone apps: the card as a 1080×1920 PNG, handed to the share sheet (WhatsApp, Instagram…). */
export async function shareView(ref: RefObject<unknown>, opts: { title: string; text: string }): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const uri = await captureRef(ref as never, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });
  if (!(await Sharing.isAvailableAsync())) throw new Error('SHARE_UNAVAILABLE');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: opts.title, UTI: 'public.png' });
  return 'shared';
}
