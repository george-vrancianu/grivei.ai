import { TextField } from "@grivei/ui";
import type { Copy } from "../../copy/index.ts";

export interface SearchFieldProps {
  copy: Copy["searchField"];
  value: string;
  onChange: (value: string) => void;
}

/** The free-text search box. A placeholder for #44, which adds the debounce, the 2-character floor and the result states. */
export function SearchField({ copy, value, onChange }: SearchFieldProps) {
  return (
    <TextField
      type="search"
      label={copy.label}
      placeholder={copy.placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      fullWidth
    />
  );
}
