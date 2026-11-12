import { useId, type ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";

export interface ChipGroupProps {
  label: string;
  children: ReactNode;
}

/** A named group of chips: a visible caption, and the same text as the group's accessible name. */
export function ChipGroup({ label, children }: ChipGroupProps) {
  const id = useId();
  return (
    <Stack role="group" aria-labelledby={id} spacing={0.5}>
      <Typography id={id} variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>{children}</Box>
    </Stack>
  );
}
