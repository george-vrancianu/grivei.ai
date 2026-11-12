// The search text fold (#68): the TypeScript mirror of watchdog/pipeline/fold.py, which folds every Record's document at load.
// The reader's query goes through the SAME rules, so a typed word matches the published one whatever its diacritics, case,
// dots or legal form. Both sides are tested against watchdog/tests/fixtures/fold-cases.json.
//
//   1 strip diacritics (NFKD, drop combining marks): ş and ș give s, ţ and ț give t
//   2 lower-case
//   3 join dotted legal forms: single letters separated by dots (S.R.L.) become one word (srl)
//   4 split on everything that is not a letter or a digit
//   5 drop the legal-form stop-words
//   6 rewrite a RO-prefixed CUI (RO12345678) to its digits

/** Legal forms: noise in a company name, never worth a match. */
export const STOP_WORDS: ReadonlySet<string> = new Set(["sc", "srl", "sa", "sca", "scs", "snc", "pfa", "ii"]);

const DOTTED = /(?<![\p{L}\p{N}])\p{L}(?:\.\p{L})+(?![\p{L}\p{N}])/gu;
const NOT_ALNUM = /[^\p{L}\p{N}]+/u;
const RO_CUI = /^ro(\d{2,10})$/;

/** The folded tokens of `text`, in order. */
export function foldTokens(text: string): string[] {
  const stripped = text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
  const joined = stripped.replace(DOTTED, (m) => m.replaceAll(".", ""));
  const out: string[] = [];
  for (const token of joined.split(NOT_ALNUM)) {
    if (!token || STOP_WORDS.has(token)) continue;
    out.push(RO_CUI.exec(token)?.[1] ?? token);
  }
  return out;
}

/** The folded text: its tokens joined by one space; empty when only stop-words (or nothing) was there. */
export const fold = (text: string): string => foldTokens(text).join(" ");
