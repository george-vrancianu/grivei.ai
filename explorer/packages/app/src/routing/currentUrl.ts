/** The full URL of the page as the browser has it (scheme, host, path and query, no fragment): what a reader cites and what the copy-link button copies. */
export function currentUrl(): string {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}`;
}
