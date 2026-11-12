import type { MouseEvent } from "react";

/**
 * A click handler that hands a plain left click to `onNavigate(href)` (so the app can change page without a load) and leaves
 * everything else (new tab, modifier keys, no handler) to the browser. The links keep their real `href`, so they still copy and open anywhere.
 */
export function followLink(href: string, onNavigate?: (href: string) => void) {
  return (event: MouseEvent<HTMLElement>) => {
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (!onNavigate || event.defaultPrevented || !plain) return;
    event.preventDefault();
    onNavigate(href);
  };
}
