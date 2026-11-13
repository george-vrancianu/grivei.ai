import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { signalKeys } from "../../utils/signalKey.ts";
import type { EntityRef, EntityRole, RecordResult } from "../../types.ts";
import { SignalBadge, type SignalBadgeCopy } from "../SignalBadge/index.ts";
import { MatchedLine, type MatchedLineCopy } from "./components/MatchedLine/index.ts";
import { RecordParties, type RecordPartiesCopy } from "./components/RecordParties/index.ts";
import { RecordValueLine, type RecordValueLineCopy } from "./components/RecordValueLine/index.ts";

export type RecordResultRowCopy = RecordValueLineCopy & RecordPartiesCopy & MatchedLineCopy;

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
}

/**
 * A row of the Records tab: title (linked), the full value (a consortium marker when there is more than one winner),
 * date, badges, authority and winners, and "why it matched" with the matched text highlighted.
 */
export function RecordResultRow({ row, recordHref, entityHref, locale, copy, signalBadges }: RecordResultRowProps) {
  const { record, matchedField } = row;
  const keys = signalKeys(record.signals);
  return (
    <Stack spacing={0.75} component="li" sx={{ py: 1.75 }}>
      <Typography component="div" variant="subtitle1">
        <Link href={recordHref} color="text.primary" underline="hover" sx={{ fontWeight: 500, lineHeight: 1.4, textWrap: "pretty" }}>
          {record.title}
        </Link>
      </Typography>
      <RecordValueLine record={record} locale={locale} copy={copy} />
      {signalBadges && record.signals.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {record.signals.map((signal, i) => (
            <SignalBadge key={keys[i]} signal={signal} href={signalBadges.href(signal)} onNavigate={signalBadges.onNavigate} locale={locale} copy={signalBadges.copy} />
          ))}
        </Stack>
      )}
      <RecordParties record={record} entityHref={entityHref} copy={copy} />
      {matchedField && <MatchedLine matchedField={matchedField} copy={copy} />}
    </Stack>
  );
}
