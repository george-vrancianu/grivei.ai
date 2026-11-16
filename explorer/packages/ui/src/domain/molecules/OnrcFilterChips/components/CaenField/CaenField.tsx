import { useId } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { TextField } from "../../../../../atoms/TextField/index.ts";
import { Well } from "../../../../../atoms/Well/index.ts";
import { color, radius, size } from "../../../../../theme/tokens.ts";

export interface CaenFieldProps {
  /** The committed code or prefix (the URL's). Changing it from outside replaces what is typed. */
  value: string | undefined;
  /** The text in the field when it is left or Enter is pressed; the owner decides what to send. */
  onCommit: (text: string) => void;
  /** `label` is shown inside the well, before the text ("CAEN"); `hint` is the placeholder ("4211 or 42"). */
  copy: { label: string; hint: string };
}

/** The CAEN code or prefix as an inline field in the filter bar: a 44 px pill-shaped well, the label inside it in muted, the hint as placeholder. */
export function CaenField({ value, onCommit, copy }: CaenFieldProps) {
  const id = useId();
  return (
    <Well edge="lineStrong" sx={{ display: "flex", alignItems: "center", gap: 1, height: size.primaryAction, px: "14px", borderRadius: `${radius.menuButton}px`, width: 170 }}>
      <Box component="label" htmlFor={id} sx={{ color: color.muted, whiteSpace: "nowrap" }}>
        {copy.label}
      </Box>
      <TextField
        key={value ?? ""}
        id={id}
        variant="standard"
        defaultValue={value ?? ""}
        placeholder={copy.hint}
        onBlur={(event) => onCommit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onCommit((event.target as HTMLInputElement).value);
        }}
        slotProps={{ htmlInput: { inputMode: "numeric" }, input: { disableUnderline: true } }}
        sx={{ flex: 1, minWidth: 0 }}
      />
    </Well>
  );
}
