import type { RefObject } from 'react';

/**
 * Web: a card as a 1080×1920 PNG. Phones that can share files (most Android Chrome, iOS 15+ Safari)
 * get the share sheet (WhatsApp, Instagram Story…); anything else downloads the image.
 * The image is made first (prepareImage, when the preview opens) so the Share tap can open the share
 * sheet straight away: iPhones only allow it right after a tap, and making the image takes a moment.
 * The image maker (html2canvas-pro, 72 KB) is its own file, loaded only when needed.
 */
type H2C = (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>;
const loadImageMaker = (): Promise<H2C> => import('html2canvas-pro').then((m) => m.default as unknown as H2C);

export async function prepareImage(ref: RefObject<unknown>, name = 'ruko-zara.png'): Promise<unknown> {
  const node = ref.current as HTMLElement | null;
  if (!node) throw new Error('NO_CARD');
  const html2canvas = await loadImageMaker();
  const canvas = await html2canvas(node, { useCORS: true, backgroundColor: null, scale: 1080 / node.offsetWidth, logging: false });
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('NO_IMAGE'))), 'image/png'));
  return new File([blob], name, { type: 'image/png' });
}

export async function shareImage(prepared: unknown, opts: { title: string; text: string }): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = prepared as File;
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: opts.title, text: opts.text } as ShareData);
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled';
      // otherwise fall through to a download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

/** Copies text; quietly does nothing where the browser doesn't allow it. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
