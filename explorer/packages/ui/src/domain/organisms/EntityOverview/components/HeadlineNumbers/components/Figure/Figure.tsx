import type { ReactNode } from "react";
import { Card } from "../../../../../../../atoms/Card/index.ts";
import { Typography } from "../../../../../../../atoms/Typography/index.ts";

export interface FigureProps {
  label: string;
  children: ReactNode;
}

/** One headline number as a card: its label above, the figure (and whatever qualifies it) below. */
export function Figure({ label, children }: FigureProps) {
  return (
    <Card component="li" sx={{ listStyle: "none", minWidth: 0, p: 2, display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography variant="meta" component="span">
        {label}
      </Typography>
      {children}
    </Card>
  );
}
