import { Box } from "../../../atoms/Box/index.ts";
import { TextField } from "../../../atoms/TextField/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { color } from "../../../theme/tokens.ts";
import { RECORD_ORDERS, type RecordOrder } from "./orderSelect.utils.ts";

export interface OrderSelectCopy {
  /** The control's name ("Order"). */
  label: string;
  /** The text of each order. */
  options: Record<RecordOrder, string>;
}

export interface OrderSelectProps {
  value: RecordOrder;
  onChange: (order: RecordOrder) => void;
  copy: OrderSelectCopy;
}

/** The order of a list of Records, as a native select (works with a phone's picker and every keyboard) with its label beside it. */
export function OrderSelect({ value, onChange, copy }: OrderSelectProps) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.5 }}>
      <Typography variant="meta" component="span" aria-hidden="true" sx={{ color: color.muted }}>
        {copy.label}
      </Typography>
      <TextField
        select
        value={value}
        onChange={(event) => onChange(event.target.value as RecordOrder)}
        slotProps={{ select: { native: true }, htmlInput: { "aria-label": copy.label } }}
      >
        {RECORD_ORDERS.map((order) => (
          <option key={order} value={order}>
            {copy.options[order]}
          </option>
        ))}
      </TextField>
    </Box>
  );
}
