import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { SourceCaption } from "../../molecules/SourceCaption/index.ts";
import type { OnrcRegistrationData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { AliasList, type AliasListCopy } from "./components/AliasList/index.ts";
import { CaenList, type CaenListCopy } from "./components/CaenList/index.ts";
import { InsetFigure } from "../../molecules/InsetFigure/index.ts";
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
  /** The header's right slot, the Source and its snapshot: "trade register · snapshot of 6 May 2026", given the formatted date. */
  aside: (snapshot: string) => string;
  /** "Source: ONRC, snapshot of 6 May 2026", given the formatted date (the foot). */
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
  /** The panel shows its last answer while the next loads: its body is dimmed with `aria-busy="true"`; the header and the foot stay at full strength. */
  busy?: boolean | undefined;
}

/**
 * The ONRC section of an Entity page's Overview: registration number and date, the statuses with the snapshot they were first seen in (and the
 * plain statement that ONRC dates none), the authorised CAEN codes, the registered seat and ONRC's names as aliases. Each fact cites the snapshot it
 * comes from. No person is shown: an organisation that exists only in ONRC never names anyone.
 */
export function OnrcSection({ registration, onrcOnly, locale, copy, busy }: OnrcSectionProps) {
  const seatLine = [registration.seat.address, registration.seat.county].filter(Boolean).join(" · ");
  const snapshot = formatDate(registration.snapshot, locale, "long");
  return (
    <Panel
      id="onrc"
      heading={copy.heading}
      level="h2"
      flush
      busy={busy}
      aside={copy.aside(snapshot)}
      foot={<SourceCaption label={copy.source(snapshot)} url={registration.provenance.url} />}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2 }}>
        {onrcOnly && (
          <Typography variant="body2" color="text.secondary">
            {copy.onrcOnly}
          </Typography>
        )}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <InsetFigure label={copy.registrationNumber}>{registration.registrationNumber}</InsetFigure>
          <InsetFigure label={copy.registrationDate}>{registration.registrationDate ? formatDate(registration.registrationDate, locale, "long") : copy.registrationDateUnknown}</InsetFigure>
          {registration.legalForm && <InsetFigure label={copy.legalForm}>{registration.legalForm}</InsetFigure>}
        </Box>
        <Box component="dl" sx={{ m: 0, display: "flex", flexWrap: "wrap", columnGap: 1.5, rowGap: 0.25 }}>
          <Typography component="dt" variant="meta" color="text.secondary">
            {copy.seat}
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0 }}>
            {seatLine || copy.seatUnknown}
          </Typography>
        </Box>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" } }}>
          <StatusList statuses={registration.statuses} locale={locale} copy={copy.statuses} />
          <CaenList caen={registration.caen} copy={copy.caen} />
        </Box>
      </Box>
      <AliasList aliases={registration.aliases} locale={locale} copy={copy.aliases} />
    </Panel>
  );
}
