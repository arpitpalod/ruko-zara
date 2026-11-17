import { Linking } from 'react-native';
import { WEB_BASE } from './legal';

/** Public web link to one request — opens in any browser, no install needed. */
export const requestUrl = (id: string) => `${WEB_BASE}/request/${id}`;

/** Opens WhatsApp (app or web) with the message ready to send. */
export const shareOnWhatsApp = (text: string) => {
  Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`).catch(() => {});
};
