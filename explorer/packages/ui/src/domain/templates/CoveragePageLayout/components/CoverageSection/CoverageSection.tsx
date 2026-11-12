import { useId, type ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";

export interface CoverageSectionProps {
  title: string;
  children: ReactNode;
}

/** One section of the Coverage page: a named region with an h2. */
export function CoverageSection({ title, children }: CoverageSectionProps) {
  const id = useId();
  return (
    <Box component="section" aria-labelledby={id}>
      <Typography variant="h5" component="h2" id={id} gutterBottom>{title}</Typography>
      {children}
    </Box>
  );
}
