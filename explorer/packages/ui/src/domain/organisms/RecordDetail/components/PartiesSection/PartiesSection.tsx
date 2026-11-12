import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { EntityLink } from "../../../../atoms/EntityLink/index.ts";
import { PartyName, type PartyNameCopy } from "../../../../atoms/PartyName/index.ts";
import { formatMoney } from "../../../../atoms/MoneyAmount/index.ts";
import type { EntityRef, EntityRole, RecordPageData } from "../../../../types.ts";
import { isConsortium } from "../../recordDetail.utils.ts";
import { factsSx } from "../facts.ts";

export interface PartiesSectionCopy {
  authority: string;
  winners: string;
  party: PartyNameCopy;
  /** "equal share: RON 15,000,000", given the formatted amount. */
  share: (amount: string) => string;
  /** The note under a consortium's members: shares are a counting convention, the Record shows the full value. */
  convention: string;
}

export interface PartiesSectionProps {
  record: RecordPageData;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  locale: Locale;
  copy: PartiesSectionCopy;
}

/**
 * The contracting authority (linked) and every winner. A natural person is never named or linked (ADR 0003, `PartyName`);
 * a winner with no Entity shows its published name unlinked. A consortium lists each member with its equal share, and says the share is a convention.
 */
export function PartiesSection({ record, entityHref, locale, copy }: PartiesSectionProps) {
  const consortium = isConsortium(record);
  return (
    <Stack spacing={1}>
      <Box component="dl" sx={factsSx}>
        <dt>{copy.authority}</dt>
        <dd>
          <EntityLink entity={record.authority} href={entityHref(record.authority, "authority")} copy={copy.party.entityLink} />
        </dd>
        <dt>{copy.winners}</dt>
        <dd>
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {record.winners.map((party, index) => (
              <li key={index}>
                <PartyName party={party} entityHref={(entity) => entityHref(entity, "supplier")} copy={copy.party} />
                {consortium && party.share !== null && (
                  <Typography component="span" variant="body2" color="text.secondary">
                    {" "}
                    ({copy.share(formatMoney(party.share, locale, { showBani: true }))})
                  </Typography>
                )}
              </li>
            ))}
          </Box>
        </dd>
      </Box>
      {consortium && (
        <Typography variant="body2" color="text.secondary">
          {copy.convention}
        </Typography>
      )}
    </Stack>
  );
}
