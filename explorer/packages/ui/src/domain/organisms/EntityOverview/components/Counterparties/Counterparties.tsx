import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { PartyName, type PartyNameCopy } from "../../../../atoms/PartyName/index.ts";
import type { CountCopy } from "../../../../molecules/TotalFigure/index.ts";
import type { Bani, EntityRef, EntityRole, OverviewCounterparties } from "../../../../types.ts";
import { formatPercent } from "../../../../utils/formatPercent.ts";
import { listRowSx, listSx } from "../../../../utils/listSx.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { followLink } from "../../../../utils/followLink.ts";
import { ShareBar } from "../../../../atoms/ShareBar/index.ts";
import { counterpartyRole, shareOfTotal } from "../../entityOverview.utils.ts";

export interface CounterpartiesCopy {
  heading: string;
  /** The panel's header meta: what the shares are of. */
  meta: string;
  /** The foot's link to the graph of all of them ("All 512, as a graph"), given the count and its formatted text. */
  graph: (count: number, formatted: string) => string;
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
  /** The Relationships tab (the graph of every counterparty). Absent, the foot has the "and n more" line only. */
  graphHref?: string | undefined;
  onNavigate?: ((href: string) => void) | undefined;
  locale: Locale;
  copy: CounterpartiesCopy;
}

/**
 * The biggest counterparties, each with a bar for its share of the entity's total and the share as text (the bar is decoration).
 * A natural person is never named and never linked. When there are more counterparties than rows, the panel's foot says how many are left out and links to the graph.
 */
export function Counterparties({ counterparties, total, role, entityHref, graphHref, onNavigate, locale, copy }: CounterpartiesProps) {
  const { rows, count } = counterparties;
  const other = counterpartyRole(role);
  const hidden = count - rows.length;
  return (
    <Panel
      level="h2"
      heading={copy.heading}
      aside={copy.meta}
      flush={rows.length > 0}
      foot={
        hidden > 0 ? (
          <>
            <span>{copy.more(hidden, formatCount(hidden, false, locale))}</span>
            {graphHref !== undefined && (
              <Link href={graphHref} onClick={followLink(graphHref, onNavigate)}>
                {copy.graph(count, formatCount(count, false, locale))}
              </Link>
            )}
          </>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <Typography color="text.secondary">{copy.empty}</Typography>
      ) : (
        <Stack component="ul" sx={listSx}>
          {rows.map((row, index) => {
            const share = shareOfTotal(row.total.awarded, total);
            return (
              <Stack key={row.entity?.key ?? `person-${index}`} component="li" spacing={0.75} sx={listRowSx}>
                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", rowGap: 0.25, columnGap: 1.75 }}>
                  <Typography component="div" sx={{ fontWeight: 600 }}>
                    <PartyName
                      party={{ naturalPerson: row.naturalPerson, publishedName: null, share: null, entity: row.entity }}
                      entityHref={(entity) => entityHref(entity, other)}
                      copy={copy.party}
                    />
                  </Typography>
                  <Typography variant="label" component="span" sx={{ display: "flex", flexWrap: "wrap", columnGap: 1, fontVariantNumeric: "tabular-nums" }}>
                    {share !== null && (
                      <Typography variant="label" component="span" color="text.primary" sx={{ fontWeight: 600 }}>
                        {formatPercent(share, locale)}
                      </Typography>
                    )}
                    <MoneyAmount bani={row.total.awarded} locale={locale} />
                    <Typography variant="label" component="span" color="text.disabled">
                      · {copy.records(row.total.records, formatCount(row.total.records, row.total.estimated, locale))}
                    </Typography>
                  </Typography>
                </Box>
                <ShareBar share={share} />
              </Stack>
            );
          })}
        </Stack>
      )}
    </Panel>
  );
}
