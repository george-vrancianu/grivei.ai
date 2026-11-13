import type { ReactNode } from "react";
import { Stack } from "../../../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../../../atoms/Typography/index.ts";
import { color, radius } from "../../../../../../../theme/tokens.ts";

export interface FigureProps {
  label: string;
  children: ReactNode;
}

/** One headline number as a card: its label above, the figure (and whatever qualifies it) below. */
export function Figure({ label, children }: FigureProps) {
  return (
    <Stack
      spacing={0.75}
      component="li"
      sx={{ listStyle: "none", minWidth: 0, p: 2, bgcolor: color.panel, border: `1px solid ${color.line}`, borderRadius: `${radius.card}px` }}
    >
      <Typography variant="meta" component="span">
        {label}
      </Typography>
      {children}
    </Stack>
  );
}
