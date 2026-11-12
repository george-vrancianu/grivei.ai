import { forwardRef } from "react";
import MuiTabs, { type TabsProps as MuiTabsProps } from "@mui/material/Tabs";

export type TabsProps = MuiTabsProps;

/** Wraps MUI Tabs; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(props, ref) {
  return <MuiTabs ref={ref} {...props} />;
}) as typeof MuiTabs;
