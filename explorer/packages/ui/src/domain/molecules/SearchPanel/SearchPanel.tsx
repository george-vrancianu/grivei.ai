import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Card } from "../../../atoms/Card/index.ts";

export interface SearchPanelProps {
  /** The region's accessible name ("Search"): `MainScreenLayoutCopy["regions"]["search"]`. */
  label: string;
  /** The search bar (and whatever sits with it). */
  children: ReactNode;
}

/** The search bar's panel, as on the main screen: a `Card` with a 20 px padded section inside. The page's `h1` sits above it. */
export function SearchPanel({ label, children }: SearchPanelProps) {
  return (
    <Card sx={{ p: 0, minWidth: 0 }}>
      <Box component="section" aria-label={label} sx={{ p: 2.5 }}>
        {children}
      </Box>
    </Card>
  );
}
