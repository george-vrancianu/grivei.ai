import { useCallback, useState } from "react";

/** Open and closed state for a menu anchored to its button. The anchor is held in state, so a menu that starts open waits for its button to mount. */
export function useMenuAnchor(defaultOpen: boolean) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [wanted, setWanted] = useState(defaultOpen);
  const open = wanted && anchor !== null;
  const toggle = useCallback(() => setWanted((current) => !current), []);
  const close = useCallback(() => setWanted(false), []);
  return { anchor, setAnchor, open, toggle, close };
}
