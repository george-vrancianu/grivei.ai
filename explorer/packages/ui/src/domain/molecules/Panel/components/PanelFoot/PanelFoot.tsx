import type { ReactNode } from "react";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { color } from "../../../../../theme/tokens.ts";
import { STRIP_FILL } from "../../../../../theme/stripFill.ts";

export interface PanelFootProps {
  /** Several children sit at the left and right ends and wrap when the row is full. */
  children: ReactNode;
}

/**
 * The strip under a panel's body: the theme's strip fill, a `line` hairline towards the body, mono meta type, and the panel's bottom corners.
 * `Panel` renders it for `foot`; a panel with no header strip (the entity header) renders it directly.
 */
export function PanelFoot({ children }: PanelFootProps) {
  return (
    <Typography
      variant="meta"
      component="div"
      data-panel-part="foot"
      sx={{
        backgroundColor: STRIP_FILL,
        borderColor: color.line,
        borderStyle: "solid",
        borderWidth: 0,
        borderTopWidth: 1,
        borderBottomLeftRadius: "inherit",
        borderBottomRightRadius: "inherit",
        px: 2,
        py: "10px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        columnGap: 2,
        rowGap: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}
