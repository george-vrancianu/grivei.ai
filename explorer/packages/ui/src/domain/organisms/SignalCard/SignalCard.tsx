import { Card } from "../../../atoms/Card/index.ts";
import { CardContent } from "../../../atoms/CardContent/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import type { EntityRef, EntityRole, SignalData } from "../../types.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import type { SignalBadgeCopy } from "../../molecules/SignalBadge/index.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { signalSentenceNodes } from "../../utils/signalSentenceNodes.tsx";
import { SignalLinks, type SignalLinksCopy } from "./components/SignalLinks/index.ts";
import { SignalParties, type SignalPartiesCopy } from "./components/SignalParties/index.ts";

export interface SignalCardCopy extends SignalBadgeCopy {
  /** "Dated 19 July 2024": the date of the Signal's latest Record (a Signal is dated by its latest Record, not by a start). */
  date: (when: string) => string;
  /** "2 Records", given the count and its formatted number. */
  records: (n: number, formatted: string) => string;
  parties: SignalPartiesCopy;
  links: SignalLinksCopy;
}

export interface SignalCardProps {
  signal: SignalData;
  /** The Records-tab URL that reproduces the Signal (built by the app from `signal.reproduce`). */
  reproduceHref: string;
  /** The methodology section of the Signal's rule. */
  methodologyHref: string;
  /** The one Record's page in SEAP when the Signal has exactly one Record; otherwise null or absent (the card then says to check each). */
  seapHref?: string | null;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: SignalCardCopy;
}

/**
 * A Signal: a set of Records matched by one rule, stated neutrally. The rule's label, one sentence with the numbers filled in, one line on
 * the lawful explanations, the date and number of Records, who is named, and the ways to check it (the Records themselves, SEAP, the
 * methodology). It never shows a score or a rank.
 */
export function SignalCard({ signal, reproduceHref, methodologyHref, seapHref, entityHref, onNavigate, locale, copy }: SignalCardProps) {
  const rule = copy.rules[signal.rule];
  return (
    <Card variant="outlined" component="article" aria-label={rule.label}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="h6" component="h3">
            {rule.label}
          </Typography>
          <Typography>{signalSentenceNodes(signal, locale, copy.rules)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {rule.lawful}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {copy.date(formatDate(signal.date, locale, "long"))} · {copy.records(signal.recordCount, formatCount(signal.recordCount, false, locale))}
          </Typography>
          <SignalParties authority={signal.authority} suppliers={signal.suppliers} entityHref={entityHref} locale={locale} copy={copy.parties} />
          <SignalLinks
            recordCount={signal.recordCount}
            reproduceHref={reproduceHref}
            methodologyHref={methodologyHref}
            seapHref={seapHref}
            onNavigate={onNavigate}
            locale={locale}
            copy={copy.links}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
