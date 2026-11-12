import { forwardRef } from "react";
import MuiButton, { type ButtonProps as MuiButtonProps } from "@mui/material/Button";

export type ButtonProps = MuiButtonProps;

/**
 * Wraps MUI Button. Adds `type="button"` by default (a Button inside a form must not submit it
 * unless asked to); everything else passes through.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const typeDefault = props.href ? {} : { type: "button" as const };
  return <MuiButton ref={ref} {...typeDefault} {...props} />;
}) as typeof MuiButton;
