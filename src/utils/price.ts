/**
 * Format a price string for display.
 *
 * - Plain numbers / numeric ranges (e.g. "15", "20-40", "12.50") → prepend "$"
 * - Anything containing a letter (e.g. "Free", "Varies", "Donation", "5 Pints") → as-is
 * - Already starts with "$" → as-is
 */
export function formatPrice(price?: string | null): string {
  if (!price) return '';
  const trimmed = price.trim();
  if (!trimmed) return '';

  // Already has a dollar sign — leave alone
  if (trimmed.includes('$')) return trimmed;

  // Contains any letter → treat as free-text label
  if (/[a-zA-Z]/.test(trimmed)) return trimmed;

  // Purely numeric (digits, optional decimals, optional dash range, whitespace/commas)
  if (/^[\d.,\s-]+$/.test(trimmed)) {
    return `$${trimmed}`;
  }

  return trimmed;
}
