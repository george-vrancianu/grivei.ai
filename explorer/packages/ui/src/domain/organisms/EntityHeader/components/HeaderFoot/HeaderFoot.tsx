import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { PanelFoot } from "../../../../molecules/Panel/index.ts";

export interface HeaderFootProps {
  /** The foot strip's left: the page's tabs. */
  tabs?: ReactNode;
  /** The foot strip's right end: the page's address. It wraps under the tabs below `md`. */
  address?: ReactNode;
}

/** The entity header's foot strip, drawn when `tabs` or `address` is given (shared by the header and its first-load skeleton). */
export function HeaderFoot({ tabs, address }: HeaderFootProps) {
  if (tabs == null && address == null) return null;
  return (
    <PanelFoot>
      {tabs}
      {address != null && <Box sx={{ minWidth: 0, flexBasis: { xs: "100%", md: "auto" }, ml: { md: "auto" } }}>{address}</Box>}
    </PanelFoot>
  );
}
