import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { BadgeChip, type BadgeCopy } from "../../../../atoms/BadgeChip/index.ts";
import type { CountCopy } from "../../../../molecules/TotalFigure/index.ts";
import type { EntityAliases } from "../../../../types.ts";
import { formatDate } from "../../../../utils/formatDate.ts";
import { listSx } from "../../../../utils/listSx.ts";

export interface AppearsInSeapAsCopy {
  heading: string;
  /** One line on what the list is: every spelling SEAP has published for this entity. */
  intro: string;
  /** "41 Records" */
  records: CountCopy;
  /** "first seen 3 Feb 2021, last 30 Aug 2023", given the formatted dates. */
  range: (first: string, last: string) => string;
  /** The same for an alias seen on one day only. */
  singleDay: (date: string) => string;
  /** Carries the label and explanation of the name-differs-from-ANAF badge. */
  badges: BadgeCopy;
}

export interface AppearsInSeapAsProps {
  aliases: EntityAliases;
  locale: Locale;
  copy: AppearsInSeapAsCopy;
}

/** "Appears in SEAP as": every spelling of the name SEAP published for this entity, with its Record count, first and last dates, and a badge when it differs from ANAF's name. */
export function AppearsInSeapAs({ aliases, locale, copy }: AppearsInSeapAsProps) {
  if (aliases.length === 0) return null;
  return (
    <Stack component="section" spacing={1} aria-label={copy.heading}>
      <Typography variant="h6" component="h2">
        {copy.heading}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {copy.intro}
      </Typography>
      <Stack component="ul" sx={listSx}>
        {aliases.map((alias) => (
          <Stack key={alias.name} component="li" spacing={0.25} sx={{ py: 1 }}>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              <Typography sx={{ fontWeight: 600 }}>{alias.name}</Typography>
              {alias.differsFromAnaf && <BadgeChip badge="NAME_DIFFERS_FROM_ANAF" copy={copy.badges} />}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {copy.records(alias.records, formatCount(alias.records, false, locale))} ·{" "}
              {alias.first === alias.last
                ? copy.singleDay(formatDate(alias.first, locale))
                : copy.range(formatDate(alias.first, locale), formatDate(alias.last, locale))}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
