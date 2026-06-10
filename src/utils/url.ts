const STORAGE_PREFIX = '/storage/v1/object/public/';

/**
 * Resolve a stored image URL for display.
 *
 * The database stores Supabase Storage images as relative paths
 * (e.g. `/storage/v1/object/public/event-images/abc.jpg`). For display these
 * are mapped to a neutral `/img/...` path served from the app's own origin
 * via a Next.js rewrite proxy (see next.config.ts). Ad blockers and Brave
 * Shields match the `/storage/v1/object/public/` pattern in filter lists,
 * so the neutral path avoids being blocked. External URLs (Unsplash seeds)
 * and base64 data URLs are passed through untouched, except legacy absolute
 * Supabase storage URLs, which are also mapped to the proxy path.
 */
export function getAbsoluteImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Legacy rows may contain absolute Supabase storage URLs; route those
    // through the same-origin proxy too.
    const idx = imageUrl.indexOf(STORAGE_PREFIX);
    if (idx !== -1) {
      return `/img/${imageUrl.slice(idx + STORAGE_PREFIX.length)}`;
    }
    return imageUrl;
  }

  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  if (path.startsWith(STORAGE_PREFIX)) {
    return `/img/${path.slice(STORAGE_PREFIX.length)}`;
  }
  return path;
}
