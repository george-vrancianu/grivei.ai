import { forwardRef } from "react";
import MuiStack, { type StackProps as MuiStackProps } from "@mui/material/Stack";

export type StackProps = MuiStackProps;

/** Wraps MUI Stack; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(props, ref) {
  return <MuiStack ref={ref} {...props} />;
}) as typeof MuiStack;
