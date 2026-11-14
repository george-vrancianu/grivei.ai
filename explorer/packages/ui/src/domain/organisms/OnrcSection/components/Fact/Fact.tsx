import type { ReactNode } from "react";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";

export interface FactProps {
  label: string;
  children: ReactNode;
}

/** One labelled fact of the registration: a small caption over the value. */
export function Fact({ label, children }: FactProps) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="meta" component="span" color="text.secondary">
        {label}
      </Typography>
      <Typography component="span">{children}</Typography>
    </Stack>
  );
}
