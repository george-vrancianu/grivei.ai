import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { EntityLink, type EntityLinkCopy } from "../../atoms/EntityLink/index.ts";
import { MoneyAmount } from "../../atoms/MoneyAmount/index.ts";
import type { EntityResult } from "../../types.ts";
import { placeLabel } from "./entityResultRow.utils.ts";

export interface EntityResultRowCopy {
  /** The word after the amount: "matched" / "potrivit". */
  matched: string;
  /** "n Records" with the language's plural rule; `formatted` is the count in the locale's number format. */
  records: (n: number, formatted: string) => string;
  /** Shown when an entity has no county: it is national, or no source places it. */
  national: string;
  noCounty: string;
  entityLink: EntityLinkCopy;
}

export interface EntityResultRowProps {
  row: EntityResult;
  /** The entity page's URL, built by the caller (role and language prefix). */
  href: string;
  locale: Locale;
  copy: EntityResultRowCopy;
}

/** A row of the Authorities or Suppliers tab: the entity's name (linked), then "RON matched · n Records · county". */
export function EntityResultRow({ row, href, locale, copy }: EntityResultRowProps) {
  const { entity, matched } = row;
  const count = formatCount(matched.records, false, locale);
  return (
    <Stack spacing={0.25} component="li" sx={{ py: 1 }}>
      <Typography component="div" variant="subtitle1">
        <EntityLink entity={entity} href={href} copy={copy.entityLink} />
      </Typography>
      <Typography component="div" variant="body2" color="text.secondary">
        <MoneyAmount bani={matched.awarded} locale={locale} /> {copy.matched} · {copy.records(matched.records, count)} ·{" "}
        {placeLabel(entity.placement, copy)}
      </Typography>
    </Stack>
  );
}
