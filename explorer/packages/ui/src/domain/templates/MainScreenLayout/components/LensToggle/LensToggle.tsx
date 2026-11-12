import { Box } from "../../../../../atoms/Box/index.ts";
import { Button } from "../../../../../atoms/Button/index.ts";
import { MAP_LENSES, type MapLens } from "../../mainScreenLayout.utils.ts";

export interface LensToggleCopy {
  /** The group's accessible name. */
  label: string;
  money: string;
  coverage: string;
}

export interface LensToggleProps {
  lens: MapLens;
  onLensChange: (lens: MapLens) => void;
  copy: LensToggleCopy;
}

/** Money or Coverage: which lens the map shows. Two toggle buttons in a named group, like the Money lens's side toggle. */
export function LensToggle({ lens, onLensChange, copy }: LensToggleProps) {
  return (
    <Box role="group" aria-label={copy.label} sx={{ display: "inline-flex", gap: 1 }}>
      {MAP_LENSES.map((option) => (
        <Button key={option} size="small" variant={lens === option ? "contained" : "outlined"} aria-pressed={lens === option} onClick={() => onLensChange(option)}>
          {copy[option]}
        </Button>
      ))}
    </Box>
  );
}
