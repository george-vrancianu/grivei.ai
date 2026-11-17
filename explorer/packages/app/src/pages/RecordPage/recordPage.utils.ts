import type { Locale, RecordPageData } from "@grivei/ui";
import { recordsHref } from "../EntityPage/entityPage.utils.ts";

/** The notice a Record belongs to: the agreement's code before the `~` (the part its subsequent contracts share). */
export const noticeCodeOf = (code: string): string => code.split("~")[0] ?? code;

/**
 * The authority's Records tab narrowed to the subsequent contracts that carry the framework's notice code: the SUBSEQUENT_CONTRACT badge and a free-text search for the code
 * (the search index holds the public code, so `q` = the notice code finds exactly the framework's contracts: proven by the API's seam test). There is no framework filter:
 * the list can hold another framework's contracts whose code starts with the same text, which is why the link text names no more than "subsequent contracts of this framework".
 */
export function subsequentRecordsHref(locale: Locale, record: RecordPageData): string | undefined {
  if (!record.framework) return undefined;
  const notice = noticeCodeOf(record.framework.agreement?.code ?? record.code);
  return recordsHref(locale, "authority", record.authority.key, { filter: { badges: ["SUBSEQUENT_CONTRACT"], q: notice } });
}
