/** The URL fragment (`#id`, as `location.hash` gives it) as an element id, or null for none or a malformed one. */
export function decodeHash(hash: string): string | null {
  if (hash.length < 2) return null;
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
}
