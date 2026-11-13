import type { RecordFilter } from "@grivei/contract";
import { Box } from "@grivei/ui";
import { AppLink } from "../AppLink/index.ts";

export interface OnlyMatchingLinkProps {
  /** The search the entity was opened from (its query and chips). */
  carried: RecordFilter;
  /** The Records tab with that search applied to the entity's filter. */
  href: string;
  copy: { query: (q: string) => string; filters: string };
}

/** "only Records matching '<query>'": names the query, or says "the search's filters" when only chips were carried. Followed in-app, without a page load. */
export function OnlyMatchingLink({ carried, href, copy }: OnlyMatchingLinkProps) {
  return (
    <Box>
      <AppLink href={href}>{carried.q ? copy.query(carried.q) : copy.filters}</AppLink>
    </Box>
  );
}
