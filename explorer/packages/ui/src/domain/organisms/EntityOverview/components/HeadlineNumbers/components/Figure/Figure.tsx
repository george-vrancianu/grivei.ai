import type { ReactNode } from "react";
import { Stack } from "../../../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../../../atoms/Typography/index.ts";

export interface FigureProps {
  label: string;
  children: ReactNode;
}

/** One headline number: its label above, the figure (and whatever qualifies it) below. */
export function Figure({ label, children }: FigureProps) {
  return (
    <Stack spacing={0.5} component="li" sx={{ listStyle: "none" }}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Stack>
  );
}
