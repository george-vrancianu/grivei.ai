export const DEFAULT_DEBOUNCE_MS = 250;
export const DEFAULT_MIN_LENGTH = 2;

/**
 * What typing `text` should ask for: the trimmed query when it is long enough, "" when the box is empty (the
 * national state), and null when it is too short to search (nothing to ask).
 */
export function queryFor(text: string, minLength: number): string | null {
  const trimmed = text.trim();
  if (trimmed === "") return "";
  return trimmed.length >= minLength ? trimmed : null;
}

/** True while the text is something but too short to search. */
export const isTooShort = (text: string, minLength: number) => queryFor(text, minLength) === null;
