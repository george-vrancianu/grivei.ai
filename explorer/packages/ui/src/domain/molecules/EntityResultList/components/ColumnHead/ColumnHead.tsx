import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { color } from "../../../../../theme/tokens.ts";
import type { EntityRole } from "../../../../types.ts";
import { STRIP_FILL } from "../../../FilterStrip/filterStrip.fill.ts";
import type { EntityResultRowCopy } from "../../../EntityResultRow/index.ts";
import { ROW_BLEED, SIGNALS_COLUMN, AMOUNT_COLUMN } from "../../../EntityResultRow/entityResultRow.columns.ts";

export interface ColumnHeadProps {
  role: EntityRole;
  copy: EntityResultRowCopy["head"];
}

/**
 * The entity list's column head: a strip over the rows reading Supplier or Authority, Signals, RON matched, from 600 px up.
 * It is hidden from assistive tech (each row keeps its own text, caption included) and from the eye below 600 px, where the right pair wraps under the name and the per-row caption returns.
 */
export function ColumnHead({ role, copy }: ColumnHeadProps) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: { xs: "none", sm: "flex" },
        columnGap: 2,
        alignItems: "center",
        mx: -ROW_BLEED,
        px: ROW_BLEED,
        py: 0.75,
        borderTop: 1,
        borderBottom: 1,
        borderColor: color.line,
        backgroundColor: STRIP_FILL,
      }}
    >
      <Typography variant="caption" sx={{ flex: "1 1 240px", minWidth: 0 }}>
        {role === "supplier" ? copy.supplier : copy.authority}
      </Typography>
      <Typography variant="caption" sx={{ flex: "none", width: SIGNALS_COLUMN }}>
        {copy.signals}
      </Typography>
      <Typography variant="caption" sx={{ flex: "none", width: AMOUNT_COLUMN, textAlign: "right" }}>
        {copy.amount}
      </Typography>
    </Box>
  );
}
