import type { ReactNode } from "react";
import { Card } from "../../../atoms/Card/index.ts";
import { SectionHeading } from "../../atoms/SectionHeading/index.ts";

export interface PanelProps {
  /** The panel's title, a mono accent label. */
  heading: string;
  /** Accessible name of the region, when it differs from the heading. */
  label?: string;
  /** The heading level's element: `h3` under a tab's own `h2` (the default), `h2` on a page whose title is the `h1`. */
  level?: "h2" | "h3";
  /** The element id, for a link to the panel (`#onrc`). */
  id?: string;
  children: ReactNode;
}

/** A `Card` (the theme's panel fill, hairline and radius) for a titled box of content: the mono accent title, then the content. Used on tabs (under the tab's own `h2`) and on the Record page. */
export function Panel({ heading, label, level = "h3", id, children }: PanelProps) {
  return (
    <Card
      component="section"
      id={id}
      aria-label={label ?? heading}
      sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}
    >
      <SectionHeading component={level}>{heading}</SectionHeading>
      {children}
    </Card>
  );
}
