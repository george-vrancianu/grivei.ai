import type { createGriveiTheme } from "@grivei/ui";

type Theme = ReturnType<typeof createGriveiTheme>;

/** The footer's frame: the same translucent fill and blur as the header (no shadow). */
export const footerSx = (theme: Theme) => ({
  mt: "auto",
  borderTop: 1,
  borderColor: "divider",
  bgcolor: theme.graf.headerFill,
  backdropFilter: "blur(10px)",
});
