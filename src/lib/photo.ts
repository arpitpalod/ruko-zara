// Product photos are kept on our own server (storage bucket "photos"); an arzi stores only the file name.
const base = process.env.EXPO_PUBLIC_SUPABASE_URL;

/** The address of an arzi's photo, or null. The demo build's examples carry the picture itself. */
export function photoUrl(photo?: string | null, server: string | undefined = base): string | null {
  if (!photo) return null;
  if (photo.startsWith('data:image/')) return photo;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(photo) || !server) return null;
  return `${server.replace(/\/$/, '')}/storage/v1/object/public/photos/${photo}`;
}
