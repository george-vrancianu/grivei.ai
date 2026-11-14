import type { OnrcFilter } from "@grivei/contract";
import { Box } from "../../../atoms/Box/index.ts";
import { Button } from "../../../atoms/Button/index.ts";
import { Chip } from "../../../atoms/Chip/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { TextField } from "../../../atoms/TextField/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { ChipGroup } from "../ChipGroup/index.ts";
import { ToggleChip } from "../ToggleChip/index.ts";
import type { OnrcFilterChipsCopy } from "./onrcFilterChips.types.ts";
import { activeOnrcChips, ONRC_STATUS_CHOICES, toggleStatus, withOnrcFields } from "./onrcFilterChips.utils.ts";

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
 * The chips that narrow ONRC's matching set: status (several can be on; a registration matches when it shows any), SEAP counterparty or not, a CAEN code or prefix,
 * the registration-date range, with the active ones listed below, each removable. The county is chosen on the count lens and shows here as an active chip.
 * Controlled: it reflects `filter` and reports the next one.
 */
export function OnrcFilterChips({ filter, onChange, locale, copy }: OnrcFilterChipsProps) {
  const active = activeOnrcChips(filter, copy, (iso) => formatDate(iso, locale, "long"));
  const statuses = [...ONRC_STATUS_CHOICES, ...(filter.status ?? []).filter((code) => !ONRC_STATUS_CHOICES.includes(code))];
  const setCaen = (text: string) => {
    const value = text.trim();
    if (value === "") onChange(withOnrcFields(filter, { caen: undefined }));
    else if (CAEN.test(value) && value !== filter.caen) onChange(withOnrcFields(filter, { caen: value }));
  };
  return (
    <Stack component="section" aria-label={copy.label} spacing={1.5}>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
        <ChipGroup label={copy.status.group}>
          {statuses.map((code) => (
            <ToggleChip key={code} label={copy.status.options[code] ?? copy.status.other(code)} pressed={filter.status?.includes(code) ?? false} onToggle={() => onChange(toggleStatus(filter, code))} />
          ))}
        </ChipGroup>
        <ChipGroup label={copy.seapCounterparty.group}>
          <ToggleChip label={copy.seapCounterparty.yes} pressed={filter.seapCounterparty === true} onToggle={() => onChange(withOnrcFields(filter, { seapCounterparty: filter.seapCounterparty === true ? undefined : true }))} />
          <ToggleChip label={copy.seapCounterparty.no} pressed={filter.seapCounterparty === false} onToggle={() => onChange(withOnrcFields(filter, { seapCounterparty: filter.seapCounterparty === false ? undefined : false }))} />
        </ChipGroup>
      </Stack>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <ChipGroup label={copy.caen.label}>
          <TextField
            key={filter.caen ?? ""}
            size="small"
            label={copy.caen.label}
            defaultValue={filter.caen ?? ""}
            helperText={copy.caen.hint}
            slotProps={{ htmlInput: { inputMode: "numeric", "aria-label": copy.caen.label }, inputLabel: { shrink: true } }}
            onBlur={(event) => setCaen(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setCaen((event.target as HTMLInputElement).value);
            }}
            sx={{ minWidth: 160 }}
          />
        </ChipGroup>
        <ChipGroup label={copy.registered.group}>
          <Stack direction="row" spacing={1}>
            <TextField type="date" size="small" label={copy.registered.from} value={filter.registeredFrom ?? ""} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => onChange(withOnrcFields(filter, { registeredFrom: event.target.value || undefined }))} />
            <TextField type="date" size="small" label={copy.registered.to} value={filter.registeredTo ?? ""} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => onChange(withOnrcFields(filter, { registeredTo: event.target.value || undefined }))} />
          </Stack>
        </ChipGroup>
      </Stack>
      <ChipGroup label={copy.active.group}>
        {active.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {copy.active.none}
          </Typography>
        ) : (
          <>
            {active.map((chip) => (
              <Chip key={chip.id} color="primary" label={chip.label} aria-label={copy.active.remove(chip.label)} onClick={() => onChange(chip.remove(filter))} onDelete={() => onChange(chip.remove(filter))} />
            ))}
            <Box>
              <Button size="small" onClick={() => onChange(withOnrcFields(filter, { status: undefined, caen: undefined, county: undefined, registeredFrom: undefined, registeredTo: undefined, seapCounterparty: undefined }))}>
                {copy.active.clearAll}
              </Button>
            </Box>
          </>
        )}
      </ChipGroup>
    </Stack>
  );
}
