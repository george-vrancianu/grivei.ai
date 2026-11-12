import { Box } from "../../../../../atoms/Box/index.ts";
import type { ReactNode } from "react";

export type MapTooltipProps = {
  id: string;
  /** Anchor as a percentage of the map's width and height. */
  left: number;
  top: number;
  children: ReactNode;
};

/** A tooltip floating above an area's centre; the anchor is a percentage so it follows the responsive SVG. */
export function MapTooltip({ id, left, top, children }: MapTooltipProps) {
  return (
    <Box
      id={id}
      role="tooltip"
      sx={(theme) => ({
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        transform: "translate(-50%, calc(-100% - 8px))",
        pointerEvents: "none",
        zIndex: 1,
        whiteSpace: "nowrap",
        px: 1,
        py: 0.5,
        borderRadius: 1,
        typography: "body2",
        color: theme.palette.grey[50],
        bgcolor: theme.palette.grey[900],
        boxShadow: 2,
      })}
    >
      {children}
    </Box>
  );
}
