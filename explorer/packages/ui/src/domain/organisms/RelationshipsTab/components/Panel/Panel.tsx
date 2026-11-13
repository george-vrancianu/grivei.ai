import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { color, radius } from "../../../../../theme/tokens.ts";
import { SectionHeading } from "../../../../atoms/SectionHeading/index.ts";

export interface PanelProps {
  /** The panel's title, a mono accent label (an `h3`: the tab's own heading is the `h2`). */
  heading: string;
  /** Accessible name of the region, when it differs from the heading. */
  label?: string;
  children: ReactNode;
}

/** A card on the dark ground, as the drawing's graph and timeline boxes: panel fill, hairline border, a title, then its content. */
export function Panel({ heading, label, children }: PanelProps) {
  return (
    <Box
      component="section"
      aria-label={label ?? heading}
      sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0, bgcolor: color.panel, border: `1px solid ${color.line}`, borderRadius: `${radius.card}px` }}
    >
      <SectionHeading component="h3">{heading}</SectionHeading>
      {children}
    </Box>
  );
}
