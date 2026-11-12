import { forwardRef } from "react";
import MuiTab, { type TabProps as MuiTabProps } from "@mui/material/Tab";

export type TabProps = MuiTabProps;

/** Wraps MUI Tab; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const Tab = forwardRef<HTMLDivElement, TabProps>(function Tab(props, ref) {
  return <MuiTab ref={ref} {...props} />;
}) as typeof MuiTab;
