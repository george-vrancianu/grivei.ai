import type { RecordFilter } from "@grivei/contract";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { TextField } from "../../../../../atoms/TextField/index.ts";
import type { FilterChipsCopy } from "../../filterChips.types.ts";
import { ChipGroup } from "../ChipGroup/index.ts";
import { yearOf, yearOptions } from "../../filterChips.utils.ts";

export interface YearRangeProps {
  filter: RecordFilter;
  firstYear: number;
  lastYear: number;
  onFromYear: (year: number | undefined) => void;
  onToYear: (year: number | undefined) => void;
  copy: FilterChipsCopy["year"];
}

interface YearSelectProps {
  label: string;
  any: string;
  years: number[];
  value: number | undefined;
  onChange: (year: number | undefined) => void;
}

function YearSelect({ label, any, years, value, onChange }: YearSelectProps) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value === undefined ? "" : String(value)}
      onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
      slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
      sx={{ minWidth: 110 }}
    >
      <option value="">{any}</option>
      {years.map((year) => (
        <option key={year} value={String(year)}>
          {year}
        </option>
      ))}
    </TextField>
  );
}

/**
 * The award-date range as two year selects. Picking a year sets Jan 1 (from) or Dec 31 (to); either end may stay empty.
 * A date that is not a year edge is reflected as its containing year here (the active chip shows the exact date).
 */
export function YearRange({ filter, firstYear, lastYear, onFromYear, onToYear, copy }: YearRangeProps) {
  const years = yearOptions(firstYear, lastYear, filter);
  return (
    <ChipGroup label={copy.group}>
      <Stack direction="row" spacing={1}>
        <YearSelect label={copy.from} any={copy.any} years={years} value={yearOf(filter.from)} onChange={onFromYear} />
        <YearSelect label={copy.to} any={copy.any} years={years} value={yearOf(filter.to)} onChange={onToYear} />
      </Stack>
    </ChipGroup>
  );
}
