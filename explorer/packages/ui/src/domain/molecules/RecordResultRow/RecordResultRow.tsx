import { Box } from "../../../atoms/Box/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { signalKeys } from "../../utils/signalKey.ts";
import type { EntityRef, EntityRole, RecordResult } from "../../types.ts";
import { SignalBadge, type SignalBadgeCopy } from "../SignalBadge/index.ts";
import { MatchedLine, type MatchedLineCopy } from "./components/MatchedLine/index.ts";
import { RecordParties, type RecordPartiesCopy } from "./components/RecordParties/index.ts";
import { RecordBadges, type RecordBadgesCopy } from "./components/RecordBadges/index.ts";
import { RecordMetaLine, type RecordMetaLineCopy } from "./components/RecordMetaLine/index.ts";
import { RecordValue, type RecordValueCopy } from "./components/RecordValue/index.ts";

export type RecordResultRowCopy = RecordMetaLineCopy & RecordValueCopy & RecordBadgesCopy & RecordPartiesCopy & MatchedLineCopy;

/** How a row shows the Signals its Record is in: one compact badge each, linking to the Signal's reproducing Records list. Without it a row shows none. */
export interface RecordSignalBadges {
  /** The Signal's reproducing URL (the app builds it from `signal.reproduce`). */
  href: (signal: RecordResult["record"]["signals"][number]) => string;
  onNavigate?: ((href: string) => void) | undefined;
  copy: SignalBadgeCopy;
}

export interface RecordResultRowProps {
  row: RecordResult;
  /** The Record page's URL, built by the caller. */
  recordHref: string;
  /** The entity page's URL for an authority or a winner, built by the caller. */
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  locale: Locale;
  copy: RecordResultRowCopy;
  signalBadges?: RecordSignalBadges | undefined;
  /** A line under the value's caption (the in-county share of a consortium Record, #103). */
  valueExtra?: React.ReactNode;
}

/**
 * A row of the Records tab, two columns. Left: the meta line (channel tag, code, date, procedure), the title (linked), "matched in ...",
 * authority and winners, then the badges and Signal badges. Right: the full value over its caption (`RecordValue`; it takes children,
 * the slot under the caption for the in-county share line, #103). The right column wraps under the left one on a narrow screen.
 */
export function RecordResultRow({ row, recordHref, entityHref, locale, copy, signalBadges, valueExtra }: RecordResultRowProps) {
  const { record, matchedField } = row;
  const keys = signalKeys(record.signals);
  const signals = signalBadges
    ? record.signals.map((signal, i) => (
        <SignalBadge key={keys[i]} signal={signal} href={signalBadges.href(signal)} onNavigate={signalBadges.onNavigate} locale={locale} copy={signalBadges.copy} />
      ))
    : [];
  return (
    <Box component="li" sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "8px 20px", py: 1.75 }}>
      <Stack spacing={0.75} sx={{ flex: "1 1 320px", minWidth: 0 }}>
        <RecordMetaLine record={record} locale={locale} copy={copy} />
        <Typography component="div" variant="subtitle1">
          <Link href={recordHref} color="text.primary" underline="hover" sx={{ fontWeight: 500, lineHeight: 1.4, textWrap: "pretty" }}>
            {record.title}
          </Link>
        </Typography>
        {matchedField && <MatchedLine matchedField={matchedField} copy={copy} />}
        <RecordParties record={record} entityHref={entityHref} copy={copy} />
        <RecordBadges record={record} copy={copy}>
          {signals.length > 0 ? signals : null}
        </RecordBadges>
      </Stack>
      <RecordValue record={record} locale={locale} copy={copy}>
        {valueExtra}
      </RecordValue>
    </Box>
  );
}
