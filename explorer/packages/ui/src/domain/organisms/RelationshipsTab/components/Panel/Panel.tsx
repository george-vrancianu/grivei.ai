import type { ReactNode } from "react";
import { Card } from "../../../../../atoms/Card/index.ts";
import { SectionHeading } from "../../../../atoms/SectionHeading/index.ts";

export interface PanelProps {
  /** The panel's title, a mono accent label (an `h3`: the tab's own heading is the `h2`). */
  heading: string;
  /** Accessible name of the region, when it differs from the heading. */
  label?: string;
  children: ReactNode;
}

/** A `Card` (the theme's panel fill, hairline and radius) for the drawing's graph and timeline boxes: a title, then its content. */
export function Panel({ heading, label, children }: PanelProps) {
  return (
    <Card
      component="section"
      aria-label={label ?? heading}
      sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}
    >
      <SectionHeading component="h3">{heading}</SectionHeading>
      {children}
    </Card>
  );
}
