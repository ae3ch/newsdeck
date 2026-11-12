/**
 * Preview images load downscaled through the image service wsrv.nl (images.weserv.nl).
 * Publishers deliver originals of up to 1 MB; they are displayed at thumbnail size.
 * VITE_IMAGE_PROXY sets another compatible service; «off» turns it off.
 */
const configured = (import.meta.env?.VITE_IMAGE_PROXY as string | undefined)?.trim();
export const IMAGE_PROXY = configured === 'off' ? '' : configured || 'https://wsrv.nl/';

/**
 * Address of a downscaled version (WebP, cropped). `width`/`height` in CSS pixels;
 * double the resolution is requested for sharp rendering on HiDPI screens.
 * Returns null when no image service is configured or the address does not fit.
 */
export function thumbUrl(src: string, width: number, height: number, proxy = IMAGE_PROXY): string | null {
  if (!proxy || !/^https?:\/\//i.test(src)) return null;
  const q = new URLSearchParams({
    url: src,
    w: String(width * 2),
    h: String(height * 2),
    fit: 'cover',
    output: 'webp',
    q: '70',
  });
  // «we»: do not upscale small originals
  return `${proxy}?${q.toString()}&we`;
}
