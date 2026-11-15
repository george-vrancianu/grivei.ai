import { forwardRef, type Ref } from "react";
import MuiMenuItem, { type MenuItemProps as MuiMenuItemProps } from "@mui/material/MenuItem";

export type MenuItemProps = MuiMenuItemProps;

/** Wraps MUI MenuItem; every MUI prop (`role`, `aria-checked`, `selected`), `sx` and ref passes through. Height, radius and colours come from the theme. */
export const MenuItem = forwardRef<HTMLLIElement, MenuItemProps>(function MenuItem(props, ref) {
  return <MuiMenuItem ref={ref as Ref<HTMLLIElement>} {...props} />;
}) as typeof MuiMenuItem;
