import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { Well } from "../../../../../atoms/Well/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { type } from "../../../../../theme/tokens.ts";
import { PartyName, type PartyNameCopy } from "../../../../atoms/PartyName/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
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
  onNavigate?: ((href: string) => void) | undefined;
  /** The panel shows a held answer while the next loads. */
  busy?: boolean | undefined;
}

/**
 * The Winners panel: every winner in a well, two to a row from `md` and stacked below it. A natural person is never named or linked (ADR 0003, `PartyName`);
 * a winner with no Entity shows its published name unlinked. A consortium says how many members it has in the header and lists each member with its equal share;
 * the note under the wells says the share is a convention.
 */
export function WinnersSection({ record, entityHref, locale, copy, onNavigate, busy }: WinnersSectionProps) {
  const consortium = isConsortium(record);
  return (
    <Panel heading={copy.winners} level="h2" busy={busy} aside={consortium ? copy.consortiumOf(record.winners.length, formatCount(record.winners.length, false, locale)) : undefined}>
      <Box
        component="ul"
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {record.winners.map((party, index) => (
          <Well component="li" key={index} sx={{ px: 2, py: 1.5, overflowWrap: "anywhere" }}>
            <Typography component="span" sx={{ fontWeight: type.rowTitle.weight }}>
              <PartyName party={party} entityHref={(entity) => entityHref(entity, "supplier")} copy={copy.party} onNavigate={onNavigate} />
            </Typography>
            {consortium && party.share !== null && (
              <Typography component="span" variant="meta">
                {" "}
                ({withNodes(copy.share, [<MoneyAmount bani={party.share} locale={locale} showBani />])})
              </Typography>
            )}
          </Well>
        ))}
      </Box>
      {consortium && (
        <Typography variant="body2" color="text.secondary">
          {copy.convention}
        </Typography>
      )}
    </Panel>
  );
}
