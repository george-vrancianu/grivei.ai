import { forwardRef, type Ref } from "react";
import MuiTab, { type TabProps as MuiTabProps } from "@mui/material/Tab";

export type TabProps = MuiTabProps;

/** Wraps MUI Tab; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(props, ref) {
  // MUI types Tab's ref as HTMLDivElement, but it renders a <button>.
  return <MuiTab ref={ref as Ref<HTMLDivElement>} {...props} />;
}) as typeof MuiTab;
