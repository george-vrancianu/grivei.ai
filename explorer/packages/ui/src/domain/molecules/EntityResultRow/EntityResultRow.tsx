import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { color } from "../../../theme/tokens.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { EntityLink, type EntityLinkCopy } from "../../atoms/EntityLink/index.ts";
import { MoneyAmount } from "../../atoms/MoneyAmount/index.ts";
import { SIGNALS_ANCHOR } from "../../utils/signalsAnchor.ts";
import type { EntityResult } from "../../types.ts";
import { SignalCountChip, type SignalCountChipCopy } from "../SignalCountChip/index.ts";
import { AMOUNT_COLUMN, ROW_BLEED, SIGNALS_COLUMN } from "./entityResultRow.columns.ts";
import { visuallyHidden } from "../../utils/visuallyHidden.ts";
import { placeLabel } from "./entityResultRow.utils.ts";

export interface EntityResultRowCopy {
  /** The caption under the amount: "matched" / "potrivit". It shows per row below 600 px; from 600 px up the column head replaces it and it stays for screen readers only. */
  matched: string;
  /** The column head's labels (from 600 px up). */
  head: { supplier: string; authority: string; signals: string; amount: string };
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
  /** A plain click on the entity link or the Signals chip goes here instead of loading the page. */
  onNavigate?: ((href: string) => void) | undefined;
}

/**
 * A row of the Authorities or Suppliers tab. Left: the entity's name (linked) over a mono meta line, "n Records · county · CUI n" (the CUI only for an entity identified by one). Right, a fixed pair of columns under the list's column head: Signals (136 px, the "n Signals" chip left-aligned, empty when `signalCount` is 0; `SignalCountChip` links to the entity page's Signals section, `href` + `#signals`) and the matched amount (150 px, right-aligned). The row itself is not a link, so the chip is not nested in one.
 * Below 600 px the head is hidden and the pair wraps under the name, left-aligned, with the "matched" caption under the amount; from 600 px up the caption is visually hidden but stays in the accessible text.
 */
export function EntityResultRow({ row, href, locale, copy, onNavigate }: EntityResultRowProps) {
  const { entity, matched, signalCount } = row;
  const count = formatCount(matched.records, false, locale);
  const meta = [copy.records(matched.records, count), placeLabel(entity.placement, copy), ...(entity.identity === "CUI" ? [`${copy.cui} ${entity.key}`] : [])];
  return (
    <Box
      component="li"
      sx={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", rowGap: 0.75, columnGap: 2, py: 1.5, mx: -ROW_BLEED, px: ROW_BLEED, "&:hover": { backgroundColor: color.raised } }}
    >
      <Stack spacing={0.25} sx={{ flex: { xs: "1 1 100%", sm: "1 1 240px" }, minWidth: 0 }}>
        <Typography component="div" variant="subtitle1" sx={{ fontWeight: 600 }}>
          <EntityLink entity={entity} href={href} copy={copy.entityLink} onNavigate={onNavigate} />
        </Typography>
        <Typography component="div" variant="caption">
          {meta.join(" · ")}
        </Typography>
      </Stack>
      <Box sx={{ display: "flex", alignItems: "center", columnGap: { xs: signalCount > 0 ? 2 : 0, sm: 2 }, flex: "none" }}>
        <Box sx={{ width: { xs: "auto", sm: SIGNALS_COLUMN }, flex: "none" }}>
          {signalCount > 0 && <SignalCountChip count={signalCount} href={`${href}#${SIGNALS_ANCHOR}`} entityName={entity.displayName} locale={locale} copy={copy.signals} onNavigate={onNavigate} />}
        </Box>
        <Stack spacing={0.25} sx={{ width: { xs: "auto", sm: AMOUNT_COLUMN }, flex: "none", textAlign: { xs: "left", sm: "right" } }}>
          <Typography component="span" variant="body1" sx={{ fontWeight: 600 }}>
            <MoneyAmount bani={matched.awarded} locale={locale} />
          </Typography>
          <Typography component="span" variant="caption" sx={{ ...visuallyHidden, position: { xs: "static", sm: "absolute" }, width: { xs: "auto", sm: "1px" }, height: { xs: "auto", sm: "1px" }, overflow: { xs: "visible", sm: "hidden" }, clip: { xs: "auto", sm: "rect(0 0 0 0)" }, whiteSpace: { xs: "normal", sm: "nowrap" } }}>
            {copy.matched}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
