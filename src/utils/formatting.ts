/**
 * Formatting utility functions
 * Pure functions for string formatting, URL handling, etc.
 */

/**
 * Normalize a URL by adding https:// if missing
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  url = url.trim();
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
}

/**
 * Format a price value for display
 */
export function formatPrice(price: string | undefined): string | null {
  if (!price) return null;
  if (price.toLowerCase() === 'free') return 'Free';
  if (price.startsWith('$')) return price;
  return `$${price}`;
}

/**
 * Get first name from a full name string
 */
export function getFirstName(fullName: string | undefined): string {
  if (!fullName) return '';
  return fullName.split(' ')[0];
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Generate a unique ID (compatible with older browsers)
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

