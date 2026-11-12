/** Puts the browser (jsdom) at a URL before the app renders, as if the reader had opened it. */
export function openAt(url: string): void {
  window.history.replaceState(null, "", url);
}
