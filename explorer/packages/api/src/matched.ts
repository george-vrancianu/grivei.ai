// Why a Record matched (#69): for each returned Record, the field the query hit, that field's text as published, and the
// highlight ranges in it. Computed in memory from the rows of the page and nothing else: never from the whole result set.
//
// Offsets. `highlights` are [start, end) offsets in UTF-16 code units (JS string indices) into `text`, the ORIGINAL text
// (Romanian, as in the source: diacritics, case and punctuation intact). The query is folded (fold.ts) and so is the text,
// token by token, but every folded character remembers the original character it came from, so a range found in folded
// space is mapped back. A token that matches whole is highlighted whole; a token matched by the last query token as a prefix
// is highlighted up to the original character that holds the prefix's last folded letter ("Deszăpezire" for `deszapezir` is
// [0, 10]). Ranges are sorted and never overlap.
//
// Which field. The search document is one folded text of the Record's fields, so a query's tokens may be spread over several
// of them. Each field is scored by how many DISTINCT query tokens it contains (whole, or the last one as a prefix); the field
// with the most wins, and a tie goes by priority: CUI, PUBLIC_CODE, TITLE, AUTHORITY, SUPPLIER, CPV_CODE, CPV_DESCRIPTION
// (an identifier typed in full is the strongest signal, then the Record's own words, then the parties, then the CPV). A
// field with no query token is never reported, so a Record the index returned always names a field unless only the folded
// document held the match (the tokens spread so that every field holds a different one still reports the best field).
import { STOP_WORDS } from "./fold.ts";

export type MatchableField = "TITLE" | "AUTHORITY" | "SUPPLIER" | "CPV_CODE" | "CPV_DESCRIPTION" | "PUBLIC_CODE" | "CUI";

/** The tie-break order of the fields (first wins). */
export const FIELD_PRIORITY: readonly MatchableField[] = ["CUI", "PUBLIC_CODE", "TITLE", "AUTHORITY", "SUPPLIER", "CPV_CODE", "CPV_DESCRIPTION"];

export interface MatchedField {
  field: MatchableField;
  text: string;
  highlights: [number, number][];
}

/** One folded token of a text and where it sits in the original: [start, end) in UTF-16 units; `unitEnds[i]` is the original end of its i-th folded character. */
export interface LocatedToken {
  folded: string;
  start: number;
  end: number;
  unitEnds: number[];
}

const NOT_ALNUM = /[^\p{L}\p{N}]/u;
const LETTER = /\p{L}/u;
const ALNUM = /[\p{L}\p{N}]/u;
const RO_CUI = /^ro(\d{2,10})$/;

interface Unit {
  ch: string;
  start: number;
  end: number;
}

/** The folded tokens of `text` with their place in it: the same tokens as `foldTokens(text)`, in order (tested against it). */
export function locateTokens(text: string): LocatedToken[] {
  // 1-2: strip diacritics and lower-case, one original character at a time, every folded unit keeping its origin
  const units: Unit[] = [];
  let at = 0;
  for (const original of text) {
    const folded = original.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
    if (!folded && units.length) units[units.length - 1]!.end = at + original.length; // a lone combining mark belongs to the letter before it
    for (const ch of folded) units.push({ ch, start: at, end: at + original.length });
    at += original.length;
  }
  // 3: dotted single letters (S.R.L.) are one word: drop the dots between them
  const dropped = new Set<number>();
  for (let i = 0; i < units.length; i++) {
    if (!LETTER.test(units[i]!.ch) || (i > 0 && ALNUM.test(units[i - 1]!.ch))) continue;
    let j = i;
    const dots: number[] = [];
    while (units[j + 1]?.ch === "." && units[j + 2] && LETTER.test(units[j + 2]!.ch)) {
      dots.push(j + 1);
      j += 2;
    }
    // like the fold's regex, which backs off one pair when the run is glued to a word ("s.c.alfa" joins "s.c" only)
    if (units[j + 1] && ALNUM.test(units[j + 1]!.ch)) dots.pop();
    for (const d of dots) dropped.add(d);
  }
  // 4: split on everything that is not a letter or a digit
  const out: LocatedToken[] = [];
  let current: Unit[] = [];
  const flush = () => {
    if (!current.length) return;
    let folded = current.map((u) => u.ch).join("");
    let kept = current;
    if (!STOP_WORDS.has(folded)) {
      const ro = RO_CUI.exec(folded);
      if (ro) {
        kept = current.slice(2); // RO<digits>: only the digits are the token (and are highlighted)
        folded = ro[1]!;
      }
      out.push({ folded, start: kept[0]!.start, end: kept[kept.length - 1]!.end, unitEnds: kept.map((u) => u.end) });
    }
    current = [];
  };
  units.forEach((u, i) => {
    if (dropped.has(i)) return;
    if (NOT_ALNUM.test(u.ch)) flush();
    else current.push(u);
  });
  flush();
  return out;
}

/** How a text matches the folded query tokens: the ranges (original offsets) and which query tokens it holds. */
export function matchTokens(text: string, query: readonly string[]): { highlights: [number, number][]; hit: Set<number> } {
  const hit = new Set<number>();
  const ranges: [number, number][] = [];
  if (!query.length) return { highlights: ranges, hit };
  const last = query.length - 1;
  for (const token of locateTokens(text)) {
    let best: [number, number] | null = null;
    query.forEach((q, i) => {
      if (token.folded === q) {
        hit.add(i);
        best = [token.start, token.end];
      } else if (i === last && token.folded.startsWith(q) && !best) {
        hit.add(i);
        best = [token.start, token.unitEnds[q.length - 1]!];
      }
    });
    if (best) ranges.push(best);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  return { highlights: ranges, hit };
}

/** The highlight ranges of `text` for the folded query tokens: [start, end) offsets into `text` as given. */
export const highlightRanges = (text: string, query: readonly string[]): [number, number][] => matchTokens(text, query).highlights;

/** The texts of a Record a query can match, as published. A natural person is never in them. */
export interface MatchSource {
  code: string;
  title: string;
  authorityName: string | null;
  authorityCui: string | null;
  cpvCode: string | null;
  cpvDescription: string | null;
  winners: { name: string | null; cui: string | null; foreignVatId: string | null }[];
}

/** The field that explains a Record's match, or null when no field holds a query token (or there is no text query). */
export function matchedFieldOf(source: MatchSource, query: readonly string[]): MatchedField | null {
  if (!query.length) return null;
  const candidates: { field: MatchableField; text: string }[] = [];
  const add = (field: MatchableField, text: string | null | undefined) => {
    if (text) candidates.push({ field, text });
  };
  add("CUI", source.authorityCui);
  for (const w of source.winners) {
    add("CUI", w.cui);
    add("CUI", w.foreignVatId);
  }
  add("PUBLIC_CODE", source.code);
  add("TITLE", source.title);
  add("AUTHORITY", source.authorityName);
  for (const w of source.winners) add("SUPPLIER", w.name);
  add("CPV_CODE", source.cpvCode);
  add("CPV_DESCRIPTION", source.cpvDescription);

  let best: { field: MatchableField; text: string; highlights: [number, number][]; score: number } | null = null;
  for (const c of candidates) {
    const { highlights, hit } = matchTokens(c.text, query);
    if (!hit.size) continue;
    const better =
      !best || hit.size > best.score || (hit.size === best.score && FIELD_PRIORITY.indexOf(c.field) < FIELD_PRIORITY.indexOf(best.field));
    if (better) best = { field: c.field, text: c.text, highlights, score: hit.size };
  }
  return best && { field: best.field, text: best.text, highlights: best.highlights };
}
