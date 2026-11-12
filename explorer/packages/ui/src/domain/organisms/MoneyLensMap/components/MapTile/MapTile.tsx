import type { ReactNode } from "react";
import { Button } from "../../../../../atoms/Button/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";

export interface MapTileProps {
  /** The area's name, e.g. "National". */
  title: string;
  /** A figure under the title: an amount, a count. */
  children?: ReactNode;
  /** Whether this tile's area is the selected one. */
  selected?: boolean;
  onSelect?: () => void;
}

/** An off-map area drawn as a tile beside the map: a toggle button that says what it holds. */
export function MapTile({ title, children, selected = false, onSelect }: MapTileProps) {
  return (
    <Button
      variant={selected ? "contained" : "outlined"}
      aria-pressed={selected}
      onClick={onSelect}
      sx={{ display: "block", textAlign: "left", textTransform: "none", minWidth: 200 }}
    >
      <Typography component="span" variant="subtitle2" sx={{ display: "block" }}>{title}</Typography>
      {children}
    </Button>
  );
}
