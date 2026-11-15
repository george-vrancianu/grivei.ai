import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Card } from "../../../../../atoms/Card/index.ts";
import { Well } from "../../../../../atoms/Well/index.ts";
import { radius } from "../../../../../theme/tokens.ts";
import { OptionToggle } from "../../../../molecules/OptionToggle/index.ts";
import type { MapLens } from "../../mainScreenLayout.utils.ts";

export interface MapPanelProps {
  /** The panel's accessible name. */
  label: string;
  /** The lens toggle: its options, the shown one, the change handler and the texts. */
  lens: { options: readonly MapLens[]; value: MapLens; onChange: (lens: MapLens) => void; labels: Record<MapLens, string>; label: string };
  /** Optional: the right end of the header strip (the back link of a zoomed county). */
  back?: ReactNode;
  /** The shown lens's map, with its own title, tiles and toggles. */
  children: ReactNode;
  /** Optional: the foot, behind a hairline (the "data through" lines). */
  note?: ReactNode;
}

/** The map panel: a header strip (the lens toggle on a well track, the back link at the other end), the map, and the foot. */
export function MapPanel({ label, lens, back, children, note }: MapPanelProps) {
  return (
    <Card component="section" aria-label={label} sx={{ p: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px 16px", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Well edge="lineStrong" sx={{ display: "flex", borderRadius: `${radius.control}px`, "& .MuiToggleButtonGroup-root": { border: 0 } }}>
          <OptionToggle options={lens.options} value={lens.value} onChange={lens.onChange} labels={lens.labels} label={lens.label} />
        </Well>
        {back}
      </Box>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>{children}</Box>
      {note && <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: "divider" }}>{note}</Box>}
    </Card>
  );
}
