import { forwardRef } from "react";
import MuiMenu, { type MenuProps as MuiMenuProps } from "@mui/material/Menu";

export type MenuProps = MuiMenuProps;

/** Wraps MUI Menu (portalled, focus on open, Escape closes and returns focus to the anchor); every MUI prop, `sx` and ref passes through. Surface, offset and padding come from the theme. */
export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu(props, ref) {
  return <MuiMenu ref={ref} {...props} />;
}) as typeof MuiMenu;
