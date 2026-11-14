import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { OnrcRegistrationData } from "../../../../types.ts";
import { formatDate } from "../../../../utils/formatDate.ts";

export interface StatusListCopy {
  heading: string;
  none: string;
  /** A status the held nomenclature does not name. */
  unnamed: (code: number) => string;
  /** "first seen in the snapshot of 3 April 2026", given the formatted date. */
  firstSeen: (snapshot: string) => string;
  /** "since at least the snapshot of 18 March 2025": the status was already in the earliest snapshot we hold. */
  sinceAtLeast: (snapshot: string) => string;
  /** ONRC publishes statuses without dates: said once, plainly. */
  caveat: string;
}

export interface StatusListProps {
  statuses: OnrcRegistrationData["statuses"];
  locale: Locale;
  copy: StatusListCopy;
}

/** The statuses ONRC shows now, each with the snapshot it was first seen in (or "since at least" when the earliest snapshot already had it), and the caveat that ONRC dates none of them. */
export function StatusList({ statuses, locale, copy }: StatusListProps) {
  return (
    <Stack spacing={0.5} component="div">
      <Typography variant="meta" component="h3" color="text.secondary">
        {copy.heading}
      </Typography>
      {statuses.length === 0 ? (
        <Typography color="text.secondary">{copy.none}</Typography>
      ) : (
        <Stack component="ul" spacing={0.5} sx={{ m: 0, p: 0, listStyle: "none" }}>
          {statuses.map((s) => (
            <Typography component="li" key={s.code}>
              {/* the status is source data (ONRC's Romanian nomenclature), shown as published */}
              <strong>{s.name ?? copy.unnamed(s.code)}</strong>{" "}
              <Typography component="span" color="text.secondary">
                {(s.sinceAtLeast ? copy.sinceAtLeast : copy.firstSeen)(formatDate(s.firstSeen, locale, "long"))}
              </Typography>
            </Typography>
          ))}
        </Stack>
      )}
      <Typography variant="body2" color="text.secondary">
        {copy.caveat}
      </Typography>
    </Stack>
  );
}
