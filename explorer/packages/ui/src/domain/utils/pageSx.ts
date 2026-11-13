import { layout } from "../../theme/tokens.ts";

/** The page's own box: padding, the gutter and the maximum width from the layout tokens, centred. Shared by every page's `main` (the pages with a template of their own and the bare `PageShell`). */
export const pageSx = {
  pt: 3,
  pb: 5,
  px: layout.gutter,
  maxWidth: layout.maxWidth,
  width: "100%",
  boxSizing: "border-box",
  mx: "auto",
} as const;
