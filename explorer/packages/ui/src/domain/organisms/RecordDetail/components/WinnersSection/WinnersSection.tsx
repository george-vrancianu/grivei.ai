import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { color, type } from "../../../../../theme/tokens.ts";
import { PartyName, type PartyNameCopy } from "../../../../atoms/PartyName/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { SectionHeading } from "../../../../atoms/SectionHeading/index.ts";
import { withNodes } from "../../../../utils/withNodes.tsx";
import type { EntityRef, EntityRole, RecordPageData } from "../../../../types.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { isConsortium } from "../../recordDetail.utils.ts";

export interface WinnersSectionCopy {
  winners: string;
  party: PartyNameCopy;
  /** "consortium of 6", given the number of members and its formatted number. */
  consortiumOf: (n: number, formatted: string) => string;
  /** "equal share: RON 15,000,000", given the formatted amount. */
  share: (amount: string) => string;
  /** The note under a consortium's members: shares are a counting convention, the Record shows the full value. */
  convention: string;
}

export interface WinnersSectionProps {
  record: RecordPageData;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  locale: Locale;
  copy: WinnersSectionCopy;
}

/**
 * Every winner, in a grid of two columns that stacks on a phone. A natural person is never named or linked (ADR 0003, `PartyName`);
 * a winner with no Entity shows its published name unlinked. A consortium lists each member with its equal share and says the share is a convention.
 */
export function WinnersSection({ record, entityHref, locale, copy }: WinnersSectionProps) {
  const consortium = isConsortium(record);
  return (
    <Stack spacing={1.5}>
      <SectionHeading component="h2">
        {copy.winners}
        {consortium && " "}
        {consortium && (
          <Box component="span" sx={{ color: color.text2 }}>
            {"· "}
            {copy.consortiumOf(record.winners.length, formatCount(record.winners.length, false, locale))}
          </Box>
        )}
      </SectionHeading>
      <Box
        component="ul"
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
          columnGap: 4,
        }}
      >
        {record.winners.map((party, index) => (
          <Box component="li" key={index} sx={{ py: 1.5, borderTop: `1px solid ${color.line}`, overflowWrap: "anywhere" }}>
            <Typography component="span" sx={{ fontWeight: type.rowTitle.weight }}>
              <PartyName party={party} entityHref={(entity) => entityHref(entity, "supplier")} copy={copy.party} />
            </Typography>
            {consortium && party.share !== null && (
              <Typography component="span" variant="meta">
                {" "}
                ({withNodes(copy.share, [<MoneyAmount bani={party.share} locale={locale} showBani />])})
              </Typography>
            )}
          </Box>
        ))}
      </Box>
      {consortium && (
        <Typography variant="body2" color="text.secondary">
          {copy.convention}
        </Typography>
      )}
    </Stack>
  );
}
