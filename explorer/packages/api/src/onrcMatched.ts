// Why an ONRC registration matched (#176): every field of it that holds a query word, with the field's text as published and the highlight ranges in it.
// The same token matching as SEAP's (matched.ts: folded tokens, the last query token a prefix, ranges mapped back to the original characters), run over the page's
// rows only. The fields are the ones the search document holds: the registered name, an earlier name (an alias), the CUI, the registration number and the
// authorised CAEN codes. No person is among them.
import { matchTokens } from "./matched.ts";

export type OnrcMatchableField = "NAME" | "ALIAS" | "CUI" | "REGISTRATION_NUMBER" | "CAEN";

/** The order of the fields: an identifier typed in full is the strongest signal, then the registered name, an earlier name, then the activity code. */
export const ONRC_FIELD_PRIORITY: readonly OnrcMatchableField[] = ["CUI", "REGISTRATION_NUMBER", "NAME", "ALIAS", "CAEN"];

export interface OnrcMatchSource {
  name: string;
  aliases: readonly string[];
  cui: string | null;
  registrationNumber: string;
  caen: readonly { code: string }[];
}

export interface OnrcMatchedField {
  field: OnrcMatchableField;
  text: string;
  highlights: [number, number][];
}

/** The fields that explain a registration's match: those holding at least one query token, the ones holding most first (ties by the field order). Empty without a text query. */
export function onrcMatchedFields(source: OnrcMatchSource, query: readonly string[]): OnrcMatchedField[] {
  if (!query.length) return [];
  const candidates: { field: OnrcMatchableField; text: string }[] = [];
  if (source.cui) candidates.push({ field: "CUI", text: source.cui });
  candidates.push({ field: "REGISTRATION_NUMBER", text: source.registrationNumber }, { field: "NAME", text: source.name });
  for (const alias of source.aliases) candidates.push({ field: "ALIAS", text: alias });
  for (const { code } of source.caen) candidates.push({ field: "CAEN", text: code });
  const hits: (OnrcMatchedField & { score: number; order: number })[] = [];
  candidates.forEach((c, order) => {
    const { highlights, hit } = matchTokens(c.text, query);
    if (hit.size) hits.push({ ...c, highlights, score: hit.size, order });
  });
  hits.sort((a, b) => b.score - a.score || ONRC_FIELD_PRIORITY.indexOf(a.field) - ONRC_FIELD_PRIORITY.indexOf(b.field) || a.order - b.order);
  return hits.map(({ field, text, highlights }) => ({ field, text, highlights }));
}
