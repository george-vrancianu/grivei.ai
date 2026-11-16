import type { OnrcFilter } from "@grivei/contract";
import { Box } from "../../../atoms/Box/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { ChoiceMenu } from "../ChoiceMenu/index.ts";
import { FilterBarDivider } from "../FilterBarDivider/index.ts";
import { FilterBarRow } from "../FilterBarRow/index.ts";
import { FilterStrip } from "../FilterStrip/index.ts";
import { OnrcActiveChips } from "./components/OnrcActiveChips/index.ts";
import { CaenField } from "./components/CaenField/index.ts";
import { RegisteredMenu } from "./components/RegisteredMenu/index.ts";
import { StatusMenu } from "./components/StatusMenu/index.ts";
import type { OnrcFilterChipsCopy } from "./onrcFilterChips.types.ts";
import { activeOnrcChips, clearOnrcChips, offeredStatuses, selectedStatuses, tickStatus, toggleSeapCounterparty, withOnrcFields } from "./onrcFilterChips.utils.ts";

export type { OnrcFilterChipsCopy } from "./onrcFilterChips.types.ts";

export interface OnrcFilterChipsProps {
  /** The filter to reflect. The component keeps no state of its own but the CAEN text being typed. */
  filter: OnrcFilter;
  /** The whole next filter. Fields the chips do not own (the query) come back as given. */
  onChange: (next: OnrcFilter) => void;
  locale: Locale;
  copy: OnrcFilterChipsCopy;
}

/** A CAEN code or the start of one is digits only; anything else is not sent. */
const CAEN = /^\d+$/;

/**
 * ONRC's filter bar, laid out as the main screen's: one row with SEAP counterparty or not, a divider, the status menu (every status ticked by default; a registration
 * matches when it shows any ticked), the CAEN code or prefix and the registration-date menu; then, only when something is set, a strip of the active ones, each removable.
 * The county is chosen on the count lens and shows there as an active chip. Controlled: it reflects `filter` and reports the next one.
 */
export function OnrcFilterChips({ filter, onChange, locale, copy }: OnrcFilterChipsProps) {
  const active = activeOnrcChips(filter, copy, (iso) => formatDate(iso, locale, "long"));
  const setCaen = (text: string) => {
    const value = text.trim();
    if (value === "") onChange(withOnrcFields(filter, { caen: undefined }));
    else if (CAEN.test(value) && value !== filter.caen) onChange(withOnrcFields(filter, { caen: value }));
  };
  return (
    <Box component="section" aria-label={copy.label}>
      <FilterStrip>
        <FilterBarRow>
          <ChoiceMenu
            label={copy.seapCounterparty.group}
            unsetLabel={copy.any}
            options={[{ value: "yes", label: copy.seapCounterparty.yes }, { value: "no", label: copy.seapCounterparty.no }]}
            selected={filter.seapCounterparty === true ? "yes" : filter.seapCounterparty === false ? "no" : undefined}
            onChoose={(choice) => onChange(withOnrcFields(filter, { seapCounterparty: toggleSeapCounterparty(filter, choice === "yes") }))}
          />
          <FilterBarDivider />
          <StatusMenu
            offered={offeredStatuses(filter)}
            selected={selectedStatuses(filter)}
            onToggle={(code) => {
              const next = tickStatus(filter, code);
              if (next !== filter) onChange(next);
            }}
            name={(code) => copy.status.options[code] ?? copy.status.other(code)}
            copy={copy.status}
          />
          <CaenField value={filter.caen ?? undefined} onCommit={setCaen} copy={copy.caen} />
          <RegisteredMenu
            from={filter.registeredFrom}
            to={filter.registeredTo}
            onFrom={(registeredFrom) => onChange(withOnrcFields(filter, { registeredFrom }))}
            onTo={(registeredTo) => onChange(withOnrcFields(filter, { registeredTo }))}
            formatDate={(iso) => formatDate(iso, locale)}
            copy={copy.registered}
            unsetLabel={copy.any}
          />
        </FilterBarRow>
      </FilterStrip>
      {active.length > 0 && (
        <FilterStrip>
          <OnrcActiveChips chips={active} onRemove={(chip) => onChange(chip.remove(filter))} onClearAll={() => onChange(clearOnrcChips(filter))} copy={copy.active} />
        </FilterStrip>
      )}
    </Box>
  );
}
