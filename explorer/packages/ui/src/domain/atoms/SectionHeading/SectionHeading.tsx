import type { ReactNode } from "react";
import { Typography } from "../../../atoms/Typography/index.ts";
import { color } from "../../../theme/tokens.ts";

export interface SectionHeadingProps {
  children: ReactNode;
  /** The heading level's element; `h2` for a section of a tab. */
  component?: "h2" | "h3";
  /** A stable anchor for links into the section. */
  id?: string;
}

/** A section's heading in the A · Graf style: a short mono label in the accent colour (a link colour, not a number). */
export function SectionHeading({ children, component = "h2", id }: SectionHeadingProps) {
  return (
    <Typography variant="label" component={component} id={id} sx={{ display: "block", color: color.accent, fontWeight: 500 }}>
      {children}
    </Typography>
  );
}
