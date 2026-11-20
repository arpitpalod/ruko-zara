import { Linking, Platform } from 'react-native';
import { WEB_BASE } from './legal';

/**
 * Public web link to one request — opens in any browser, no install needed. `src` tags where the
 * link was shared (e.g. "wa"), so we can count which sharing brings people back.
 */
export const requestUrl = (id: string, src?: string, lang?: string) => {
  const q = [src && `src=${src}`, lang && `lang=${lang}`].filter(Boolean).join('&');
  return `${WEB_BASE}/request/${id}${q ? `?${q}` : ''}`;
};

const waWeb = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/**
 * Sends the message (with the link inside it) to WhatsApp.
 * - Phone browsers: the phone's own share sheet, with the text only. If a separate `url` is passed,
 *   WhatsApp on iPhone keeps just the link and drops the message, so the link stays inside the text.
 * - Android app: straight into WhatsApp.
 * - Desktop / anything else: WhatsApp's wa.me page.
 */
export const shareOnWhatsApp = (text: string) => {
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    const phone = !!nav && /Android|iPhone|iPad|iPod/i.test(nav.userAgent);
    if (phone && typeof nav!.share === 'function') {
      nav!.share({ text }).catch((e: { name?: string }) => {
        // Cancelled by the person: do nothing. Not allowed here: fall back to wa.me in this tab.
        if (e?.name !== 'AbortError') window.location.href = waWeb(text);
      });
      return;
    }
    Linking.openURL(waWeb(text)).catch(() => {});
    return;
  }
  Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`).catch(() =>
    Linking.openURL(waWeb(text)).catch(() => {}),
  );
};
