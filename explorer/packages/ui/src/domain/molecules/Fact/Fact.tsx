import type { ReactNode } from "react";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { color, type } from "../../../theme/tokens.ts";

export interface FactProps {
  /** The caption: mono 12, muted. */
  label: string;
  /** The value, 14 px: text, or a chip or a badge. */
  children: ReactNode;
}

/** One labelled fact: a small mono caption over its value. Facts sit in a wrapping row (the entity header, the ONRC registration). */
export function Fact({ label, children }: FactProps) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Typography variant="meta" component="span" sx={{ color: color.muted }}>
        {label}
      </Typography>
      <Typography component="span" sx={{ fontSize: type.small.max }}>
        {children}
      </Typography>
    </Stack>
  );
}
