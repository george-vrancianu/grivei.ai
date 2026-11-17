import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { OnrcRegistrationData } from "../../../../types.ts";
import { Tag } from "../../../../atoms/Tag/index.ts";
import { formatDate } from "../../../../utils/formatDate.ts";
import { listRowSx, listSx } from "../../../../utils/listSx.ts";

export interface AliasListCopy {
  heading: string;
  none: string;
  /** ONRC's legal name today. */
  current: string;
  /** "seen in the snapshots of 18 March 2025 to 2 March 2026" given the formatted first and last snapshot. */
  range: (first: string, last: string) => string;
  /** The same for a name already in the earliest snapshot: "since at least ...". */
  rangeSinceAtLeast: (first: string, last: string) => string;
  /** ONRC names never rename the entity. */
  note: string;
}

export interface AliasListProps {
  aliases: OnrcRegistrationData["aliases"];
  locale: Locale;
  copy: AliasListCopy;
}

/** ONRC's legal name and earlier names with the snapshots they were seen in: aliases only, never the name shown at the top of the page. */
export function AliasList({ aliases, locale, copy }: AliasListProps) {
  return (
    <Box>
      <Typography variant="meta" component="h3" color="text.secondary" sx={{ px: 2, pb: 1 }}>
        {copy.heading}
      </Typography>
      {aliases.length === 0 ? (
        <Typography color="text.secondary" sx={{ px: 2, pb: 1.5 }}>{copy.none}</Typography>
      ) : (
        <Box component="ul" sx={{ ...listSx, borderTop: 1, borderColor: "divider" }}>
          {aliases.map((a) => (
            <Box component="li" key={`${a.name}-${a.firstSeen}`} sx={{ ...listRowSx, display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 1.5, rowGap: 0.5 }}>
              {/* the name is source data, shown as ONRC wrote it */}
              <strong>{a.name}</strong>
              {a.current && <Tag>{copy.current}</Tag>}
              <Typography component="span" color="text.secondary">
                {(a.sinceAtLeast ? copy.rangeSinceAtLeast : copy.range)(formatDate(a.firstSeen, locale, "long"), formatDate(a.lastSeen, locale, "long"))}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: "divider" }}>
        {copy.note}
      </Typography>
    </Box>
  );
}
