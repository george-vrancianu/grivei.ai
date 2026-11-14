import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { color, radius } from "../../../theme/tokens.ts";
import { SectionHeading } from "../../atoms/SectionHeading/index.ts";
import type { OnrcRegistrationData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { AliasList, type AliasListCopy } from "./components/AliasList/index.ts";
import { CaenList, type CaenListCopy } from "./components/CaenList/index.ts";
import { StatusList, type StatusListCopy } from "./components/StatusList/index.ts";

export interface OnrcSectionCopy {
  heading: string;
  registrationNumber: string;
  registrationDate: string;
  /** The newest snapshot is in the legacy layout, which carries no registration date. */
  registrationDateUnknown: string;
  legalForm: string;
  seat: string;
  seatUnknown: string;
  statuses: StatusListCopy;
  caen: CaenListCopy;
  aliases: AliasListCopy;
  /** "Source: ONRC, snapshot of 6 May 2026", given the formatted date. */
  source: (snapshot: string) => string;
  /** Shown when the organisation is in ONRC only (no public purchase names it): its people are not shown. */
  onrcOnly: string;
}

export interface OnrcSectionProps {
  /** `entity.onrc` of `EntityOverview`. */
  registration: OnrcRegistrationData;
  /** The entity is in ONRC only: no SEAP Record names it. */
  onrcOnly: boolean;
  locale: Locale;
  copy: OnrcSectionCopy;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="meta" component="span" color="text.secondary">
        {label}
      </Typography>
      <Typography component="span">{children}</Typography>
    </Stack>
  );
}

/**
 * The ONRC section of an Entity page's Overview: registration number and date, the statuses with the snapshot they were first seen in (and the
 * plain statement that ONRC dates none), the authorised CAEN codes, the registered seat and ONRC's names as aliases. Each fact cites the snapshot it
 * comes from. No person is shown: an organisation that exists only in ONRC never names anyone.
 */
export function OnrcSection({ registration, onrcOnly, locale, copy }: OnrcSectionProps) {
  const seatLine = [registration.seat.address, registration.seat.county].filter(Boolean).join(" · ");
  const snapshot = formatDate(registration.snapshot, locale, "long");
  return (
    <Stack component="section" id="onrc" aria-label={copy.heading} spacing={2} sx={{ p: 2, bgcolor: color.panel, border: `1px solid ${color.line}`, borderRadius: `${radius.card}px` }}>
      <SectionHeading>{copy.heading}</SectionHeading>
      {onrcOnly && (
        <Typography variant="body2" color="text.secondary">
          {copy.onrcOnly}
        </Typography>
      )}
      <Stack direction="row" sx={{ flexWrap: "wrap", rowGap: 1.5, columnGap: 4 }}>
        <Fact label={copy.registrationNumber}>{registration.registrationNumber}</Fact>
        <Fact label={copy.registrationDate}>{registration.registrationDate ? formatDate(registration.registrationDate, locale, "long") : copy.registrationDateUnknown}</Fact>
        {registration.legalForm && <Fact label={copy.legalForm}>{registration.legalForm}</Fact>}
        <Fact label={copy.seat}>{seatLine || copy.seatUnknown}</Fact>
      </Stack>
      <StatusList statuses={registration.statuses} locale={locale} copy={copy.statuses} />
      <CaenList caen={registration.caen} copy={copy.caen} />
      <AliasList aliases={registration.aliases} locale={locale} copy={copy.aliases} />
      <Typography variant="caption" color="text.secondary">
        {registration.provenance.url ? (
          <Link href={registration.provenance.url} target="_blank">
            {copy.source(snapshot)}
          </Link>
        ) : (
          copy.source(snapshot)
        )}
      </Typography>
    </Stack>
  );
}
