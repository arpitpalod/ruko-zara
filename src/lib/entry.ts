import { Platform } from 'react-native';

/** The page this visit started on (web only): tells a shared link's arzi apart from one opened inside the app. */
const START = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : '';
let left = false;

/** True while someone is still on the arzi they arrived on from a shared link. */
export const arrivedOn = (id: string) => !left && START.replace(/\/$/, '').endsWith(`/request/${id}`);
export const leftArrival = () => {
  left = true;
};
