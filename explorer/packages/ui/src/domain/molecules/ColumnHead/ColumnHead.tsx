import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { color } from "../../../theme/tokens.ts";
import type { EntityRole } from "../../types.ts";
import { STRIP_FILL } from "../../../theme/stripFill.ts";
import type { EntityResultRowCopy } from "../EntityResultRow/index.ts";
import { ROW_INSET, SIGNALS_COLUMN, AMOUNT_COLUMN } from "../../utils/resultRowColumns.ts";

export interface ColumnHeadProps {
  role: EntityRole;
  copy: EntityResultRowCopy["head"];
  /** Flush in a panel: sits directly under the panel header with 20 px side padding and no top hairline. */
  inset?: boolean | undefined;
}

/**
 * The entity list's column head: a strip over the rows reading Supplier or Authority, Signals, RON matched, from 600 px up.
 * It is hidden from assistive tech (each row keeps its own text, caption included) and from the eye below 600 px, where the right pair wraps under the name and the per-row caption returns.
 */
export function ColumnHead({ role, copy, inset = false }: ColumnHeadProps) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: { xs: "none", sm: "flex" },
        columnGap: 2,
        alignItems: "center",
        px: inset ? ROW_INSET : 0,
        py: 1.25,
        borderTop: inset ? 0 : 1,
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
