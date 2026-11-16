import { Stack } from "../../../../../atoms/Stack/index.ts";
import { TextField } from "../../../../../atoms/TextField/index.ts";
import { FilterMenu } from "../../../FilterMenu/index.ts";

export interface RegisteredMenuProps {
  /** ISO dates, either or both absent. */
  from: string | null | undefined;
  to: string | null | undefined;
  onFrom: (date: string | undefined) => void;
  onTo: (date: string | undefined) => void;
  /** A date as the button shows it. */
  formatDate: (iso: string) => string;
  copy: { group: string; from: string; to: string };
  /** "Any" / "Oricare", while neither date is set. */
  unsetLabel: string;
  /** Start open (the workbench shows an open menu this way). */
  defaultOpen?: boolean;
}

/** The registration-date range as a filter menu whose content is the two date fields; the button shows the range ("1 Jan 2020 – 31 Dec 2024", one end open when only one is set). */
export function RegisteredMenu({ from, to, onFrom, onTo, formatDate, copy, unsetLabel, defaultOpen }: RegisteredMenuProps) {
  const value = from || to ? [from ? formatDate(from) : "", to ? formatDate(to) : ""].join(" – ").trim() : undefined;
  return (
    <FilterMenu label={copy.group} value={value} unsetLabel={unsetLabel} defaultOpen={defaultOpen} listSx={{ p: 2 }}>
      <Stack direction="row" spacing={1.5}>
        <TextField type="date" label={copy.from} value={from ?? ""} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => onFrom(event.target.value || undefined)} onKeyDown={(event) => event.stopPropagation()} />
        <TextField type="date" label={copy.to} value={to ?? ""} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => onTo(event.target.value || undefined)} onKeyDown={(event) => event.stopPropagation()} />
      </Stack>
    </FilterMenu>
  );
}
