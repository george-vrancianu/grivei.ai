import type { ReactNode } from "react";
import { Card } from "../../../../../atoms/Card/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";

export interface HeadlineFigureProps {
  label: string;
  children: ReactNode;
}

/**
 * One headline number as a panel (the shared card surface, no header strip: the drawing has none): its label above (mono 12, muted), the figure (and whatever qualifies it) below.
 * `data-busy-dim` marks it for the Overview's keep-last dim.
 */
export function HeadlineFigure({ label, children }: HeadlineFigureProps) {
  return (
    <Card component="li" data-busy-dim="" sx={{ listStyle: "none", minWidth: 0, p: 2, display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography variant="meta" component="span">
        {label}
      </Typography>
      {children}
    </Card>
  );
}
