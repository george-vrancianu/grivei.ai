import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import type { RecordResultRowCopy } from "../../molecules/RecordResultRow/index.ts";
import type { EntityRef, EntityRole, RecordPageData } from "../../types.ts";
import { BadgeExplanations, type BadgeExplanationsCopy } from "./components/BadgeExplanations/index.ts";
import { FrameworkSection, type FrameworkSectionCopy } from "./components/FrameworkSection/index.ts";
import { PartiesSection, type PartiesSectionCopy } from "./components/PartiesSection/index.ts";
import { ProvenanceSection, type ProvenanceSectionCopy } from "./components/ProvenanceSection/index.ts";
import { RecordHeading, type RecordHeadingCopy } from "./components/RecordHeading/index.ts";
import { SignalsSection, type SignalsSectionCopy } from "./components/SignalsSection/index.ts";
import { SuspectNote, type SuspectNoteCopy } from "./components/SuspectNote/index.ts";
import { ValueFacts, type ValueFactsCopy } from "./components/ValueFacts/index.ts";

export interface RecordDetailCopy {
  heading: RecordHeadingCopy;
  value: ValueFactsCopy;
  parties: Omit<PartiesSectionCopy, "party">;
  suspect: SuspectNoteCopy;
  framework: FrameworkSectionCopy;
  badges: BadgeExplanationsCopy;
  signals: SignalsSectionCopy;
  provenance: ProvenanceSectionCopy;
  /** The Record row's copy (badges, party names, labels): the subsequent contracts list uses the rows of the Records tab. */
  recordRow: RecordResultRowCopy;
}

export interface RecordDetailProps {
  /** `RecordPage`'s `seap.record`. */
  record: RecordPageData;
  /** The entity page's URL for the authority or a winner's Entity. The caller owns routing (language prefix). */
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  /** A Record page's URL, for the framework agreement, the subsequent contracts and a Signal's Records. */
  recordHref: (code: string) => string;
  methodologyHref: string;
  /** Called with the href on a plain click on a link of this page, so the app can change page without a load. */
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: RecordDetailCopy;
}

/**
 * The content of a Record page: the title, the value as published beside the counted value (and why a counted value is empty),
 * date, kind, procedure, contract type, CPV, the authority and every winner (consortium shares labelled as a convention),
 * the suspect rule, the framework line and its subsequent contracts, every badge with its explanation, the Signals it belongs to,
 * and where it came from with the "Check in SEAP" link. Presentational: it fetches nothing and knows no router.
 */
export function RecordDetail({ record, entityHref, recordHref, methodologyHref, onNavigate, locale, copy }: RecordDetailProps) {
  return (
    <Stack component="article" spacing={3}>
      <RecordHeading record={record} locale={locale} copy={copy.heading} />
      <ValueFacts record={record} locale={locale} copy={copy.value} />
      {record.suspect && <SuspectNote suspect={record.suspect} methodologyHref={methodologyHref} onNavigate={onNavigate} locale={locale} copy={copy.suspect} />}
      <PartiesSection record={record} entityHref={entityHref} locale={locale} copy={{ ...copy.parties, party: copy.recordRow.party }} />
      {record.framework && (
        <FrameworkSection
          framework={record.framework}
          entityHref={entityHref}
          recordHref={recordHref}
          onNavigate={onNavigate}
          locale={locale}
          copy={{ ...copy.framework, recordRow: copy.recordRow }}
        />
      )}
      <BadgeExplanations badges={record.badges} copy={{ ...copy.badges, badges: copy.recordRow.badges }} />
      <SignalsSection signals={record.signals} recordHref={recordHref} onNavigate={onNavigate} locale={locale} copy={copy.signals} />
      <ProvenanceSection provenance={record.provenance} locale={locale} copy={copy.provenance} />
    </Stack>
  );
}
