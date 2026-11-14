import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { OnrcRegistrationData } from "../../../../types.ts";
import { formatDate } from "../../../../utils/formatDate.ts";

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
    <Stack spacing={0.5}>
      <Typography variant="meta" component="h3" color="text.secondary">
        {copy.heading}
      </Typography>
      {aliases.length === 0 ? (
        <Typography color="text.secondary">{copy.none}</Typography>
      ) : (
        <Stack component="ul" spacing={0.5} sx={{ m: 0, p: 0, listStyle: "none" }}>
          {aliases.map((a) => (
            <Typography component="li" key={`${a.name}-${a.firstSeen}`}>
              {/* the name is source data, shown as ONRC wrote it */}
              <strong>{a.name}</strong>{" "}
              <Typography component="span" color="text.secondary">
                {a.current ? `${copy.current} · ` : ""}
                {(a.sinceAtLeast ? copy.rangeSinceAtLeast : copy.range)(formatDate(a.firstSeen, locale, "long"), formatDate(a.lastSeen, locale, "long"))}
              </Typography>
            </Typography>
          ))}
        </Stack>
      )}
      <Typography variant="body2" color="text.secondary">
        {copy.note}
      </Typography>
    </Stack>
  );
}
