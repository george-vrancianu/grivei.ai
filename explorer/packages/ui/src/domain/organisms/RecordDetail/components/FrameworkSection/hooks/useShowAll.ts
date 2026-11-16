import { useState } from "react";

/** The list of subsequent contracts shows a few rows until the reader asks for all the fetched ones: local, in place, no request. */
export function useShowAll(): { expanded: boolean; toggle: () => void } {
  const [expanded, setExpanded] = useState(false);
  return { expanded, toggle: () => setExpanded((value) => !value) };
}
