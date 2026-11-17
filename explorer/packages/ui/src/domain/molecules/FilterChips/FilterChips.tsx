import { VALUE_BUCKETS, type Channel, type RecordBadge, type RecordFilter, type ValueBucket } from "@grivei/contract";
import { Box } from "../../../atoms/Box/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { FilterStrip } from "../FilterStrip/index.ts";
import { RECORD_BADGES } from "../../atoms/BadgeChip/index.ts";
import { ActiveChips } from "./components/ActiveChips/index.ts";
import { BadgeMenu } from "./components/BadgeMenu/index.ts";
import { ChoiceMenu } from "../ChoiceMenu/index.ts";
import { PartyMenu } from "./components/PartyMenu/index.ts";
import { ProcedureMenu } from "./components/ProcedureMenu/index.ts";
import { FilterBarRow } from "../FilterBarRow/index.ts";
import { FilterBarDivider } from "../FilterBarDivider/index.ts";
import { HasSignalsChip } from "./components/HasSignalsChip/index.ts";
import { YearMenu } from "./components/YearMenu/index.ts";
import type { FilterChipsCopy } from "./filterChips.types.ts";
import {
  activeChips, clearChips, FIRST_YEAR, procedureChoices, setFromYear, setToYear, toggleBadge, toggleChannel, toggleHasSignals,
  setParty, toggleProcedure, toggleValueBucket,
} from "./filterChips.utils.ts";

export type { FilterChipsCopy } from "./filterChips.types.ts";

export interface FilterChipsProps {
  /** The filter to reflect. The component keeps no state of its own. */
  filter: RecordFilter;
  /** The whole next filter. Fields the chips do not own come back as given. */
  onChange: (next: RecordFilter) => void;
  /** Procedure names to offer, as SEAP publishes them (the facet values); any the filter holds are added. */
  procedureOptions?: readonly string[];
  /**
   * The lists the Party filter offers, as registered at the election (#181). The control is shown when there are any or the filter holds one;
   * a graph built without AEP's mandates offers none, and the chip is simply absent.
   */
  partyOptions?: readonly string[];
  /** First year of the year selects; 2021 by default (the bulk data starts there). */
  firstYear?: number;
  /** Last year of the year selects (the current year, or the year the data runs through). */
  lastYear?: number;
  /** The name the page shows for the filter's `county` ("Brașov"); the code is shown when absent. The county chip appears whenever the filter holds a county. */
  countyName?: string;
  /** Show the filter menus (default). `false` shows only the active chips, each removable, with Clear all: the full-results page, which sets no facet. */
  menus?: boolean;
  locale: Locale;
  copy: FilterChipsCopy;
}

const badgeLabels = (badges: FilterChipsCopy["badges"]["badges"]) =>
  Object.fromEntries(RECORD_BADGES.map((badge) => [badge, badges[badge].label])) as Record<RecordBadge, string>;

const CHANNELS = ["DIRECT_PURCHASE", "CONTRACT"] as const satisfies readonly Channel[];
const BUCKETS = VALUE_BUCKETS.map((edge) => edge.bucket) satisfies ValueBucket[];

/**
 * The filter bar (or, with `menus={false}`, only the active chips: the full-results page): the Signals toggle, then the menus (award-date years, channel, value bucket, procedure, Record badges and, when offered, party),
 * with the active ones listed below as chips, each removable (the map-picked county among them: removing it unsets `county` and `uat`; Clear all does too). Controlled: it reflects `filter` and reports the next one.
 */
export function FilterChips({ filter, onChange, procedureOptions = [], partyOptions = [], firstYear = FIRST_YEAR, lastYear = new Date().getFullYear(), countyName, menus = true, locale, copy }: FilterChipsProps) {
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
      party: copy.active.party,
      county: copy.active.county,
    },
    locale,
    countyName,
  );
  // Chips only and none on: nothing to show, and no empty "Filters" region.
  if (!menus && active.length === 0) return null;
  return (
    <Box component="section" aria-label={copy.label}>
      {menus && (
        <FilterStrip>
          <FilterBarRow>
            <HasSignalsChip hasSignals={filter.hasSignals} onToggle={() => onChange(toggleHasSignals(filter))} copy={copy.signals} />
            <FilterBarDivider />
            <YearMenu
              filter={filter}
              firstYear={firstYear}
              lastYear={lastYear}
              onFromYear={(year) => onChange(setFromYear(filter, year))}
              onToYear={(year) => onChange(setToYear(filter, year))}
              copy={copy.year}
              unsetLabel={copy.menuAny}
            />
            <ChoiceMenu
              label={copy.channel.group}
              unsetLabel={copy.menuAny}
              options={CHANNELS.map((value) => ({ value, label: copy.channel.options[value] }))}
              selected={filter.channel}
              onChoose={(channel) => onChange(toggleChannel(filter, channel))}
            />
            <ChoiceMenu
              label={copy.valueBucket.group}
              unsetLabel={copy.menuAny}
              options={BUCKETS.map((value) => ({ value, label: copy.valueBucket.options[value] }))}
              selected={filter.valueBucket}
              onChoose={(bucket) => onChange(toggleValueBucket(filter, bucket))}
            />
            <ProcedureMenu
              procedures={procedureChoices(procedureOptions, filter)}
              selected={filter.procedure}
              onToggle={(procedure) => onChange(toggleProcedure(filter, procedure))}
              copy={copy.procedure}
              unsetLabel={copy.menuAny}
              picked={copy.picked}
            />
            <BadgeMenu
              label={copy.badges.menu}
              selected={filter.badges}
              onToggle={(badge) => onChange(toggleBadge(filter, badge))}
              copy={copy.badges.badges}
              unsetLabel={copy.menuAny}
              picked={copy.picked}
            />
            {(partyOptions.length > 0 || filter.party) && (
              <PartyMenu parties={partyOptions} selected={filter.party} onChoose={(party) => onChange(setParty(filter, party))} copy={copy.party} unsetLabel={copy.menuAny} />
            )}
          </FilterBarRow>
        </FilterStrip>
      )}
      {/* Guard here, not in ActiveChips: an empty list must drop the strip too. */}
      {active.length > 0 && (
        <FilterStrip>
          <ActiveChips chips={active} onRemove={(chip) => onChange(chip.remove(filter))} onClearAll={() => onChange(clearChips(filter))} copy={copy.active} />
        </FilterStrip>
      )}
    </Box>
  );
}
