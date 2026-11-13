import { Box } from "../../../../../atoms/Box/index.ts";
import { color, radius } from "../../../../../theme/tokens.ts";
import type { ReactNode } from "react";

export type MapTooltipProps = {
  id: string;
  /** Anchor as a percentage of the map's width and height: the top edge of the area, centred on it. */
  left: number;
  top: number;
  children: ReactNode;
};

/** A tooltip centred above the hovered area (on its top edge); the anchor is a percentage so it follows the responsive SVG. */
export function MapTooltip({ id, left, top, children }: MapTooltipProps) {
  return (
    <Box
      id={id}
      role="tooltip"
      sx={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        transform: "translate(-50%, calc(-100% - 8px))",
        pointerEvents: "none",
        zIndex: 1,
        whiteSpace: "nowrap",
        px: 1.5,
        py: 1,
        typography: "meta",
        color: color.text,
        backgroundColor: color.bg,
        border: `1px solid ${color.lineStrong}`,
        borderRadius: `${radius.control}px`,
      }}
    >
      {children}
    </Box>
  );
}
