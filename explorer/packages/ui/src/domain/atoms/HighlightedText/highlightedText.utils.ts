export interface TextPart {
  text: string;
  marked: boolean;
}

/**
 * Cut `text` into marked and unmarked parts by highlight ranges, `[start, end)` in UTF-16 code units: the same
 * indices as JavaScript string indices, so `text.slice(start, end)` is exactly a marked part (the contract's rule).
 *
 * Tolerant of what the API should never send: ranges are clamped into the text, empty or inverted or non-integer
 * ranges are dropped, ranges may arrive unsorted, and overlapping ranges merge into one mark. Ranges that merely
 * touch stay separate marks.
 */
export function splitByRanges(text: string, ranges: readonly (readonly number[])[]): TextPart[] {
  const valid = ranges
    .map(([start, end]) => [Math.max(0, start ?? NaN), Math.min(text.length, end ?? NaN)] as const)
    .filter(([start, end]) => Number.isInteger(start) && Number.isInteger(end) && start < end)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const merged: [number, number][] = [];
  for (const [start, end] of valid) {
    const last = merged[merged.length - 1];
    if (last && start < last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  const parts: TextPart[] = [];
  let at = 0;
  for (const [start, end] of merged) {
    if (start > at) parts.push({ text: text.slice(at, start), marked: false });
    parts.push({ text: text.slice(start, end), marked: true });
    at = end;
  }
  if (at < text.length) parts.push({ text: text.slice(at), marked: false });
  return parts;
}
