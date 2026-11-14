import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { layout } from "../../../theme/tokens.ts";
import { pageSx } from "../../utils/pageSx.ts";
import type { CiteLineCopy } from "../../molecules/CiteLine/index.ts";
import type { RecordResultRowCopy } from "../../molecules/RecordResultRow/index.ts";
import type { EntityRef, EntityRole, RecordPageData, RecordSignal } from "../../types.ts";
import { BadgeExplanations, type BadgeExplanationsCopy } from "./components/BadgeExplanations/index.ts";
import { FrameworkLine, type FrameworkLineCopy } from "./components/FrameworkLine/index.ts";
import { FrameworkSection, type FrameworkSectionCopy } from "./components/FrameworkSection/index.ts";
import { PartySection, type PartySectionCopy } from "./components/PartySection/index.ts";
import { RecordActions } from "./components/RecordActions/index.ts";
import { RecordFacts } from "./components/RecordFacts/index.ts";
import { WinnersSection, type WinnersSectionCopy } from "./components/WinnersSection/index.ts";
import { ProvenanceSection, type ProvenanceSectionCopy } from "./components/ProvenanceSection/index.ts";
import { RecordHeading, type RecordHeadingCopy } from "./components/RecordHeading/index.ts";
import { SignalsSection, type SignalsSectionCopy } from "./components/SignalsSection/index.ts";
import { SuspectNote, type SuspectNoteCopy } from "./components/SuspectNote/index.ts";
import { ValueFacts, type ValueFactsCopy } from "./components/ValueFacts/index.ts";

export interface RecordDetailCopy {
  heading: RecordHeadingCopy;
  value: ValueFactsCopy;
  /** The authority's row label, and the winners' section. */
  parties: { authority: string } & Omit<WinnersSectionCopy, "party">;
  suspect: SuspectNoteCopy;
  framework: FrameworkSectionCopy & FrameworkLineCopy;
  badges: BadgeExplanationsCopy;
  signals: SignalsSectionCopy;
  provenance: ProvenanceSectionCopy;
  /** The Party section (#180). */
  party: PartySectionCopy;
  /** The Record's citable URL line: its name and the copy button's texts. */
  cite: CiteLineCopy;
  /** The Record row's copy (badges, party names, labels): the subsequent contracts list uses the rows of the Records tab. */
  recordRow: RecordResultRowCopy;
}

export interface RecordDetailProps {
  /** `RecordPage`'s `seap.record`. */
  record: RecordPageData;
  /** The Record's citable URL, scheme included (the caller knows the host and the language prefix): shown without the scheme and copied whole. */
  citeUrl: string;
  /** The entity page's URL for the authority or a winner's Entity. The caller owns routing (language prefix). */
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  /** The entity page of the authority a subordinate body's Party is inherited through. */
  authorityHref?: ((key: string) => string) | undefined;
  /** A Record page's URL, for the framework agreement, the subsequent contracts and a Signal's Records. */
  recordHref: (code: string) => string;
  methodologyHref: string;
  /** Called with the href on a plain click on a link of this page, so the app can change page without a load. */
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: RecordDetailCopy;
  /** The Signal card of one of the Record's Signals; absent = a minimal entry (label, date, Records). */
  renderSignalCard?: ((signal: RecordSignal) => ReactNode) | undefined;
}

/**
 * A Record page (A · Graf): over the title the channel, code and caveat badges; under it the primary "Check in SEAP" button and the citable URL
 * with its copy button. Then the main column (the value card with the framework line and its bar, the subsequent contracts, the winners with
 * consortium shares labelled as a convention) beside a column of panels (the Record's facts, every badge explained, its Signals, where it came from)
 * that stacks under the main column below the medium breakpoint. The page owns its width and gutter. Presentational: it fetches nothing and knows no router.
 */
export function RecordDetail({ record, citeUrl, entityHref, authorityHref, recordHref, methodologyHref, onNavigate, locale, copy, renderSignalCard }: RecordDetailProps) {
  const valueCard = (
    <ValueFacts record={record} locale={locale} copy={{ ...copy.value, ceilingCaption: copy.recordRow.valueCaption.ceiling }}>
      {record.framework && <FrameworkLine framework={record.framework} recordHref={recordHref} onNavigate={onNavigate} locale={locale} copy={copy.framework} />}
    </ValueFacts>
  );
  return (
    <Stack component="main" spacing={3} sx={pageSx}>
      <RecordHeading record={record} copy={{ ...copy.heading, badges: copy.recordRow.badges, channel: copy.recordRow.channel }}>
        <RecordActions provenance={record.provenance} citeUrl={citeUrl} copy={{ checkIn: copy.provenance.checkIn, cite: copy.cite }} />
      </RecordHeading>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: `minmax(0, 1fr) ${layout.sideColumn}px` },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          {record.framework ? (
            <FrameworkSection framework={record.framework} entityHref={entityHref} recordHref={recordHref} locale={locale} copy={{ ...copy.framework, recordRow: copy.recordRow }}>
              {valueCard}
            </FrameworkSection>
          ) : (
            valueCard
          )}
          {record.suspect && <SuspectNote suspect={record.suspect} methodologyHref={methodologyHref} onNavigate={onNavigate} locale={locale} copy={copy.suspect} />}
          {record.party && <PartySection party={record.party} authorityHref={authorityHref} onNavigate={onNavigate} locale={locale} copy={copy.party} />}
          <WinnersSection record={record} entityHref={entityHref} locale={locale} copy={{ ...copy.parties, party: copy.recordRow.party }} onNavigate={onNavigate} />
        </Stack>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <RecordFacts
            record={record}
            entityHref={entityHref}
            locale={locale}
            copy={{ heading: copy.heading.panel, kinds: copy.heading.kinds, facets: copy.heading.facets, authority: copy.parties.authority, entityLink: copy.recordRow.party.entityLink }}
            onNavigate={onNavigate}
          />
          <BadgeExplanations badges={record.badges} copy={{ ...copy.badges, badges: copy.recordRow.badges }} />
          <SignalsSection signals={record.signals} recordHref={recordHref} onNavigate={onNavigate} renderCard={renderSignalCard} locale={locale} copy={copy.signals} />
          <ProvenanceSection provenance={record.provenance} locale={locale} copy={copy.provenance} />
        </Stack>
      </Box>
    </Stack>
  );
}
