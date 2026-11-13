import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { EntityLink, type EntityLinkCopy } from "../../atoms/EntityLink/index.ts";
import { MoneyAmount } from "../../atoms/MoneyAmount/index.ts";
import type { EntityResult } from "../../types.ts";
import { placeLabel } from "./entityResultRow.utils.ts";

export interface EntityResultRowCopy {
  /** The caption under the amount: "matched" / "potrivit". */
  matched: string;
  /** The label before an entity's CUI in the meta line: "CUI". */
  cui: string;
  /** "n Records" with the language's plural rule; `formatted` is the count in the locale's number format. */
  records: (n: number, formatted: string) => string;
  /** Shown when an entity has no county: it is national, or no source places it. */
  national: string;
  noCounty: string;
  entityLink: EntityLinkCopy;
}

export interface EntityResultRowProps {
  /** A chip or line between the name block and the value (the Signals chip, #104). */
  extra?: React.ReactNode;
  row: EntityResult;
  /** The entity page's URL, built by the caller (role and language prefix). */
  href: string;
  locale: Locale;
  copy: EntityResultRowCopy;
}

/**
 * A row of the Authorities or Suppliers tab, two columns. Left: the entity's name (linked) over a mono meta line, "n Records · county · CUI n"
 * (the CUI only for an entity identified by one). Right: the matched amount over its caption. `extra` sits between them: the slot for #104's chip.
 */
export function EntityResultRow({ row, href, locale, copy, extra }: EntityResultRowProps) {
  const { entity, matched } = row;
  const count = formatCount(matched.records, false, locale);
  const meta = [copy.records(matched.records, count), placeLabel(entity.placement, copy), ...(entity.identity === "CUI" ? [`${copy.cui} ${entity.key}`] : [])];
  return (
    <Box component="li" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 16px", py: 1.5 }}>
      <Stack spacing={0.25} sx={{ flex: "1 1 240px", minWidth: 0 }}>
        <Typography component="div" variant="subtitle1" sx={{ fontWeight: 600 }}>
          <EntityLink entity={entity} href={href} copy={copy.entityLink} />
        </Typography>
        <Typography component="div" variant="caption">
          {meta.join(" · ")}
        </Typography>
      </Stack>
      {extra}
      <Stack spacing={0.25} sx={{ alignItems: "flex-end", flex: "none", ml: "auto", textAlign: "right" }}>
        <Typography component="span" variant="body1" sx={{ fontWeight: 600 }}>
          <MoneyAmount bani={matched.awarded} locale={locale} />
        </Typography>
        <Typography component="span" variant="caption">
          {copy.matched}
        </Typography>
      </Stack>
    </Box>
  );
}
