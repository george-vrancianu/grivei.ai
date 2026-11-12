import { Box } from "../../../../../atoms/Box/index.ts";
import { Button } from "../../../../../atoms/Button/index.ts";
import type { CountySide, SideToggleCopy } from "../../moneyLensMap.types.ts";

export interface SideToggleProps {
  side: CountySide;
  onSideChange: (side: CountySide) => void;
  copy: SideToggleCopy;
}

const SIDES = ["AUTHORITY", "SUPPLIER"] as const satisfies readonly CountySide[];

/** Authority or supplier: which side of the money the counties show. Two toggle buttons in a named group. */
export function SideToggle({ side, onSideChange, copy }: SideToggleProps) {
  const labels: Record<CountySide, string> = { AUTHORITY: copy.authority, SUPPLIER: copy.supplier };
  return (
    <Box role="group" aria-label={copy.label} sx={{ display: "inline-flex", gap: 1 }}>
      {SIDES.map((option) => (
        <Button key={option} size="small" variant={side === option ? "contained" : "outlined"} aria-pressed={side === option} onClick={() => onSideChange(option)}>
          {labels[option]}
        </Button>
      ))}
    </Box>
  );
}
