import type { ReactNode } from "react";
import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { BUSY_OPACITY } from "../../utils/busy.ts";
import type { EntityAliases, EntityOverviewData, EntityRef, EntityRole, RecordResult } from "../../types.ts";
import { AppearsInSeapAs, type AppearsInSeapAsCopy } from "./components/AppearsInSeapAs/index.ts";
import { Consortia, type ConsortiaCopy } from "./components/Consortia/index.ts";
import { Counterparties, type CounterpartiesCopy } from "./components/Counterparties/index.ts";
import { FrameworkLine, type FrameworkLineCopy } from "./components/FrameworkLine/index.ts";
import { HeadlineNumbers, type HeadlineNumbersCopy } from "./components/HeadlineNumbers/index.ts";
import { LargestRecords, type LargestRecordsCopy } from "./components/LargestRecords/index.ts";
import { ProcedureTypes, type ProcedureTypesCopy } from "./components/ProcedureTypes/index.ts";
import { OverviewColumns } from "./components/OverviewColumns/index.ts";
import { SignalsSection, type SignalsPaging, type SignalsSectionCopy } from "./components/SignalsSection/index.ts";

export interface EntityOverviewCopy {
  headline: HeadlineNumbersCopy;
  signals: SignalsSectionCopy;
  counterparties: CounterpartiesCopy;
  procedures: ProcedureTypesCopy;
  consortia: ConsortiaCopy;
  frameworks: FrameworkLineCopy;
  largest: LargestRecordsCopy;
  aliases: AppearsInSeapAsCopy;
}

export interface EntityOverviewProps {
  /** `entity.seap.role` of `EntityOverview`: every figure follows the filter the query was sent with. */
  overview: EntityOverviewData;
  /** `entity.aliases` of the same query. */
  aliases: EntityAliases;
  /** The page's role; counterparties are linked on the other side. */
  role: EntityRole;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  methodologyHref: string;
  /** Where the suspect Records of this filter are listed (the Total's "left out" line links here). */
  suspectHref: string;
  locale: Locale;
  copy: EntityOverviewCopy;
  /** The Signal cards, rendered under the Signals heading when the count is above zero. The Signal card organism fills this slot. */
  signals?: ReactNode;
  /** The control on the Signals heading's line: the order toggle (by date, by RON). Shown when there are Signals. */
  signalsToolbar?: ReactNode;
  /** The range line ("Signals 1–20 of 72") and the page links under the Signals. */
  signalsPaging?: SignalsPaging;
  /** The Relationships tab's address: the Counterparties foot links to it ("All 512, as a graph"). */
  graphHref?: string;
  /** Called with the href on a plain click on a link of the Overview's own (the graph link), so the app can change page without a load. */
  onNavigate?: (href: string) => void;
  /** The last answer is shown while the next one loads: the figures, bodies and foot strips dim (`BUSY_OPACITY`), the region is `aria-busy`, the headings and header strips stay at full strength. */
  busy?: boolean;
  /** A loading status (`LoadingStatus`), shown at the right end of the Signals heading's line while `busy`. */
  status?: ReactNode;
}

/**
 * The Overview tab of an Entity page: headline numbers (four panels), then two columns of titled panels (left: Signals, Largest Records, Framework agreements; right: Counterparties,
 * Procedure types, Consortia) and the names SEAP knows the entity by. While `busy` it keeps its last answer, dimmed.
 */
export function EntityOverview({ overview, aliases, role, entityHref, recordHref, methodologyHref, suspectHref, locale, copy, signals, signalsToolbar, signalsPaging, graphHref, onNavigate, busy, status }: EntityOverviewProps) {
  return (
    <Stack spacing={3} aria-busy={busy ? true : undefined} sx={busy ? { "& [data-panel-part='body'], & [data-panel-part='foot'], & [data-busy-dim]": { opacity: BUSY_OPACITY } } : undefined}>
      <HeadlineNumbers overview={overview} locale={locale} copy={copy.headline} methodologyHref={methodologyHref} suspectHref={suspectHref} />
      <OverviewColumns
        left={
          <>
            <SignalsSection count={overview.signals.count} locale={locale} copy={copy.signals} toolbar={signalsToolbar} status={busy ? status : undefined} paging={signalsPaging}>
              {signals}
            </SignalsSection>
            <LargestRecords records={overview.largestRecords} entityHref={entityHref} recordHref={recordHref} locale={locale} copy={copy.largest} />
            <FrameworkLine frameworks={overview.frameworks} locale={locale} copy={copy.frameworks} />
          </>
        }
        right={
          <>
            <Counterparties counterparties={overview.counterparties} total={overview.total.awarded} role={role} entityHref={entityHref} graphHref={graphHref} onNavigate={onNavigate} locale={locale} copy={copy.counterparties} />
            <ProcedureTypes procedures={overview.procedures} total={overview.total.awarded} locale={locale} copy={copy.procedures} />
            <Consortia consortia={overview.consortia} entityHref={entityHref} locale={locale} copy={copy.consortia} />
          </>
        }
      />
      <AppearsInSeapAs aliases={aliases} locale={locale} copy={copy.aliases} />
    </Stack>
  );
}
