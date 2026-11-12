import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import type { EntityAliases, EntityOverviewData, EntityRef, EntityRole, RecordResult } from "../../types.ts";
import { AppearsInSeapAs, type AppearsInSeapAsCopy } from "./components/AppearsInSeapAs/index.ts";
import { Consortia, type ConsortiaCopy } from "./components/Consortia/index.ts";
import { Counterparties, type CounterpartiesCopy } from "./components/Counterparties/index.ts";
import { FrameworkLine, type FrameworkLineCopy } from "./components/FrameworkLine/index.ts";
import { HeadlineNumbers, type HeadlineNumbersCopy } from "./components/HeadlineNumbers/index.ts";
import { LargestRecords, type LargestRecordsCopy } from "./components/LargestRecords/index.ts";
import { ProcedureTypes, type ProcedureTypesCopy } from "./components/ProcedureTypes/index.ts";
import { SignalsSection, type SignalsSectionCopy } from "./components/SignalsSection/index.ts";

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
}

/** The Overview tab of an Entity page: headline numbers, Signals, counterparties, procedure types, consortia, the framework line, the largest counted Records and the names SEAP knows the entity by. */
export function EntityOverview({ overview, aliases, role, entityHref, recordHref, methodologyHref, suspectHref, locale, copy, signals }: EntityOverviewProps) {
  return (
    <Stack spacing={4}>
      <HeadlineNumbers overview={overview} locale={locale} copy={copy.headline} methodologyHref={methodologyHref} suspectHref={suspectHref} />
      <SignalsSection count={overview.signals.count} locale={locale} copy={copy.signals}>
        {signals}
      </SignalsSection>
      <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, alignItems: "start" }}>
        <Counterparties counterparties={overview.counterparties} total={overview.total.awarded} role={role} entityHref={entityHref} locale={locale} copy={copy.counterparties} />
        <Stack spacing={4}>
          <ProcedureTypes procedures={overview.procedures} locale={locale} copy={copy.procedures} />
          <Consortia consortia={overview.consortia} entityHref={entityHref} locale={locale} copy={copy.consortia} />
          <FrameworkLine frameworks={overview.frameworks} locale={locale} copy={copy.frameworks} />
        </Stack>
      </Box>
      <LargestRecords records={overview.largestRecords} entityHref={entityHref} recordHref={recordHref} locale={locale} copy={copy.largest} />
      <AppearsInSeapAs aliases={aliases} locale={locale} copy={copy.aliases} />
    </Stack>
  );
}
