import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";

export interface OverviewColumnsProps {
  /** The wider column: Signals, Largest Records, Framework agreements. */
  left: ReactNode;
  /** Counterparties, Procedure types, Consortia. */
  right: ReactNode;
}

/** The Overview's two columns, side by side from about 910 px and stacked under it (shared by the Overview and its first-load skeleton). */
export function OverviewColumns({ left, right }: OverviewColumnsProps) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", rowGap: 3, columnGap: 4 }}>
      <Stack spacing={3.5} sx={{ flex: "1.2 1 480px", minWidth: 0 }}>
        {left}
      </Stack>
      <Stack spacing={3.5} sx={{ flex: "1 1 400px", minWidth: 0 }}>
        {right}
      </Stack>
    </Box>
  );
}
