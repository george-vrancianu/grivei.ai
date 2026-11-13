import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { withNodes } from "../../../../utils/withNodes.tsx";
import { PartyName, type PartyNameCopy } from "../../../../atoms/PartyName/index.ts";
import type { CountCopy } from "../../../../molecules/TotalFigure/index.ts";
import type { EntityRef, EntityRole, OverviewConsortium } from "../../../../types.ts";
import { listSx } from "../../../../utils/listSx.ts";

export interface ConsortiaCopy {
  heading: string;
  /** The note under the list: each member's share is an equal-share convention, not a published figure. */
  convention: string;
  /** "equal share RON 500,000", given the formatted amount. */
  share: (amount: string) => string;
  /** "1 Record" */
  records: CountCopy;
  party: PartyNameCopy;
}

export interface ConsortiaProps {
  consortia: readonly OverviewConsortium[];
  /** A consortium's members are suppliers: this builds their pages' URLs. */
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  locale: Locale;
  copy: ConsortiaCopy;
}

/** The consortia the entity took part in: the members (a natural person unnamed and unlinked), the contract total and each member's equal share, labelled as a convention. Not shown when there are none. */
export function Consortia({ consortia, entityHref, locale, copy }: ConsortiaProps) {
  if (consortia.length === 0) return null;
  return (
    <Stack component="section" spacing={1} aria-label={copy.heading}>
      <Typography variant="h6" component="h2">
        {copy.heading}
      </Typography>
      <Stack component="ul" sx={listSx}>
        {consortia.map((consortium, index) => (
          <Stack key={index} component="li" spacing={0.5} sx={{ py: 1 }}>
            <Box>
              {consortium.members.map((member, i) => (
                <Box key={member.entity?.key ?? `person-${i}`} component="span">
                  {i > 0 && ", "}
                  <PartyName party={member} entityHref={(entity) => entityHref(entity, "supplier")} copy={copy.party} />
                  {member.share !== null && (
                    <Typography component="span" variant="body2" color="text.secondary">
                      {" "}
                      ({withNodes(copy.share, [<MoneyAmount bani={member.share} locale={locale} />])})
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
            <Typography variant="body2">
              <MoneyAmount bani={consortium.total.awarded} locale={locale} />{" "}
              <Typography component="span" variant="body2" color="text.secondary">
                {copy.records(consortium.total.records, formatCount(consortium.total.records, consortium.total.estimated, locale))}
              </Typography>
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {copy.convention}
      </Typography>
    </Stack>
  );
}
