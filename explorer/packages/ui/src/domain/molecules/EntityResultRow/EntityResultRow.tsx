import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { EntityLink, type EntityLinkCopy } from "../../atoms/EntityLink/index.ts";
import { MoneyAmount } from "../../atoms/MoneyAmount/index.ts";
import { SIGNALS_ANCHOR } from "../../utils/signalsAnchor.ts";
import type { EntityResult } from "../../types.ts";
import { SignalCountChip, type SignalCountChipCopy } from "../SignalCountChip/index.ts";
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
  /** The "n Signals" chip (#104). */
  signals: SignalCountChipCopy;
}

export interface EntityResultRowProps {
  row: EntityResult;
  /** The entity page's URL, built by the caller (role and language prefix). */
  href: string;
  locale: Locale;
  copy: EntityResultRowCopy;
}

/**
 * A row of the Authorities or Suppliers tab, two columns. Left: the entity's name (linked) over a mono meta line, "n Records · county · CUI n"
 * (the CUI only for an entity identified by one). Right: the matched amount over its caption. Between them, an entity with Signals in the filter (`signalCount` above 0) has the "n Signals" chip (`SignalCountChip`), a link to the entity page's Signals section (`href` + `#signals`, the Overview's anchor); the row itself is not a link, so the chip is not nested in one.
 */
export function EntityResultRow({ row, href, locale, copy }: EntityResultRowProps) {
  const { entity, matched, signalCount } = row;
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
      {signalCount > 0 && <SignalCountChip count={signalCount} href={`${href}#${SIGNALS_ANCHOR}`} entityName={entity.displayName} locale={locale} copy={copy.signals} />}
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
