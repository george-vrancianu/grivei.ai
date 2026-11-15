import type { createGriveiTheme } from "@grivei/ui";

type Theme = ReturnType<typeof createGriveiTheme>;

/**
 * The header's frame. From md up it stays on screen: translucent over a blur, with the header shadow and a z-index above menus and popovers
 * (the modal layer). Below md the base style applies and it scrolls away, since its nav wraps to several rows there.
 */
export const headerSx = (theme: Theme) => ({
  borderBottom: 1,
  borderColor: "divider",
  bgcolor: "background.default",
  [theme.breakpoints.up("md")]: {
    position: "sticky",
    top: 0,
    zIndex: theme.zIndex.modal + 1,
    bgcolor: theme.graf.headerFill,
    backdropFilter: "blur(10px)",
    boxShadow: theme.graf.shadow.header,
  },
});
