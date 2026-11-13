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

/** Props for a tooltip's title line (the area's name, or a status word): `meta`, `text`, 600. Spread on a `Typography`. */
export const mapTooltipName = { variant: "meta", sx: { display: "block", color: color.text, fontWeight: 600 } } as const;

/** Props for a tooltip's detail lines: `meta`, `text2`. Spread on a `Typography`. */
export const mapTooltipLine = { variant: "meta", sx: { display: "block", color: color.text2 } } as const;
