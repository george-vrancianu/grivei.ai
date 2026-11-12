import { forwardRef } from "react";
import MuiTextField, { type TextFieldProps as MuiTextFieldProps } from "@mui/material/TextField";

export type TextFieldProps = MuiTextFieldProps;

/** Wraps MUI TextField; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const TextField = forwardRef<HTMLDivElement, TextFieldProps>(function TextField(props, ref) {
  return <MuiTextField ref={ref} {...props} />;
});
