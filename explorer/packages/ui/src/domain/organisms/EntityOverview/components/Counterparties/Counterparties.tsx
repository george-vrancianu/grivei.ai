import { Box } from "../../../../../atoms/Box/index.ts";
import { LinearProgress } from "../../../../../atoms/LinearProgress/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { PartyName, type PartyNameCopy } from "../../../../atoms/PartyName/index.ts";
import type { CountCopy } from "../../../../molecules/TotalFigure/index.ts";
import type { Bani, EntityRef, EntityRole, OverviewCounterparties } from "../../../../types.ts";
import { formatPercent } from "../../../../utils/formatPercent.ts";
import { listSx } from "../../../../utils/listSx.ts";
import { counterpartyRole, shareOfTotal } from "../../entityOverview.utils.ts";

export interface CounterpartiesCopy {
  heading: string;
  /** "3 Records" */
  records: CountCopy;
  /** "and 212 more", given the number and its formatted text. */
  more: CountCopy;
  empty: string;
  /** Natural persons are labelled, never named (ADR 0003); entity links carry the name-only marker. */
  party: PartyNameCopy;
}

export interface CounterpartiesProps {
  counterparties: OverviewCounterparties;
  /** The entity's own total awarded: each bar is a counterparty's share of it. */
  total: Bani;
  /** The page's role; the counterparties are on the other side. */
  role: EntityRole;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  locale: Locale;
  copy: CounterpartiesCopy;
}

/**
 * The biggest counterparties, each with a bar for its share of the entity's total and the share as text (the bar is decoration).
 * A natural person is never named and never linked. When there are more counterparties than rows, a line says how many are left out.
 */
export function Counterparties({ counterparties, total, role, entityHref, locale, copy }: CounterpartiesProps) {
  const { rows, count } = counterparties;
  const other = counterpartyRole(role);
  const hidden = count - rows.length;
  return (
    <Stack component="section" spacing={1} aria-label={copy.heading}>
      <Typography variant="h6" component="h2">
        {copy.heading}
      </Typography>
      {rows.length === 0 ? (
        <Typography color="text.secondary">{copy.empty}</Typography>
      ) : (
        <Stack component="ul" sx={listSx}>
          {rows.map((row, index) => {
            const share = shareOfTotal(row.total.awarded, total);
            return (
              <Stack key={row.entity?.key ?? `person-${index}`} component="li" spacing={0.5} sx={{ py: 1 }}>
                <Typography>
                  <PartyName
                    party={{ naturalPerson: row.naturalPerson, publishedName: null, share: null, entity: row.entity }}
                    entityHref={(entity) => entityHref(entity, other)}
                    copy={copy.party}
                  />
                </Typography>
                {share !== null && <LinearProgress variant="determinate" value={share * 100} aria-hidden="true" sx={{ height: 6, borderRadius: 3 }} />}
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "baseline" }}>
                  {share !== null && (
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatPercent(share, locale)}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <MoneyAmount bani={row.total.awarded} locale={locale} />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {copy.records(row.total.records, formatCount(row.total.records, row.total.estimated, locale))}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Stack>
      )}
      {hidden > 0 && (
        <Typography variant="body2" color="text.secondary">
          {copy.more(hidden, formatCount(hidden, false, locale))}
        </Typography>
      )}
    </Stack>
  );
}
