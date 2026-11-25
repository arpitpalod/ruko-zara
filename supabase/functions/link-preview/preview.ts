// Fetching and reading a shop's product page (shared by link-preview and its one-off live test).

export const allowedHost = (host: string, list: string[]) => list.some((d) => host === d || host.endsWith('.' + d));

// A desktop browser's page: Amazon's desktop page has the product photo in its first ~400 KB, the mobile one doesn't.
// Measured 25 Nov on real arzi links: Amazon and IKEA answer; Flipkart (429) and Meesho (403) refuse servers,
// so for them the product name comes from the link itself (see titleFromLink).
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

export async function fetchPage(start: URL, list: string[]): Promise<{ html: string; url: URL } | null> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== 'https:' || !allowedHost(url.hostname.toLowerCase(), list)) return null;
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-IN,en;q=0.9' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      await res.body?.cancel();
      if (!loc) return null;
      url = new URL(loc, url);
      continue;
    }
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html') || !res.body) {
      await res.body?.cancel();
      return null;
    }
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    while (size < 1_500_000) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    const all = new Uint8Array(size);
    let at = 0;
    for (const p of parts) {
      all.set(p.subarray(0, Math.min(p.length, size - at)), at);
      at += p.length;
    }
    return { html: new TextDecoder().decode(all), url };
  }
  return null;
}

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

function metas(html: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const tag of html.match(/<meta\s[^>]*>/gi) ?? []) {
    const attrs: Record<string, string> = {};
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? '';
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (key && attrs.content && !out.has(key)) out.set(key, decode(attrs.content).trim());
  }
  return out;
}

/** A shop's long page title, made short enough to be an arzi's item ("The Sleep Company Orthopedic GRID Mattress"). */
export function cleanTitle(t: string): string {
  let s = t
    .replace(/^Amazon\.(in|com)\s*:\s*/i, '')
    .replace(/^Buy\s+/i, '')
    .replace(/\s+(Online at (Low|Best) Prices?|at (Best|Lowest) Price|Price in India).*$/i, '')
    .replace(/\s*[|:–-]\s*(Flipkart\.com|Myntra|AJIO|Nykaa|Croma|Reliance Digital|Tata CLiQ|Meesho|IKEA)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const bar = s.indexOf(' | ');
  if (bar > 15) s = s.slice(0, bar);
  if (s.length > 80) {
    // the item field holds 80: cut at a natural break
    const colon = s.indexOf(':');
    const comma = s.lastIndexOf(', ', 80);
    const space = s.lastIndexOf(' ', 80);
    s = colon > 20 && colon <= 80 ? s.slice(0, colon) : comma > 20 ? s.slice(0, comma) : s.slice(0, space > 20 ? space : 80);
  }
  return s.trim();
}

/** Shops that refuse servers still put the product name in the link: /optimum-nutrition-gold-standard/p/itm… */
export function titleFromLink(url: URL): string | null {
  const words = url.pathname
    .split('/')
    .map((p) => decodeURIComponent(p))
    .filter((p) => /^[a-z0-9]+(-[a-z0-9]+){2,}$/i.test(p) && !/^(itm|dp|gp)\b/i.test(p))
    .sort((a, b) => b.length - a.length)[0];
  if (!words) return null;
  const t = words.split('-').map((w) => (/^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ');
  return cleanTitle(t);
}

export function pick(html: string, base: URL): { title: string | null; image: string | null } {
  const m = metas(html);
  let title = m.get('og:title') || m.get('twitter:title') || decode(html.match(/<title[^>]*>([^<]{2,300})<\/title>/i)?.[1] ?? '').trim();
  let image =
    m.get('og:image:secure_url') ||
    m.get('og:image') ||
    m.get('twitter:image') ||
    m.get('twitter:image:src') ||
    html.match(/"hiRes":"(https:[^"]+)"/)?.[1] ||
    (html.match(/<img[^>]*id="landingImage"[^>]*>/i)?.[0] ?? '').match(/(?:data-old-hires|src)="(https:[^"]+)"/i)?.[1] ||
    '';
  try {
    image = image ? new URL(decode(image), base).toString() : '';
  } catch {
    image = '';
  }
  title = title ? cleanTitle(title) : '';
  // A "robot check" page isn't a product.
  if (/robot check|captcha|access denied|are you a human/i.test(title)) return { title: null, image: null };
  return { title: title || null, image: image.startsWith('https://') && image.length < 1200 ? image : null };
}

