import { VALUE_BUCKETS, type Channel, type RecordBadge, type RecordFilter, type ValueBucket } from "@grivei/contract";
import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { RECORD_BADGES } from "../../atoms/BadgeChip/index.ts";
import { ActiveChips } from "./components/ActiveChips/index.ts";
import { BadgeChips } from "./components/BadgeChips/index.ts";
import { ChoiceChips } from "./components/ChoiceChips/index.ts";
import { ProcedureChips } from "./components/ProcedureChips/index.ts";
import { SignalsChip } from "./components/SignalsChip/index.ts";
import { YearRange } from "./components/YearRange/index.ts";
import type { FilterChipsCopy } from "./filterChips.types.ts";
import {
  activeChips, clearChips, FIRST_YEAR, procedureChoices, setFromYear, setToYear, toggleBadge, toggleChannel, toggleHasSignals,
  toggleProcedure, toggleValueBucket,
} from "./filterChips.utils.ts";

export type { FilterChipsCopy } from "./filterChips.types.ts";

export interface FilterChipsProps {
  /** The filter to reflect. The component keeps no state of its own. */
  filter: RecordFilter;
  /** The whole next filter. Fields the chips do not own come back as given. */
  onChange: (next: RecordFilter) => void;
  /** Procedure names to offer, as SEAP publishes them (the facet values); any the filter holds are added. */
  procedureOptions: readonly string[];
  /** First year of the year selects; 2021 by default (the bulk data starts there). */
  firstYear?: number;
  /** Last year of the year selects (the current year, or the year the data runs through). */
  lastYear: number;
  locale: Locale;
  copy: FilterChipsCopy;
}

const badgeLabels = (badges: FilterChipsCopy["badges"]["badges"]) =>
  Object.fromEntries(RECORD_BADGES.map((badge) => [badge, badges[badge].label])) as Record<RecordBadge, string>;

const CHANNELS = ["DIRECT_PURCHASE", "CONTRACT"] as const satisfies readonly Channel[];
const BUCKETS = VALUE_BUCKETS.map((edge) => edge.bucket) satisfies ValueBucket[];

/**
 * The chips that narrow the matching set: award-date years, channel, value bucket, has Signals, procedure and the Record
 * badges, with the active ones listed below, each removable. Controlled: it reflects `filter` and reports the next one.
 */
export function FilterChips({ filter, onChange, procedureOptions, firstYear = FIRST_YEAR, lastYear, locale, copy }: FilterChipsProps) {
  const active = activeChips(
    filter,
    {
      from: copy.active.from,
      to: copy.active.to,
      channel: copy.channel.options,
      valueBucket: copy.valueBucket.options,
      hasSignals: copy.signals.has,
      withoutSignals: copy.signals.without,
      badges: badgeLabels(copy.badges.badges),
    },
    locale,
  );
  return (
    <Stack component="section" aria-label={copy.label} spacing={1.5}>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
        <YearRange
          filter={filter}
          firstYear={firstYear}
          lastYear={lastYear}
          onFromYear={(year) => onChange(setFromYear(filter, year))}
          onToYear={(year) => onChange(setToYear(filter, year))}
          copy={copy.year}
        />
        <ChoiceChips
          label={copy.channel.group}
          options={CHANNELS.map((value) => ({ value, label: copy.channel.options[value] }))}
          selected={filter.channel}
          onChoose={(channel) => onChange(toggleChannel(filter, channel))}
        />
        <SignalsChip hasSignals={filter.hasSignals} onToggle={() => onChange(toggleHasSignals(filter))} copy={copy.signals} />
      </Stack>
      <ChoiceChips
        label={copy.valueBucket.group}
        options={BUCKETS.map((value) => ({ value, label: copy.valueBucket.options[value] }))}
        selected={filter.valueBucket}
        onChoose={(bucket) => onChange(toggleValueBucket(filter, bucket))}
      />
      <ProcedureChips
        procedures={procedureChoices(procedureOptions, filter)}
        selected={filter.procedure}
        onToggle={(procedure) => onChange(toggleProcedure(filter, procedure))}
        copy={copy.procedure}
      />
      <BadgeChips label={copy.badges.group} selected={filter.badges} onToggle={(badge) => onChange(toggleBadge(filter, badge))} copy={copy.badges.badges} />
      <ActiveChips chips={active} onRemove={(chip) => onChange(chip.remove(filter))} onClearAll={() => onChange(clearChips(filter))} copy={copy.active} />
    </Stack>
  );
}
