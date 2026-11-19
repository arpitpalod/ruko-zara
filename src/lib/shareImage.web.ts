import type { RefObject } from 'react';

/**
 * Web: the card as a 1080×1920 PNG. Phones that can share files (most Android Chrome, iOS 15+
 * Safari) get the share sheet; anything else downloads the image.
 * The image maker (html2canvas-pro, 72 KB) is its own file, loaded only when someone taps Share.
 */
type H2C = (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>;
const loadImageMaker = (): Promise<H2C> => import('html2canvas-pro').then((m) => m.default as unknown as H2C);

export async function shareView(ref: RefObject<unknown>, opts: { title: string; text: string }): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const node = ref.current as HTMLElement | null;
  if (!node) throw new Error('NO_CARD');
  const html2canvas = await loadImageMaker();
  const canvas = await html2canvas(node, { useCORS: true, backgroundColor: null, scale: 1080 / node.offsetWidth, logging: false });
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('NO_IMAGE'))), 'image/png'));
  const file = new File([blob], 'ruko-zara-result.png', { type: 'image/png' });
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ruko-zara-result.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
